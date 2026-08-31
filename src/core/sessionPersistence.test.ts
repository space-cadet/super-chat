import { describe, expect, it } from "vitest";
import { ChatEngine } from "./ChatEngine";
import {
	CURRENT_SESSION_SCHEMA_VERSION,
	createExternalSessionIdentity,
	normalizePersistedSession,
} from "./sessionPersistence";
import { MemoryPersistenceAdapter } from "../adapters/MemoryPersistence";
import type {
	ChatSession,
	LLMAdapter,
	SessionWriteContext,
	StreamEvent,
	ToolAdapter,
	ToolCall,
	ToolDefinition,
} from "./types";

function createTextAdapter(chunks: string[] = ["reply"]): LLMAdapter {
	return {
		streamChat: async function* (_messages, signal) {
			for (const chunk of chunks) {
				if (signal?.aborted) return;
				yield chunk;
			}
		},
		streamChatWithTools: async function* (_messages, _tools, signal) {
			if (!signal?.aborted) yield { type: "text-delta", text: chunks.join("") };
		},
		getProviders: () => [{ id: "fixture", name: "Fixture" }],
		getModels: () => [],
		testConnection: async () => ({ ok: true, message: "ok" }),
	};
}

async function collectEvents(stream: AsyncIterable<StreamEvent>): Promise<StreamEvent[]> {
	const events: StreamEvent[] = [];
	for await (const event of stream) events.push(event);
	return events;
}

