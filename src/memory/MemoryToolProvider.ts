import { zodSchema } from "ai";
import type { ToolCapability, HostToolDescriptor } from "../contracts/host";
import type { ToolCall, ToolResult } from "../core/types";
import { ContinuationStore } from "./pagination";
import { MemoryHandlers, type MemoryAuditRecord, type MemoryToolResult } from "./MemoryHandlers";
import { MemoryService } from "./MemoryService";
import {
  createMemoryTool, updateMemoryTool, deleteMemoryTool, listMemoriesTool,
  searchMemoriesTool, readMemoryAuditTool, evaluateStagedMemoryTool, cullCoreMemoryTool,
} from "./tools";

const definitions = {
  create_memory: { definition: createMemoryTool, method: "createMemory", write: true },
  update_memory: { definition: updateMemoryTool, method: "updateMemory", write: true },
  delete_memory: { definition: deleteMemoryTool, method: "deleteMemory", write: true },
  list_memories: { definition: listMemoriesTool, method: "listMemories", write: false },
  search_memories: { definition: searchMemoriesTool, method: "searchMemories", write: false },
  read_memory_audit: { definition: readMemoryAuditTool, method: "readMemoryAudit", write: false },
  evaluate_staged: { definition: evaluateStagedMemoryTool, method: "evaluateStaged", write: true },
  cull_core: { definition: cullCoreMemoryTool, method: "cullCore", write: true },
} as const;

export interface MemoryToolSettings {
  enabled: boolean;
  auditEnabled: boolean;
  contextBudgetTokens?: number;
  backupRetention?: number;
}

export class MemoryToolProvider implements ToolCapability {
  readonly id = "shared-memory-tools";
  readonly kind = "tools" as const;
  private readonly continuations = new ContinuationStore();

  constructor(
    private readonly service: MemoryService,
    private readonly getSettings: () => Promise<MemoryToolSettings>,
  ) {}

  async getTools(): Promise<HostToolDescriptor[]> {
    const settings = await this.getSettings();
    if (!settings.enabled) return [];
    return Object.entries(definitions)
      .filter(([name]) => name !== "read_memory_audit" || settings.auditEnabled)
      .map(([name, route]) => ({
        name,
        title: name.replaceAll("_", " "),
        description: route.definition.description,
        parameters: zodSchema(route.definition.inputSchema).jsonSchema as Record<string, unknown>,
        risk: name === "delete_memory" ? "destructive" : route.write ? "write" : "read",
        approval: route.write ? "always" : "never",
      }));
  }

  async executeTool(call: ToolCall, context: { signal?: AbortSignal }): Promise<ToolResult> {
    try {
      const settings = await this.getSettings();
      if (!settings.enabled) throw new Error("Memory is disabled in Settings.");
      const name = call.name as keyof typeof definitions;
      if (!Object.hasOwn(definitions, name)) throw new Error("Unknown memory tool.");
      if (name === "read_memory_audit" && !settings.auditEnabled) throw new Error("Memory audit access is disabled.");
      const route = definitions[name];
      const args = route.definition.inputSchema.parse(call.args);
      return await this.service.run(async (store, snapshot) => {
        const handlers = new MemoryHandlers(store, this.continuations, async () => {
          const lines = (snapshot["memory/memory-audit.jsonl"] ?? "").trim();
          return lines ? lines.split("\n").map(line => JSON.parse(line) as MemoryAuditRecord).reverse() : [];
        }, settings.auditEnabled);
        const handler = handlers[route.method] as (args: unknown) => Promise<MemoryToolResult>;
        const result = await handler.call(handlers, args);
        if (result.error) throw new Error(result.error);
        return { success: true, content: JSON.stringify(result) };
      }, context.signal);
    } catch (cause) {
      return { success: false, error: cause instanceof Error ? cause.message : String(cause) };
    }
  }
}
