import type {
	ChatEngineOptions,
	PersistenceAdapter,
	RAGAdapter,
	ToolAdapter,
	ToolCall,
	ToolDefinition,
	ToolResult,
} from "../core/types";
import { ChatEngine } from "../core/ChatEngine";
import type {
	ChatPersistenceCapability,
	HostOperationContext,
	HostToolDescriptor,
	RetrievalCapability,
	RetrievalResult as HostRetrievalResult,
	RetrievedSource,
	SuperChatHost,
	ToolCapability,
} from "../contracts/host";
import { assertHostContract, hasHostCapability } from "../contracts/validation";

function createOperationContext(signal?: AbortSignal): HostOperationContext {
	return {
		requestId: `host-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		...(signal ? { signal } : {}),
	};
}

export class HostPersistenceAdapter implements PersistenceAdapter {
	constructor(private readonly capability: ChatPersistenceCapability) {}

	loadSessions() {
		return this.capability.loadSessions(createOperationContext());
	}

	saveSession(session: Parameters<ChatPersistenceCapability["saveSession"]>[0]) {
		return this.capability.saveSession(session, createOperationContext());
	}

	deleteSession(sessionId: string) {
		return this.capability.deleteSession(sessionId, createOperationContext());
	}

	archiveSession(sessionId: string) {
		return this.capability.archiveSession(sessionId, createOperationContext());
	}
}

export class HostToolAdapter implements ToolAdapter {
	private constructor(
		private readonly routes: Map<
			string,
			{ capability: ToolCapability; descriptor: HostToolDescriptor }
		>,
	) {}

	static async create(
		capability: ToolCapability | readonly ToolCapability[],
	): Promise<HostToolAdapter> {
		const capabilities = Array.isArray(capability) ? capability : [capability];
		const routes = new Map<
			string,
			{ capability: ToolCapability; descriptor: HostToolDescriptor }
		>();
		for (const provider of capabilities) {
			const descriptors = await provider.getTools(createOperationContext());
			for (const descriptor of descriptors) {
				if (routes.has(descriptor.name)) {
					throw new Error(`Duplicate host tool name: ${descriptor.name}`);
				}
				routes.set(descriptor.name, { capability: provider, descriptor });
			}
		}
		return new HostToolAdapter(routes);
	}

	getAvailableTools(): ToolDefinition[] {
		return [...this.routes.values()].map(({ descriptor }) => ({ ...descriptor }));
	}

	executeTool(call: ToolCall, signal?: AbortSignal): Promise<ToolResult> {
		const route = this.routes.get(call.name);
		if (!route) {
			return Promise.resolve({
				success: false,
				error: `Unknown host tool: ${call.name}`,
			});
		}
		return route.capability.executeTool(call, createOperationContext(signal));
	}
}

export class HostRAGAdapter implements RAGAdapter {
	constructor(private readonly capability: RetrievalCapability) {}

	async analyzeQuery(query: string) {
		const keywords = query
			.split(/\s+/)
			.map((word) => word.replace(/[^\p{L}\p{N}-]/gu, ""))
			.filter((word) => word.length > 2);
		return {
			intent: "host-retrieval",
			keywords,
			requiresRetrieval: true,
		};
	}

	async retrieveSources(
		query: string,
		signal?: AbortSignal,
		options?: { maxResults?: number },
	): Promise<RetrievedSource[] | HostRetrievalResult> {
		return this.capability.retrieve(
			{ query, ...(options?.maxResults !== undefined ? { maxResults: options.maxResults } : {}) },
			createOperationContext(signal),
		);
	}

	async retrievePapers(analysis: Awaited<ReturnType<HostRAGAdapter["analyzeQuery"]>>) {
		const result = await this.retrieveSources(analysis.keywords.join(" "));
		const sources = Array.isArray(result) ? result : result.sources;
		return sources.map((source) => ({
			id: source.id,
			title: source.title,
			authors: [],
			year: new Date(source.provenance.retrievedAt).getFullYear(),
			url: source.uri ?? `#source-${source.id}`,
			snippet: source.content,
		}));
	}

	buildContext(papers: Awaited<ReturnType<HostRAGAdapter["retrievePapers"]>>) {
		return Promise.resolve(papers.map((paper) => `${paper.title}: ${paper.snippet}`).join("\n"));
	}
}

export interface HostEngineOptions extends Omit<ChatEngineOptions, "persistenceAdapter" | "toolAdapter" | "ragAdapter"> {
	host: SuperChatHost;
}

/** Construct the shared engine from neutral host capabilities. */
export async function createChatEngineForHost(options: HostEngineOptions): Promise<ChatEngine> {
	assertHostContract(options.host);
	const { host, ...engineOptions } = options;
	const { capabilities } = host;
	const adapters: Pick<ChatEngineOptions, "persistenceAdapter" | "toolAdapter" | "ragAdapter"> = {};
	if (capabilities.persistence) {
		adapters.persistenceAdapter = new HostPersistenceAdapter(capabilities.persistence);
	}
	if (capabilities.tools) {
		adapters.toolAdapter = await HostToolAdapter.create(capabilities.tools);
	}
	if (capabilities.retrieval) {
		adapters.ragAdapter = new HostRAGAdapter(capabilities.retrieval);
	}
	return new ChatEngine({ ...engineOptions, ...adapters });
}

export function hasHostTools(host: SuperChatHost): host is SuperChatHost & {
	capabilities: SuperChatHost["capabilities"] & { tools: ToolCapability };
} {
	return hasHostCapability(host, "tools");
}
