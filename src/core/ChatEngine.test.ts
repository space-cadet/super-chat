import { describe, it, expect, vi } from "vitest";
import { ChatEngine } from "./ChatEngine";
import type {
	LLMAdapter,
	PersistenceAdapter,
	ToolAdapter,
	StreamEvent,
	ToolDefinition,
	ToolResult,
	ToolCall,
} from "./types";

// ============================================================================
// Mock Helpers
// ============================================================================

function createMockLLMAdapter(
	toolEvents: StreamEvent[][] = [],
	textChunks: string[] = [],
): LLMAdapter {
	let toolCallIndex = 0;
	return {
		streamChatWithTools: async function* (
			_messages: { role: string; content: string }[],
			_tools: ToolDefinition[],
			signal?: AbortSignal,
		) {
			const events = toolEvents[toolCallIndex++] ?? [];
			for (const event of events) {
				if (signal?.aborted) break;
				yield event;
			}
		},
		streamChat: async function* (_messages: unknown, signal?: AbortSignal) {
			for (const chunk of textChunks) {
				if (signal?.aborted) break;
				yield chunk;
			}
		},
		getProviders: () => [{ id: "mock", name: "Mock" }],
		getModels: () => [],
		testConnection: async () => ({ ok: true, message: "ok" }),
	};
}

function createMockPersistenceAdapter(): PersistenceAdapter {
	const sessions: Map<string, import("./types").ChatSession> = new Map();
	return {
		loadSessions: vi.fn(async () => Array.from(sessions.values())),
		saveSession: vi.fn(async (session) => {
			sessions.set(session.id, { ...session });
		}),
		deleteSession: vi.fn(async (sessionId) => {
			sessions.delete(sessionId);
		}),
		archiveSession: vi.fn(async (sessionId) => {
			const s = sessions.get(sessionId);
			if (s) {
				s.archived = true;
				sessions.set(sessionId, s);
			}
		}),
	};
}

function createMockToolAdapter(
	tools: ToolDefinition[] = [],
	executeFn?: (call: ToolCall) => Promise<ToolResult>,
): ToolAdapter {
	return {
		getAvailableTools: () => tools,
		executeTool: executeFn ?? vi.fn(async () => ({ success: true, content: "done" })),
	};
}

async function collectEvents<T>(gen: AsyncIterable<T>): Promise<T[]> {
	const events: T[] = [];
	for await (const event of gen) {
		events.push(event);
	}
	return events;
}

// ============================================================================
// Tests
// ============================================================================

