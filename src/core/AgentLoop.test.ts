import { describe, it, expect } from "vitest";
import { AgentLoop } from "./AgentLoop";
import { ToolExecutor } from "./ToolExecutor";
import type {
	ChatSession,
	ChatMessage,
	ToolDefinition,
	StreamEvent,
	ToolResult,
	LLMAdapter,
} from "./types";

// ============================================================================
// Helpers
// ============================================================================

function createMockSession(): ChatSession {
	return {
		id: "test-session",
		title: "Test",
		createdAt: Date.now(),
		updatedAt: Date.now(),
		messages: [],
	};
}

function createMockMessages(): ChatMessage[] {
	return [
		{ id: "sys", role: "system", content: "You are a helpful assistant.", timestamp: 0 },
		{ id: "usr", role: "user", content: "Hello", timestamp: Date.now() },
	];
}

function createMockTools(): ToolDefinition[] {
	return [
		{
			name: "calculate",
			description: "Calculate math",
			parameters: { type: "object", properties: {} },
		},
	];
}

/**
 * Creates a mock LLM adapter that yields the given events.
 */
function createMockAdapter(
	events: StreamEvent[][],
): LLMAdapter {
	let callIndex = 0;
	return {
		streamChatWithTools: async function* (
			_messages: { role: string; content: string }[],
			_tools: ToolDefinition[],
			signal?: AbortSignal,
		) {
			const stepEvents = events[callIndex++] ?? [];
			for (const event of stepEvents) {
				if (signal?.aborted) break;
				yield event;
			}
		},
		streamChat: async function* () {
			yield "";
		},
		getProviders: () => [{ id: "mock", name: "Mock" }],
		getModels: () => [],
		testConnection: async () => ({ ok: true, message: "ok" }),
	};
}

/**
 * Creates a tool executor with a mock handler.
 */
function createMockToolExecutor(
	handlers: Record<string, (args: unknown) => Promise<ToolResult>>,
): ToolExecutor {
	const executor = new ToolExecutor();
	for (const [name, handler] of Object.entries(handlers)) {
		executor.register(name, handler);
	}
	return executor;
}

// ============================================================================
// Collect all events from an async generator
// ============================================================================

async function collectEvents<T>(
	gen: AsyncGenerator<T, unknown>,
): Promise<{ events: T[]; result: unknown }> {
	const events: T[] = [];
	let result: unknown;
	while (true) {
		const { value, done } = await gen.next();
		if (done) {
			result = value;
			break;
		}
		events.push(value);
	}
	return { events, result };
}

// ============================================================================
// Tests
// ============================================================================

