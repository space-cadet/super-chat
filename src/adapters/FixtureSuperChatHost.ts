import { cloneSession } from "../core/sessionPersistence";
import type {
	ChatSession,
	LLMAdapter,
	StreamEvent,
	ToolCall,
	ToolDefinition,
	ToolResult,
} from "../core/types";
import type { HostToolDescriptor, SuperChatHost } from "../contracts/host";

const fixtureSource = {
	id: "fixture-source-1",
	title: "Fixture host guide",
	content: "A fixture host supplies neutral storage, tools, and retrieval to super-chat.",
	uri: "fixture://guide",
	provenance: {
		capabilityId: "fixture.retrieval",
		sourceId: "fixture-source-1",
		retrievedAt: 0,
	},
};

export class FixtureSuperChatHost implements SuperChatHost {
	readonly id = "fixture";
	readonly name = "Fixture Host";
	readonly version = "1";
	readonly llmAdapter: LLMAdapter;
	private readonly sessions = new Map<string, ChatSession>();
	private fixtureDocument = "The fixture document is ready.";

	readonly capabilities: SuperChatHost["capabilities"] = {
		identity: {
			id: "fixture.identity",
			kind: "identity",
			getIdentity: async () => ({ id: "fixture-user", displayName: "Fixture User" }),
		},
		persistence: {
			id: "fixture.persistence",
			kind: "persistence",
			schemaVersion: 1,
			loadSessions: async () => [...this.sessions.values()].map(cloneSession),
			saveSession: async (session) => {
				this.sessions.set(session.id, cloneSession(session));
			},
			deleteSession: async (sessionId) => {
				this.sessions.delete(sessionId);
			},
			archiveSession: async (sessionId) => {
				const session = this.sessions.get(sessionId);
				if (session) {
					this.sessions.set(sessionId, cloneSession({ ...session, archived: true }));
				}
			},
		},
		tools: {
			id: "fixture.tools",
			kind: "tools",
			getTools: async () => this.getTools(),
			executeTool: async (call) => this.executeTool(call),
		},
		retrieval: {
			id: "fixture.retrieval",
			kind: "retrieval",
			retrieve: async () => [{ ...fixtureSource, provenance: { ...fixtureSource.provenance, retrievedAt: Date.now() } }],
		},
	};

	constructor() {
		this.llmAdapter = new FixtureLLMAdapter();
	}

	getDocument(): string {
		return this.fixtureDocument;
	}

	private getTools(): HostToolDescriptor[] {
		return [
			{
				name: "read_fixture",
				title: "Read fixture document",
				description: "Read the current fixture document.",
				parameters: { type: "object", properties: {} },
				risk: "read",
				approval: "never",
			},
			{
				name: "write_fixture",
				title: "Write fixture document",
				description: "Replace the current fixture document.",
				parameters: {
					type: "object",
					properties: { content: { type: "string" } },
					required: ["content"],
				},
				risk: "write",
				approval: "always",
			},
		];
	}

	private async executeTool(call: ToolCall): Promise<ToolResult> {
		if (call.name === "read_fixture") {
			return { success: true, content: this.fixtureDocument };
		}
		if (call.name === "write_fixture") {
			const content = typeof call.args.content === "string" ? call.args.content : "";
			this.fixtureDocument = content;
			return { success: true, content: "Fixture document updated." };
		}
		return { success: false, error: `Unknown fixture tool: ${call.name}` };
	}
}

class FixtureLLMAdapter implements LLMAdapter {
	async *streamChatWithTools(
		messages: Array<{ role: string; content: string }>,
		_tools: ToolDefinition[],
		signal?: AbortSignal,
	): AsyncIterable<StreamEvent> {
		if (signal?.aborted) return;
		const hasToolResult = messages.some((message) => message.content.includes('"tool-result"'));
		const userMessage = [...messages].reverse().find((message) => message.role === "user");
		const request = userMessage?.content.toLowerCase() ?? "";
		if (hasToolResult) {
			yield { type: "text-delta", text: "The fixture operation completed." };
			yield { type: "finish", reason: "text-complete" };
			return;
		}
		if (request.includes("write") || request.includes("update")) {
			yield { type: "text-delta", text: "I can update the fixture document." };
			yield {
				type: "tool-call",
				call: { id: `fixture-write-${Date.now()}`, name: "write_fixture", args: { content: "Updated by fixture host." } },
			};
			yield { type: "finish", reason: "tool-calls-detected" };
			return;
		}
		if (request.includes("read") || request.includes("document")) {
			yield { type: "tool-call", call: { id: `fixture-read-${Date.now()}`, name: "read_fixture", args: {} } };
			yield { type: "finish", reason: "tool-calls-detected" };
			return;
		}
		yield { type: "text-delta", text: "Fixture host ready." };
		yield { type: "finish", reason: "text-complete" };
	}

	async *streamChat(
		_messages: Array<{ role: string; content: string }>,
		signal?: AbortSignal,
	): AsyncIterable<string> {
		if (!signal?.aborted) yield "Fixture host ready.";
	}

	getProviders() {
		return [{ id: "fixture", name: "Fixture" }];
	}

	getModels() {
		return [];
	}

	testConnection = async () => ({ ok: true, message: "Fixture host connected" });
}