describe("ChatEngine", () => {
	describe("basic messaging", () => {
		it("sends a message and yields text-deltas (no tools)", async () => {
			const adapter = createMockLLMAdapter([], ["Hello", " ", "world"]);
			const engine = new ChatEngine({ llmAdapter: adapter });
			engine.createSession("Test");

			const events = await collectEvents(engine.sendMessage("Hi"));

			const textDeltas = events.filter((e) => e.type === "text-delta");
			expect(textDeltas).toHaveLength(3);
			expect(textDeltas.map((e) => e.text)).toEqual(["Hello", " ", "world"]);
		});

		it("saves user message before streaming", async () => {
			const persistence = createMockPersistenceAdapter();
			const adapter = createMockLLMAdapter([], ["Response"]);
			const engine = new ChatEngine({
				llmAdapter: adapter,
				persistenceAdapter: persistence,
			});
			engine.createSession("Test");

			await collectEvents(engine.sendMessage("User query"));

			const session = engine.getActiveSession();
			expect(session).not.toBeNull();
			expect(session!.messages).toHaveLength(2); // user + assistant
			expect(session!.messages[0].role).toBe("user");
			expect(session!.messages[0].content).toBe("User query");
		});

		it("saves assistant message after completion", async () => {
			const persistence = createMockPersistenceAdapter();
			const adapter = createMockLLMAdapter([], ["The", " answer", " is", " 42."]);
			const engine = new ChatEngine({
				llmAdapter: adapter,
				persistenceAdapter: persistence,
			});
			engine.createSession("Test");

			await collectEvents(engine.sendMessage("What is the answer?"));

			const session = engine.getActiveSession();
			expect(session).not.toBeNull();
			const assistantMessages = session!.messages.filter((m) => m.role === "assistant");
			expect(assistantMessages).toHaveLength(1);
			expect(assistantMessages[0].content).toBe("The answer is 42.");
		});

		it("yields finish event at the end", async () => {
			const adapter = createMockLLMAdapter([], ["Done."]);
			const engine = new ChatEngine({ llmAdapter: adapter });
			engine.createSession("Test");

			const events = await collectEvents(engine.sendMessage("Hi"));

			const finishEvents = events.filter((e) => e.type === "finish");
			expect(finishEvents).toHaveLength(1);
			expect(finishEvents[0]).toEqual({ type: "finish", reason: "complete" });
		});

		it("yields usage and metrics events", async () => {
			const adapter = createMockLLMAdapter([], ["Short reply."]);
			const engine = new ChatEngine({ llmAdapter: adapter });
			engine.createSession("Test");

			const events = await collectEvents(engine.sendMessage("Hi"));

			expect(events.some((e) => e.type === "usage")).toBe(true);
			expect(events.some((e) => e.type === "metrics")).toBe(true);
		});
	});

	describe("tool-enabled messaging", () => {
		it("forwards events from AgentLoop in real-time", async () => {
			const toolDefs: ToolDefinition[] = [
				{ name: "calculate", description: "Math", parameters: {} },
			];

			const adapter = createMockLLMAdapter([
				// Step 0
				[
					{ type: "text-delta", text: "Let me calculate." },
					{
						type: "tool-call",
						call: { id: "call-1", name: "calculate", args: { expression: "2+2" } },
					},
					{ type: "finish", reason: "tool-calls-detected" },
				],
				// Step 1
				[
					{ type: "text-delta", text: " The result is 4." },
					{ type: "finish", reason: "text-complete" },
				],
			]);

			const toolAdapter = createMockToolAdapter(toolDefs, async () => ({
				success: true,
				content: "4",
			}));

			const engine = new ChatEngine({
				llmAdapter: adapter,
				toolAdapter,
				agentLoopOptions: { autoApply: true },
			});
			engine.createSession("Test");

			const events = await collectEvents(engine.sendMessage("Calculate 2+2"));

			// Events should be in order: text-delta, tool-call, tool-result, step-finish, text-delta, ...
			const eventTypes = events.map((e) => e.type);

			expect(eventTypes.indexOf("text-delta")).toBeLessThan(
				eventTypes.indexOf("tool-call"),
			);
			expect(eventTypes.indexOf("tool-call")).toBeLessThan(
				eventTypes.indexOf("tool-result"),
			);
			expect(eventTypes.indexOf("tool-result")).toBeLessThan(
				eventTypes.indexOf("step-finish"),
			);

			// Should have the final text
			const textDeltas = events
				.filter((e) => e.type === "text-delta")
				.map((e) => e.text)
				.join("");
			expect(textDeltas).toContain("The result is 4.");
		});

		it("saves assistant message with accumulated text after tool execution", async () => {
			const toolDefs: ToolDefinition[] = [
				{ name: "calculate", description: "Math", parameters: {} },
			];

			const adapter = createMockLLMAdapter([
				[
					{
						type: "tool-call",
						call: { id: "call-1", name: "calculate", args: {} },
					},
					{ type: "finish", reason: "tool-calls-detected" },
				],
				[
					{ type: "text-delta", text: "The answer is 4." },
					{ type: "finish", reason: "text-complete" },
				],
			]);

			const toolAdapter = createMockToolAdapter(toolDefs, async () => ({
				success: true,
				content: "4",
			}));

			const persistence = createMockPersistenceAdapter();
			const engine = new ChatEngine({
				llmAdapter: adapter,
				toolAdapter,
				persistenceAdapter: persistence,
				agentLoopOptions: { autoApply: true },
			});
			engine.createSession("Test");

			await collectEvents(engine.sendMessage("Calculate"));

			const session = engine.getActiveSession();
			const assistantMessages = session!.messages.filter((m) => m.role === "assistant");
			expect(assistantMessages).toHaveLength(1);
			expect(assistantMessages[0].content).toBe("The answer is 4.");
		});

		it("handles errors from AgentLoop gracefully", async () => {
			const toolDefs: ToolDefinition[] = [
				{ name: "calculate", description: "Math", parameters: {} },
			];

			const adapter = createMockLLMAdapter([
				[{ type: "error", message: "LLM connection failed" }],
			]);

			const toolAdapter = createMockToolAdapter(toolDefs);
			const engine = new ChatEngine({
				llmAdapter: adapter,
				toolAdapter,
				agentLoopOptions: { autoApply: true },
			});
			engine.createSession("Test");

			const events = await collectEvents(engine.sendMessage("Calculate"));

			const errorEvents = events.filter((e) => e.type === "error");
			expect(errorEvents).toHaveLength(1);
			expect(errorEvents[0].message).toBe("LLM connection failed");
		});
	});

	describe("session management", () => {
		it("returns error when no active session", async () => {
			const adapter = createMockLLMAdapter();
			const engine = new ChatEngine({ llmAdapter: adapter });
			// No session created

			const events = await collectEvents(engine.sendMessage("Hi"));

			expect(events).toHaveLength(1);
			expect(events[0]).toEqual({ type: "error", message: "No active session" });
		});

		it("creates and switches sessions", async () => {
			const adapter = createMockLLMAdapter();
			const engine = new ChatEngine({ llmAdapter: adapter });

			const session1 = engine.createSession("Session 1");
			const session2 = engine.createSession("Session 2");

			expect(engine.getActiveSession()?.id).toBe(session2.id);

			engine.switchSession(session1.id);
			expect(engine.getActiveSession()?.id).toBe(session1.id);
		});

		it("deletes sessions correctly", async () => {
			const adapter = createMockLLMAdapter();
			const persistence = createMockPersistenceAdapter();
			const engine = new ChatEngine({
				llmAdapter: adapter,
				persistenceAdapter: persistence,
			});

			const session = engine.createSession("To Delete");
			await engine.deleteSession(session.id);

			expect(engine.getSessions()).toHaveLength(0);
			expect(engine.getActiveSession()).toBeNull();
			expect(persistence.deleteSession).toHaveBeenCalledWith(session.id);
		});
	});

	describe("tool management", () => {
		it("registers custom tools", async () => {
			const adapter = createMockLLMAdapter();
			const engine = new ChatEngine({ llmAdapter: adapter });

			const handler = vi.fn(async () => ({ success: true, content: "custom" }));
			engine.registerTool("custom_tool", handler);

			const result = await engine.executeTool({
				id: "test",
				name: "custom_tool",
				args: {},
			});

			expect(handler).toHaveBeenCalled();
			expect(result.success).toBe(true);
		});

		it("combines adapter and custom tools", async () => {
			const toolDefs: ToolDefinition[] = [
				{ name: "adapter_tool", description: "From adapter", parameters: {} },
			];

			const adapter = createMockLLMAdapter();
			const toolAdapter = createMockToolAdapter(toolDefs);
			const engine = new ChatEngine({
				llmAdapter: adapter,
				toolAdapter,
			});

			const tools = engine.getAvailableTools();
			expect(tools).toHaveLength(1);
			expect(tools[0].name).toBe("adapter_tool");
		});
	});

	describe("streaming control", () => {
		it("stops streaming on abort", async () => {
			const adapter = createMockLLMAdapter([], ["One", "Two", "Three"]);
			const engine = new ChatEngine({ llmAdapter: adapter });
			engine.createSession("Test");

			const generator = engine.sendMessage("Hi") as AsyncGenerator<StreamEvent>;

			// Read first event
			const first = await generator.next();
			expect(first.value.type).toBe("text-delta");

			// Stop streaming
			engine.stopStreaming();

			// Continue reading — should finish soon
			const remaining: StreamEvent[] = [];
			for await (const event of generator) {
				remaining.push(event);
			}

			// Should not have received all three chunks
			const textDeltas = remaining.filter((e) => e.type === "text-delta");
			expect(textDeltas.length).toBeLessThan(3);
		});

		it("tracks streaming state", async () => {
			const adapter = createMockLLMAdapter([], ["Response"]);
			const engine = new ChatEngine({ llmAdapter: adapter });
			engine.createSession("Test");

			expect(engine.isStreaming).toBe(false);

			const promise = collectEvents(engine.sendMessage("Hi"));

			// State should be true while streaming (but might flip by the time we check)
			// Just verify it returns to false after
			await promise;
			expect(engine.isStreaming).toBe(false);
		});
	});

	describe("settings", () => {
		it("updates and retrieves settings", () => {
			const adapter = createMockLLMAdapter();
			const engine = new ChatEngine({ llmAdapter: adapter });

			engine.updateSettings({ enableTools: false, maxAgentSteps: 10 });
			const settings = engine.getSettings();

			expect(settings.enableTools).toBe(false);
			expect(settings.maxAgentSteps).toBe(10);
		});
	});

	describe("non-tool chats unchanged", () => {
		it("uses simple text streaming when tools are disabled", async () => {
			const toolDefs: ToolDefinition[] = [
				{ name: "calculate", description: "Math", parameters: {} },
			];

			const adapter = createMockLLMAdapter([], ["Simple", " text", " response."]);
			const toolAdapter = createMockToolAdapter(toolDefs);
			const engine = new ChatEngine({
				llmAdapter: adapter,
				toolAdapter,
			});
			engine.createSession("Test");

			// Disable tools via options
			const events = await collectEvents(
				engine.sendMessage("Hi", { enableTools: false }),
			);

			// Should not see any tool-related events
			expect(events.some((e) => e.type === "tool-call")).toBe(false);
			expect(events.some((e) => e.type === "tool-result")).toBe(false);

			const text = events
				.filter((e) => e.type === "text-delta")
				.map((e) => e.text)
				.join("");
			expect(text).toBe("Simple text response.");
		});

		it("uses simple text streaming when no tools available", async () => {
			const adapter = createMockLLMAdapter([], ["No", " tools", " here."]);
			const engine = new ChatEngine({ llmAdapter: adapter });
			engine.createSession("Test");

			const events = await collectEvents(engine.sendMessage("Hi"));

			const text = events
				.filter((e) => e.type === "text-delta")
				.map((e) => e.text)
				.join("");
			expect(text).toBe("No tools here.");
		});
	});
});
