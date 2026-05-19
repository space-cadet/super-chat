/**
 * ToolExecutor — Generic tool execution wrapper.
 *
 * Wraps a ToolAdapter to provide:
 * - Dynamic tool registration (runtime handlers)
 * - Batch execution with error recovery
 * - Result serialization for LLM consumption
 *
 * Mirrors the pattern from obsidian-ai's ToolExecutor but stays
 * framework-agnostic (no Obsidian APIs).
 */

import type {
	ToolAdapter,
	ToolCall,
	ToolDefinition,
	ToolHandler,
	ToolResult,
} from "./types";

export interface ToolExecutorOptions {
	adapter?: ToolAdapter;
}

export class ToolExecutor {
	private handlers = new Map<string, ToolHandler>();
	private adapter?: ToolAdapter;

	constructor(opts: ToolExecutorOptions = {}) {
		this.adapter = opts.adapter;
	}

	/** Dynamically register a handler for a tool name. */
	register<T>(name: string, handler: ToolHandler<T>): void {
		this.handlers.set(name, handler as ToolHandler);
	}

	/** Get all available tool definitions from the adapter. */
	getAvailableTools(): ToolDefinition[] {
		return this.adapter?.getAvailableTools() ?? [];
	}

	/** Execute a single tool call. */
	async execute(call: ToolCall): Promise<ToolResult> {
		// Check dynamically registered handlers first
		const handler = this.handlers.get(call.name);
		if (handler) {
			try {
				const result = await handler(call.args);
				return {
					success: true,
					content: this.serializeResult(result),
				};
			} catch (err) {
				return {
					success: false,
					error: err instanceof Error ? err.message : String(err),
				};
			}
		}

		// Fall back to adapter
		if (this.adapter) {
			try {
				return await this.adapter.executeTool(call);
			} catch (err) {
				return {
					success: false,
					error: err instanceof Error ? err.message : String(err),
				};
			}
		}

		return {
			success: false,
			error: `No tool handler or adapter found for "${call.name}"`,
		};
	}

	/** Execute multiple tool calls in parallel. */
	async executeBatch(calls: ToolCall[]): Promise<ToolResult[]> {
		return Promise.all(calls.map((call) => this.execute(call)));
	}

	private serializeResult(result: unknown): string {
		if (result === null || result === undefined) return "";
		if (typeof result === "string") return result;
		try {
			return JSON.stringify(result, null, 2);
		} catch {
			return String(result);
		}
	}
}