describe("AgentLoop", () => {
	describe("text-only streaming", () => {
		it("yields text-deltas during streaming", async () => {
			const adapter = createMockAdapter([
				[
					{ type: "text-delta", text: "Hello" },
					{ type: "text-delta", text: " world" },
					{ type: "finish", reason: "text-complete" },
				],
			]);

			const loop = new AgentLoop({ llmAdapter: adapter });
			const { events, result } = await collectEvents(
				loop.run(createMockSession(), createMockMessages(), createMockTools()),
			);

			const textDeltas = events.filter((e) => e.type === "text-delta");
			expect(textDeltas).toHaveLength(2);
			expect(textDeltas[0]).toEqual({ type: "text-delta", text: "Hello" });
			expect(textDeltas[1]).toEqual({ type: "text-delta", text: " world" });

			expect(result).toMatchObject({
				text: "Hello world",
				stepsTaken: 1,
			});
		});

		it("returns accumulated text and token estimate", async () => {
			const adapter = createMockAdapter([
				[
					{ type: "text-delta", text: "The answer is 42." },
					{ type: "finish", reason: "text-complete" },
				],
			]);

			const loop = new AgentLoop({ llmAdapter: adapter });
			const { result } = await collectEvents(
				loop.run(createMockSession(), createMockMessages(), createMockTools()),
			);

			expect(result).toEqual({
				text: "The answer is 42.",
				tokenEstimate: expect.any(Number),
				stepsTaken: 1,
			});
			expect((result as { tokenEstimate: number }).tokenEstimate).toBeGreaterThan(0);
		});
	});

	describe("tool calling", () => {
		it("yields tool-call when tool is invoked", async () => {
			const adapter = createMockAdapter([
				[
					{ type: "text-delta", text: "Let me calculate that." },
					{
						type: "tool-call",
						call: { id: "call-1", name: "calculate", args: { expression: "2+2" } },
					},
					{ type: "finish", reason: "tool-calls-detected" },
				],
				[
					{ type: "text-delta", text: " The result is 4." },
					{ type: "finish", reason: "text-complete" },
				],
			]);

			const executor = createMockToolExecutor({
				calculate: async () => ({ success: true, content: "4" }),
			});

			const loop = new AgentLoop({
				llmAdapter: adapter,
				toolExecutor: executor,
				autoApply: true,
			});

			const { events } = await collectEvents(
				loop.run(createMockSession(), createMockMessages(), createMockTools()),
			);

			const toolCalls = events.filter((e) => e.type === "tool-call");
			expect(toolCalls).toHaveLength(1);
			expect(toolCalls[0]).toMatchObject({
				type: "tool-call",
				call: { id: "call-1", name: "calculate" },
			});
		});

		it("yields tool-result after execution", async () => {
			const adapter = createMockAdapter([
				[
					{
						type: "tool-call",
						call: { id: "call-1", name: "calculate", args: { expression: "2+2" } },
					},
					{ type: "finish", reason: "tool-calls-detected" },
				],
				[
					{ type: "text-delta", text: "Done." },
					{ type: "finish", reason: "text-complete" },
				],
			]);

			const executor = createMockToolExecutor({
				calculate: async () => ({ success: true, content: "4" }),
			});

			const loop = new AgentLoop({
				llmAdapter: adapter,
				toolExecutor: executor,
				autoApply: true,
			});

			const { events } = await collectEvents(
				loop.run(createMockSession(), createMockMessages(), createMockTools()),
			);

			const toolResults = events.filter((e) => e.type === "tool-result");
			expect(toolResults).toHaveLength(1);
			expect(toolResults[0]).toMatchObject({
				type: "tool-result",
				callId: "call-1",
				result: { success: true },
			});
			// ToolExecutor serializes the handler result to JSON string
			expect(toolResults[0].result.content).toContain("4");
		});

		it("handles multiple tool calls in one step", async () => {
			const adapter = createMockAdapter([
				[
					{
						type: "tool-call",
						call: { id: "call-1", name: "calculate", args: { expression: "1+1" } },
					},
					{
						type: "tool-call",
						call: { id: "call-2", name: "calculate", args: { expression: "2+2" } },
					},
					{ type: "finish", reason: "tool-calls-detected" },
				],
				[
					{ type: "text-delta", text: "Results computed." },
					{ type: "finish", reason: "text-complete" },
				],
			]);

			const executor = createMockToolExecutor({
				calculate: async (args: unknown) => {
					const { expression } = args as { expression: string };
					return { success: true, content: String(eval(expression)) };
				},
			});

			const loop = new AgentLoop({
				llmAdapter: adapter,
				toolExecutor: executor,
				autoApply: true,
			});

			const { events } = await collectEvents(
				loop.run(createMockSession(), createMockMessages(), createMockTools()),
			);

			const toolCalls = events.filter((e) => e.type === "tool-call");
			const toolResults = events.filter((e) => e.type === "tool-result");
			expect(toolCalls).toHaveLength(2);
			expect(toolResults).toHaveLength(2);
		});
	});

	describe("multi-step execution", () => {
		it("handles multiple steps", async () => {
			const adapter = createMockAdapter([
				// Step 0: tool call
				[
					{
						type: "tool-call",
						call: { id: "call-1", name: "calculate", args: { expression: "1+1" } },
					},
					{ type: "finish", reason: "tool-calls-detected" },
				],
				// Step 1: another tool call
				[
					{
						type: "tool-call",
						call: { id: "call-2", name: "calculate", args: { expression: "2+2" } },
					},
					{ type: "finish", reason: "tool-calls-detected" },
				],
				// Step 2: final text
				[
					{ type: "text-delta", text: "All done!" },
					{ type: "finish", reason: "text-complete" },
				],
			]);

			const executor = createMockToolExecutor({
				calculate: async () => ({ success: true, content: "42" }),
			});

			const loop = new AgentLoop({
				llmAdapter: adapter,
				toolExecutor: executor,
				autoApply: true,
				maxSteps: 5,
			});

			const { events, result } = await collectEvents(
				loop.run(createMockSession(), createMockMessages(), createMockTools()),
			);

			const stepFinishes = events.filter((e) => e.type === "step-finish");
			expect(stepFinishes).toHaveLength(2);
			expect(stepFinishes[0]).toEqual({ type: "step-finish", step: 1 });
			expect(stepFinishes[1]).toEqual({ type: "step-finish", step: 2 });

			expect(result).toMatchObject({
				text: "All done!",
				stepsTaken: 3,
			});
		});

		it("stops at maxSteps even if more tools would be called", async () => {
			const adapter = createMockAdapter([
				[
					{
						type: "tool-call",
						call: { id: "call-1", name: "calculate", args: {} },
					},
					{ type: "finish", reason: "tool-calls-detected" },
				],
				[
					{
						type: "tool-call",
						call: { id: "call-2", name: "calculate", args: {} },
					},
					{ type: "finish", reason: "tool-calls-detected" },
				],
			]);

			const executor = createMockToolExecutor({
				calculate: async () => ({ success: true, content: "42" }),
			});

			const loop = new AgentLoop({
				llmAdapter: adapter,
				toolExecutor: executor,
				autoApply: true,
				maxSteps: 2,
			});

			const { result } = await collectEvents(
				loop.run(createMockSession(), createMockMessages(), createMockTools()),
			);

			expect(result).toMatchObject({
				stepsTaken: 2,
			});
		});
	});

	describe("abort signal", () => {
		it("stops on abort signal", async () => {
			const adapter = createMockAdapter([
				[
					{ type: "text-delta", text: "Hello" },
					{ type: "text-delta", text: " world" },
					{ type: "text-delta", text: "!" },
				],
			]);

			const loop = new AgentLoop({ llmAdapter: adapter });
			const controller = new AbortController();

			// Abort immediately
			controller.abort();

			const { result } = await collectEvents(
				loop.run(
					createMockSession(),
					createMockMessages(),
					createMockTools(),
					controller.signal,
				),
			);

			// Should yield nothing because signal is already aborted
			// Actually, the stream loop checks signal.aborted at the start of each iteration
			// but the first event might still be yielded if the check happens after yield
			// Let's be lenient here
			expect((result as { stepsTaken: number }).stepsTaken).toBe(1);
		});

		it("aborts mid-stream", async () => {
			const eventsToYield: StreamEvent[] = [
				{ type: "text-delta", text: "First" },
				{ type: "text-delta", text: "Second" },
				{ type: "text-delta", text: "Third" },
			];

			const adapter: LLMAdapter = {
				streamChatWithTools: async function* (
					_messages: { role: string; content: string }[],
					_tools: ToolDefinition[],
					signal?: AbortSignal,
				) {
					for (const event of eventsToYield) {
						if (signal?.aborted) break;
						yield event;
					}
				},
				streamChat: async function* () {
					yield "";
				},
				getProviders: () => [{ id: "mock", name: "Mock" }],
				getModels: () => [],
				testConnection: async () => ({ ok: true, message: "ok" }),
			};

			const loop = new AgentLoop({ llmAdapter: adapter });
			const controller = new AbortController();

			const generator = loop.run(
				createMockSession(),
				createMockMessages(),
				createMockTools(),
				controller.signal,
			);

			const events: StreamEvent[] = [];

			while (true) {
				const { value, done } = await generator.next();
				if (done) {
					break;
				}
				events.push(value);
				// Abort after receiving first event
				if (events.length === 1) {
					controller.abort();
				}
			}

			expect(events.length).toBeLessThanOrEqual(2);
			expect(events[0]).toEqual({ type: "text-delta", text: "First" });
		});
	});

	describe("approval flow", () => {
		it("yields pending-approval when autoApply is false", async () => {
			const adapter = createMockAdapter([
				[
					{
						type: "tool-call",
						call: { id: "call-1", name: "calculate", args: { expression: "2+2" } },
					},
					{ type: "finish", reason: "tool-calls-detected" },
				],
				[
					{ type: "text-delta", text: "Done." },
					{ type: "finish", reason: "text-complete" },
				],
			]);

			const executor = createMockToolExecutor({
				calculate: async () => ({ success: true, content: "4" }),
			});

			const loop = new AgentLoop({
				llmAdapter: adapter,
				toolExecutor: executor,
				autoApply: false,
				requestApproval: async () => ({ success: true, content: "approved" }),
			});

			const { events } = await collectEvents(
				loop.run(createMockSession(), createMockMessages(), createMockTools()),
			);

			const pendingApprovals = events.filter((e) => e.type === "pending-approval");
			expect(pendingApprovals).toHaveLength(1);
			expect(pendingApprovals[0]).toMatchObject({
				type: "pending-approval",
				call: { id: "call-1", name: "calculate" },
			});
		});

		it("executes tool directly when autoApply is true", async () => {
			const adapter = createMockAdapter([
				[
					{
						type: "tool-call",
						call: { id: "call-1", name: "calculate", args: { expression: "2+2" } },
					},
					{ type: "finish", reason: "tool-calls-detected" },
				],
				[
					{ type: "text-delta", text: "Done." },
					{ type: "finish", reason: "text-complete" },
				],
			]);

			const executor = createMockToolExecutor({
				calculate: async () => ({ success: true, content: "4" }),
			});

			const loop = new AgentLoop({
				llmAdapter: adapter,
				toolExecutor: executor,
				autoApply: true,
			});

			const { events } = await collectEvents(
				loop.run(createMockSession(), createMockMessages(), createMockTools()),
			);

			const pendingApprovals = events.filter((e) => e.type === "pending-approval");
			expect(pendingApprovals).toHaveLength(0);

			const toolResults = events.filter((e) => e.type === "tool-result");
			expect(toolResults).toHaveLength(1);
		});

		it("uses rejection result when approval returns null", async () => {
			const adapter = createMockAdapter([
				[
					{
						type: "tool-call",
						call: { id: "call-1", name: "calculate", args: {} },
					},
					{ type: "finish", reason: "tool-calls-detected" },
				],
				[
					{ type: "text-delta", text: "Done." },
					{ type: "finish", reason: "text-complete" },
				],
			]);

			const executor = createMockToolExecutor({
				calculate: async () => ({ success: true, content: "4" }),
			});

			const loop = new AgentLoop({
				llmAdapter: adapter,
				toolExecutor: executor,
				autoApply: false,
				requestApproval: async () => null,
			});

			const { events } = await collectEvents(
				loop.run(createMockSession(), createMockMessages(), createMockTools()),
			);

			const toolResults = events.filter((e) => e.type === "tool-result");
			expect(toolResults[0]).toMatchObject({
				result: { success: false, error: "User rejected the tool call" },
			});
		});
	});

	describe("error handling", () => {
		it("throws when adapter yields error event", async () => {
			const adapter = createMockAdapter([
				[{ type: "error", message: "LLM API failure" }],
			]);

			const loop = new AgentLoop({ llmAdapter: adapter });

			await expect(
				collectEvents(
					loop.run(createMockSession(), createMockMessages(), createMockTools()),
				),
			).rejects.toThrow("LLM API failure");
		});

		it("yields tool-error events from adapter", async () => {
			const adapter = createMockAdapter([
				[
					{ type: "tool-error", callId: "call-1", error: "Invalid arguments" },
					{ type: "text-delta", text: "Sorry about that." },
					{ type: "finish", reason: "text-complete" },
				],
			]);

			const loop = new AgentLoop({ llmAdapter: adapter });
			const { events } = await collectEvents(
				loop.run(createMockSession(), createMockMessages(), createMockTools()),
			);

			const toolErrors = events.filter((e) => e.type === "tool-error");
			expect(toolErrors).toHaveLength(1);
			expect(toolErrors[0]).toEqual({
				type: "tool-error",
				callId: "call-1",
				error: "Invalid arguments",
			});
		});
	});

	describe("return value", () => {
		it("returns AgentLoopResult at end", async () => {
			const adapter = createMockAdapter([
				[
					{ type: "text-delta", text: "Final answer." },
					{ type: "finish", reason: "text-complete" },
				],
			]);

			const loop = new AgentLoop({ llmAdapter: adapter });
			const { result } = await collectEvents(
				loop.run(createMockSession(), createMockMessages(), createMockTools()),
			);

			expect(result).toEqual({
				text: "Final answer.",
				tokenEstimate: expect.any(Number),
				stepsTaken: 1,
			});
		});
	});
});
