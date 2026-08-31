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
	RAGAdapter,
	ChatRetrievedSource,
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

		it("locks and persists the turn before slow retrieval", async () => {
			let retrievalStarted!: () => void;
			let releaseRetrieval!: (sources: ChatRetrievedSource[]) => void;
			const started = new Promise<void>((resolve) => {
				retrievalStarted = resolve;
			});
			const retrieval = new Promise<ChatRetrievedSource[]>((resolve) => {
				releaseRetrieval = resolve;
			});
			const rag: RAGAdapter = {
				analyzeQuery: async () => ({ intent: "test", keywords: [], requiresRetrieval: true }),
				retrievePapers: async () => [],
				buildContext: async () => "",
				retrieveSources: vi.fn(async (_query, signal) => {
					retrievalStarted();
					expect(signal).toBeInstanceOf(AbortSignal);
					return retrieval;
				}),
			};
			const persistence = createMockPersistenceAdapter();
			const engine = new ChatEngine({
				llmAdapter: createMockLLMAdapter([], ["unused"]),
				ragAdapter: rag,
				persistenceAdapter: persistence,
			});
			engine.createSession("Retrieval lock");

			const stream = engine.sendMessage("slow query", { enableRAG: true })[Symbol.asyncIterator]();
			expect((await stream.next()).value).toEqual({
				type: "rag-status",
				status: "retrieving",
				progress: 0,
			});
			const pendingRetrieval = stream.next();
			await started;
			expect(engine.isStreaming).toBe(true);
			expect(rag.retrieveSources).toHaveBeenCalledOnce();
			const saveSessionMock = persistence.saveSession as ReturnType<typeof vi.fn>;
			const savedUserTurn = saveSessionMock.mock.calls.at(-1)?.[0];
			expect(savedUserTurn?.messages[0]).toMatchObject({
				role: "user",
				content: "slow query",
			});
			expect(savedUserTurn?.turns?.[0]).toMatchObject({ status: "streaming" });

			engine.stopStreaming();
			const afterCancellation = await pendingRetrieval;
			expect(afterCancellation.value).toEqual({
				type: "rag-status",
				status: "cancelled",
			});
			expect((await stream.next()).done).toBe(true);
			expect(engine.getActiveSession()?.turns?.at(-1)).toMatchObject({
				status: "cancelled",
			});
			releaseRetrieval([]);
		});

		it("persists a retrieval failure without calling the provider", async () => {
			const persistence = createMockPersistenceAdapter();
			const streamChat = vi.fn(async function* () {
				yield "should not run";
			});
			const rag: RAGAdapter = {
				analyzeQuery: async () => ({ intent: "test", keywords: [], requiresRetrieval: true }),
				retrievePapers: async () => [],
				buildContext: async () => "",
				retrieveSources: async () => {
					throw new Error("retrieval unavailable");
				},
			};
			const adapter = { ...createMockLLMAdapter(), streamChat };
			const engine = new ChatEngine({ llmAdapter: adapter, ragAdapter: rag, persistenceAdapter: persistence });
			engine.createSession("Retrieval failure");

			const events = await collectEvents(engine.sendMessage("unavailable", { enableRAG: true }));
			expect(events).toContainEqual({ type: "rag-status", status: "failed" });
			expect(events).toContainEqual({ type: "error", message: "retrieval unavailable" });
			expect(streamChat).not.toHaveBeenCalled();
			expect(engine.getActiveSession()?.turns?.at(-1)).toMatchObject({
				status: "failed",
				error: "retrieval unavailable",
			});
			const saveSessionMock = persistence.saveSession as ReturnType<typeof vi.fn>;
			expect(saveSessionMock.mock.calls.at(-1)?.[0]?.turns?.at(-1)).toMatchObject({
				status: "failed",
				error: "retrieval unavailable",
			});
		});
	});

	describe("tool-enabled messaging", () => {
		it("waits for engine approval and then executes the real tool", async () => {
			const execute = vi.fn(async () => ({ success: true, content: "4" }));
			const adapter = createMockLLMAdapter([
				[
					{
						type: "tool-call",
						call: { id: "call-1", name: "calculate", args: {} },
					},
					{ type: "finish", reason: "tool-calls-detected" },
				],
				[{ type: "finish", reason: "text-complete" }],
			]);
			const engine = new ChatEngine({
				llmAdapter: adapter,
				toolAdapter: createMockToolAdapter(
					[{ name: "calculate", description: "Math", parameters: {} }],
					execute,
				),
			});
			engine.createSession("Test");

			const stream = engine.sendMessage("Calculate")[Symbol.asyncIterator]();
			expect((await stream.next()).value).toMatchObject({ type: "tool-call" });
			expect((await stream.next()).value).toMatchObject({ type: "pending-approval" });

			const resultPromise = stream.next();
			await Promise.resolve();
			expect(engine.getSnapshot().pendingApprovals).toHaveLength(1);
			expect(execute).not.toHaveBeenCalled();
			expect(engine.approveTool("call-1")).toBe(true);

			const resultEvent = await resultPromise;
			expect(resultEvent.value).toMatchObject({
				type: "tool-result",
				result: { success: true },
			});
			if (resultEvent.value?.type === "tool-result") {
				expect(resultEvent.value.result.content).toContain("4");
			}
			expect(execute).toHaveBeenCalledOnce();
			expect(engine.getSnapshot().pendingApprovals).toHaveLength(0);
		});

		it("rejects a pending tool without executing it", async () => {
			const execute = vi.fn(async () => ({ success: true, content: "done" }));
			const adapter = createMockLLMAdapter([
				[
					{
						type: "tool-call",
						call: { id: "call-1", name: "write", args: {} },
					},
					{ type: "finish", reason: "tool-calls-detected" },
				],
				[{ type: "finish", reason: "text-complete" }],
			]);
			const engine = new ChatEngine({
				llmAdapter: adapter,
				toolAdapter: createMockToolAdapter(
					[{ name: "write", description: "Write", parameters: {} }],
					execute,
				),
			});
			engine.createSession("Test");

			const stream = engine.sendMessage("Write")[Symbol.asyncIterator]();
			await stream.next();
			await stream.next();
			const resultPromise = stream.next();
			await Promise.resolve();
			expect(engine.rejectTool("call-1")).toBe(true);
			const resultEvent = await resultPromise;

			expect(resultEvent.value).toMatchObject({
				type: "tool-result",
				result: { success: false, error: "User rejected the tool call" },
			});
			expect(execute).not.toHaveBeenCalled();
			expect(engine.rejectTool("call-1")).toBe(false);
		});

		it("cancels pending approval when streaming stops", async () => {
			const execute = vi.fn(async () => ({ success: true, content: "done" }));
			const adapter = createMockLLMAdapter([
				[
					{
						type: "tool-call",
						call: { id: "call-1", name: "write", args: {} },
					},
					{ type: "finish", reason: "tool-calls-detected" },
				],
			]);
			const engine = new ChatEngine({
				llmAdapter: adapter,
				toolAdapter: createMockToolAdapter(
					[{ name: "write", description: "Write", parameters: {} }],
					execute,
				),
			});
			engine.createSession("Test");

			const stream = engine.sendMessage("Write")[Symbol.asyncIterator]();
			await stream.next();
			await stream.next();
			const resultPromise = stream.next();
			await Promise.resolve();
			engine.stopStreaming();
			const resultEvent = await resultPromise;

			expect(resultEvent.value).toMatchObject({
				type: "tool-result",
				result: { success: false, error: "Tool call cancelled" },
			});
			expect(engine.getSnapshot().pendingApprovals).toHaveLength(0);
			expect(execute).not.toHaveBeenCalled();
		});

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

		it("publishes observable snapshots and supports unsubscribe", () => {
			const engine = new ChatEngine({ llmAdapter: createMockLLMAdapter() });
			const listener = vi.fn();
			const unsubscribe = engine.subscribe(listener);

			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({
					activeSessionId: null,
					isStreaming: false,
					pendingApprovals: [],
				}),
			);

			const session = engine.createSession("Observed");
			expect(listener).toHaveBeenLastCalledWith(
				expect.objectContaining({ activeSessionId: session.id }),
			);

			unsubscribe();
			const callCount = listener.mock.calls.length;
			engine.createSession("Not observed");
			expect(listener).toHaveBeenCalledTimes(callCount);
		});

		it("rejects new work after disposal", async () => {
			const engine = new ChatEngine({ llmAdapter: createMockLLMAdapter() });
			engine.createSession("Test");
			engine.dispose();

			const events = await collectEvents(engine.sendMessage("Hi"));
			expect(events).toEqual([
				{ type: "error", message: "ChatEngine has been disposed" },
			]);
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