describe("session persistence contract", () => {
	it("gives sessions an internal ID and keeps product identity typed separately", async () => {
		const persistence = new MemoryPersistenceAdapter();
		const engine = new ChatEngine({
			llmAdapter: createTextAdapter(),
			persistenceAdapter: persistence,
		});
		const externalIdentity = createExternalSessionIdentity("fixture", "chat-7", "2026-08");
		const session = engine.createSession("Fixture", externalIdentity);

		await engine.loadSessions();
		const reloaded = engine.getActiveSession();
		expect(reloaded?.id).toBe(session.id);
		expect(reloaded?.externalIdentity).toEqual(externalIdentity);
		expect(reloaded?.persistence?.schemaVersion).toBe(CURRENT_SESSION_SCHEMA_VERSION);
	});

	it("reloads the visible transcript and model history", async () => {
		const persistence = new MemoryPersistenceAdapter();
		const first = new ChatEngine({
			llmAdapter: createTextAdapter(["first answer"]),
			persistenceAdapter: persistence,
		});
		const session = first.createSession("Reload me");
		await collectEvents(first.sendMessage("first question"));
		await first.loadSessions();

		const second = new ChatEngine({
			llmAdapter: createTextAdapter(["second answer"]),
			persistenceAdapter: persistence,
		});
		await second.loadSessions();
		const restored = second.getActiveSession();

		expect(restored?.id).toBe(session.id);
		expect(restored?.messages.map(({ role, content }) => ({ role, content }))).toEqual([
			{ role: "user", content: "first question" },
			{ role: "assistant", content: "first answer" },
		]);
		expect(restored?.modelHistory).toEqual([
			{ role: "user", content: "first question" },
			{ role: "assistant", content: "first answer" },
		]);

		await collectEvents(second.sendMessage("follow up"));
		expect(second.getActiveSession()?.modelHistory).toEqual([
			{ role: "user", content: "first question" },
			{ role: "assistant", content: "first answer" },
			{ role: "user", content: "follow up" },
			{ role: "assistant", content: "second answer" },
		]);
	});

	it("serializes writes through one engine owner and records lifecycle reasons", async () => {
		const writes: Array<SessionWriteContext | undefined> = [];
		const persistence = new MemoryPersistenceAdapter();
		const originalSave = persistence.saveSession.bind(persistence);
		persistence.saveSession = async (
			session: ChatSession,
			context?: SessionWriteContext,
		) => {
			writes.push(context);
			await originalSave(session, context);
		};
		const engine = new ChatEngine({
			llmAdapter: createTextAdapter(["a", "b"]),
			persistenceAdapter: persistence,
		});
		engine.createSession("Writes");
		await collectEvents(engine.sendMessage("question"));
		await engine.loadSessions();

		expect(writes.length).toBeGreaterThanOrEqual(3);
		expect(writes.every((context) => context?.owner === "chat-engine")).toBe(true);
		expect(writes.map((context) => context?.reason)).toContain("user-message");
		expect(writes.map((context) => context?.reason)).toContain("turn-complete");
	});

	it("keeps partial output and cancellation durable", async () => {
		const persistence = new MemoryPersistenceAdapter();
		const writes: string[] = [];
		const originalSave = persistence.saveSession.bind(persistence);
		persistence.saveSession = async (session, context) => {
			if (context) writes.push(context.reason);
			await originalSave(session, context);
		};
		const engine = new ChatEngine({
			llmAdapter: createTextAdapter(["partial", " never arrives"]),
			persistenceAdapter: persistence,
		});
		engine.createSession("Cancel me");
		const stream = engine.sendMessage("stop this")[Symbol.asyncIterator]();

		expect((await stream.next()).value).toEqual({
			type: "text-delta",
			text: "partial",
		});
		engine.stopStreaming();
		while (!(await stream.next()).done) {
			// Drain the generator so its cancellation save completes.
		}
		await engine.loadSessions();

		const restored = engine.getActiveSession();
		expect(restored?.turns?.[0].status).toBe("cancelled");
		expect(restored?.messages.at(-1)).toMatchObject({
			role: "assistant",
			content: "partial",
			status: "cancelled",
		});
		expect(writes).toContain("partial-output");
		expect(writes).toContain("turn-cancelled");
	});

	it("records failed turns without poisoning the next continuation", async () => {
		const persistence = new MemoryPersistenceAdapter();
		const adapter: LLMAdapter = {
			...createTextAdapter(),
			streamChat: async function* (_messages, _signal) {
				yield "before failure";
				throw new Error("provider unavailable");
			},
		};
		const engine = new ChatEngine({ llmAdapter: adapter, persistenceAdapter: persistence });
		engine.createSession("Failure");
		const events = await collectEvents(engine.sendMessage("fail"));
		await engine.loadSessions();

		expect(events).toContainEqual({ type: "error", message: "provider unavailable" });
		expect(engine.getActiveSession()?.turns?.[0]).toMatchObject({
			status: "failed",
			error: "provider unavailable",
		});
		expect(engine.getActiveSession()?.modelHistory).toEqual([
			{ role: "user", content: "fail" },
		]);
	});

	it("persists tool calls and results needed for model continuation", async () => {
		const persistence = new MemoryPersistenceAdapter();
		let step = 0;
		const llmAdapter: LLMAdapter = {
			...createTextAdapter(),
			streamChatWithTools: async function* (_messages, _tools, signal) {
				if (signal?.aborted) return;
				if (step++ === 0) {
					yield {
						type: "tool-call",
						call: { id: "call-1", name: "read_fixture", args: {} },
					};
					yield { type: "finish", reason: "tool-calls-detected" };
					return;
				}
				yield { type: "text-delta", text: "The fixture is readable." };
				yield { type: "finish", reason: "text-complete" };
			},
		};
		const toolAdapter: ToolAdapter = {
			getAvailableTools: (): ToolDefinition[] => [
				{ name: "read_fixture", description: "Read fixture", parameters: {} },
			],
			executeTool: async (call: ToolCall) => ({
				success: true,
				content: `read ${call.name}`,
			}),
		};
		const engine = new ChatEngine({
			llmAdapter,
			toolAdapter,
			persistenceAdapter: persistence,
			agentLoopOptions: { autoApply: true },
		});
		engine.createSession("Tools");
		await collectEvents(engine.sendMessage("read it"));
		await engine.loadSessions();

		const turn = engine.getActiveSession()?.turns?.[0];
		expect(turn?.status).toBe("completed");
		expect(turn?.toolCalls).toHaveLength(1);
		expect(turn?.toolResults["call-1"]).toMatchObject({ success: true });
		expect(engine.getActiveSession()?.modelHistory).toHaveLength(4);
		expect(engine.getActiveSession()?.modelHistory?.at(-1)).toEqual({
			role: "assistant",
			content: "The fixture is readable.",
		});
	});

	it("migrates old visible-only records and skips malformed records", () => {
		const oldSession: ChatSession = {
			id: "old-session",
			title: "Old",
			createdAt: 1,
			updatedAt: 2,
			messages: [
				{ id: "m1", role: "user", content: "hello", timestamp: 1 },
				{ id: "m2", role: "assistant", content: "hi", timestamp: 2 },
			],
		};
		const migrated = normalizePersistedSession(oldSession);
		expect(migrated.migrated).toBe(true);
		expect(migrated.session?.persistence).toMatchObject({
			schemaVersion: CURRENT_SESSION_SCHEMA_VERSION,
			migratedFromVersion: 0,
		});
		expect(migrated.session?.modelHistory).toEqual([
			{ role: "user", content: "hello" },
			{ role: "assistant", content: "hi" },
		]);
		expect(normalizePersistedSession({ id: "broken", messages: [] }).session).toBeNull();
	});
});
