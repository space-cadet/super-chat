import type {
	ChatPersistenceCapability,
	HostToolDescriptor,
	RetrievalCapability,
	RetrievedSource,
	SuperChatHost,
	ToolCapability,
	ToolRisk,
	ToolApprovalPolicy,
} from "../../src/contracts/host";
import type { ChatSession, ToolCall, ToolResult } from "../../src/core/types";
import { cloneSession } from "../../src/core/sessionPersistence";
import type { QueryFilters, RAGSettings } from "../../../arxivite/src/types/rag";

export interface ArxiviteToolCapabilityDefinition {
	id: string;
	name: string;
	description: string;
}

export interface ArxiviteToolDefinition {
	id: string;
	name: string;
	description: string;
	capabilities: ArxiviteToolCapabilityDefinition[];
	examples: string[];
}

export interface ArxiviteToolResult {
	contextForLLM: string;
	context: string;
	dataSourcesUsed: string[];
	papersUsed?: number;
}

export interface ArxiviteToolRegistryLike {
	getAllTools(): ArxiviteToolDefinition[];
	getTool(id: string): ArxiviteToolDefinition | undefined;
	executeTool(
		id: string,
		params: {
			userId: string;
			query: string;
			ragSettings: RAGSettings;
			extractedFilters?: QueryFilters;
		},
	): Promise<ArxiviteToolResult>;
}

export interface ArxiviteToolPolicy {
	title?: string;
	risk?: ToolRisk;
	approval?: ToolApprovalPolicy;
	idempotent?: boolean;
}

export interface ArxiviteExternalHostOptions {
	registry: ArxiviteToolRegistryLike;
	userId: string;
	ragSettings?: RAGSettings;
	toolPolicy?: (tool: ArxiviteToolDefinition) => ArxiviteToolPolicy;
	retrieval?: RetrievalCapability;
}

function defaultToolPolicy(tool: ArxiviteToolDefinition): ArxiviteToolPolicy {
	return {
		title: tool.name,
		risk: "read",
		approval: "never",
		idempotent: true,
	};
}

function createToolCapability(
	options: ArxiviteExternalHostOptions,
): ToolCapability {
	const {
		registry,
		userId,
		ragSettings = {
			enabled: true,
			maxPapers: 5,
			confidenceThreshold: 0.6,
			contextSizeLimit: 2000,
			useLLMForAnalysis: false,
		},
		toolPolicy = defaultToolPolicy,
	} = options;

	return {
		id: "arxivite.external.tools",
		kind: "tools",
		getTools: async () =>
			registry.getAllTools().map((tool) => {
				const policy = toolPolicy(tool);
				return ({
					name: tool.id,
					title: policy.title ?? tool.name,
					description: `${tool.description}\n\nCapabilities: ${tool.capabilities
						.map((capability) => `${capability.id} — ${capability.description}`)
						.join("; ")}\n\nExamples: ${tool.examples.join(", ")}`,
					parameters: {
						type: "object",
						properties: {
							action: {
								type: "string",
								enum: tool.capabilities.map((capability) => capability.id),
							},
							query: { type: "string" },
							filters: { type: "object" },
						},
						required: ["action", "query"],
					},
					risk: policy.risk ?? "read",
					approval: policy.approval ?? "never",
					...(policy.idempotent === undefined
						? {}
						: { idempotent: policy.idempotent }),
				} satisfies HostToolDescriptor);
			}),
		executeTool: async (call: ToolCall): Promise<ToolResult> => {
			const tool = registry.getTool(call.name);
			if (!tool) {
				return { success: false, error: `Tool not found: ${call.name}` };
			}

			const filters = call.args.filters;
			const result = await registry.executeTool(call.name, {
				userId,
				query: typeof call.args.query === "string" ? call.args.query : "",
				ragSettings,
				...(filters && typeof filters === "object"
					? { extractedFilters: filters as QueryFilters }
					: {}),
			});

			return { success: true, content: result.contextForLLM };
		},
	};
}

export function createMemoryPersistenceCapability(): ChatPersistenceCapability {
	const sessions = new Map<string, ChatSession>();

	return {
		id: "arxivite.external.persistence",
		kind: "persistence",
		schemaVersion: 1,
		loadSessions: async () => [...sessions.values()].map(cloneSession),
		saveSession: async (session) => {
			sessions.set(session.id, cloneSession(session));
		},
		deleteSession: async (sessionId) => {
			sessions.delete(sessionId);
		},
		archiveSession: async (sessionId) => {
			const session = sessions.get(sessionId);
			if (session) sessions.set(sessionId, cloneSession({ ...session, archived: true }));
		},
	};
}

export function createRetrievedSourceCapability(
	source: RetrievedSource,
): RetrievalCapability {
	return {
		id: "arxivite.external.retrieval",
		kind: "retrieval",
		retrieve: async () => [{ ...source, provenance: { ...source.provenance, retrievedAt: Date.now() } }],
	};
}

export function createArxiviteExternalHost(
	options: ArxiviteExternalHostOptions,
): SuperChatHost {
	return {
		id: "arxivite.external-test-host",
		name: "Arxivite external integration test host",
		version: "1",
		capabilities: {
			identity: {
				id: "arxivite.external.identity",
				kind: "identity",
				getIdentity: async () => ({ id: options.userId }),
			},
			persistence: createMemoryPersistenceCapability(),
			tools: createToolCapability(options),
			...(options.retrieval ? { retrieval: options.retrieval } : {}),
		},
	};
}
