/**
 * ChatEngine — High-level API for super-chat.
 *
 * Wraps AgentLoop + adapters into a single, easy-to-use class.
 * Framework-agnostic: no React dependency.
 *
 * Usage:
 *   const engine = new ChatEngine({
 *     llmAdapter: new VercelLLMAdapter({ profile }),
 *     persistenceAdapter: new LocalStoragePersistenceAdapter(),
 *     toolAdapter: new DemoToolAdapter(),
 *   });
 *
 *   for await (const event of engine.sendMessage("Hello")) {
 *     if (event.type === 'text-delta') console.log(event.text);
 *   }
 */

import { AgentLoop } from "./AgentLoop";
import { ToolExecutor } from "./ToolExecutor";
import type {
	ChatEngineOptions,
	ChatEngineListener,
	ChatEngineSnapshot,
	ChatMessage,
	ChatModelMessage,
	ChatSession,
	ChatSettings,
	ChatTurn,
	ExternalSessionIdentity,
	SendOptions,
	SessionWriteContext,
	StreamEvent,
	ToolAdapter,
	ToolCall,
	ToolDefinition,
	ToolHandler,
	ToolResult,
} from "./types";
import type { AgentLoopResult } from "./AgentLoop";
import {
	cloneSession,
	createSessionId,
	createSessionPersistenceMetadata,
	createTurn,
	normalizePersistedSession,
} from "./sessionPersistence";
import type { SessionLoadReport } from "./sessionPersistence";

// ============================================================================
// Internal State
// ============================================================================

interface InternalState {
	sessions: ChatSession[];
	activeSessionId: string | null;
	settings: ChatSettings;
	isStreaming: boolean;
	abortController: AbortController | null;
}

interface PendingApproval {
	call: ToolCall;
	resolve: (approved: boolean) => void;
	removeAbortListener?: () => void;
}

const defaultSettings: ChatSettings = {
	activeProviderProfileId: "",
	providerProfiles: [],
	enableRAG: false,
	enableTools: true,
	enableCitations: true,
	showTokenCount: false,
	showTimestamps: true,
	enableLaTeXPreview: true,
	maxSavedSessions: 100,
	maxContextTokens: 128000,
	maxAgentSteps: 5,
	autoApply: false,
	showProviderIndicator: true,
};

// ============================================================================
// ChatEngine
// ============================================================================

export class ChatEngine {
	private opts: ChatEngineOptions;
	private state: InternalState;
	private agentLoop: AgentLoop;
	private toolExecutor: ToolExecutor;
	private customTools: Map<string, ToolHandler> = new Map();
	private listeners = new Set<ChatEngineListener>();
	private pendingApprovals = new Map<string, PendingApproval>();
	private persistenceQueue: Promise<void> = Promise.resolve();
	private lastLoadReport: SessionLoadReport = {
		migratedSessionIds: [],
		recoveredSessionIds: [],
		skippedSessionIds: [],
	};
	private disposed = false;

	constructor(options: ChatEngineOptions) {
		this.opts = options;
		this.toolExecutor = new ToolExecutor();

		// Register tools from adapter if provided
		if (options.toolAdapter) {
			this.registerAdapterTools(options.toolAdapter);
		}

		this.agentLoop = new AgentLoop({
			llmAdapter: options.llmAdapter,
			toolExecutor: this.toolExecutor,
			maxSteps: options.agentLoopOptions?.maxSteps ?? 5,
			autoApply: options.agentLoopOptions?.autoApply ?? false,
			requestApproval: (call, signal) =>
				this.requestToolApproval(call, signal),
		});

		this.state = {
			sessions: [],
			activeSessionId: null,
			settings: { ...defaultSettings },
			isStreaming: false,
			abortController: null,
		};
	}

	// --------------------------------------------------------------------------
	// Session Management
	// --------------------------------------------------------------------------

	async loadSessions(): Promise<ChatSession[]> {
		await this.persistenceQueue;
		if (this.opts.persistenceAdapter) {
			const loaded = await this.opts.persistenceAdapter.loadSessions();
			const report: SessionLoadReport = {
				migratedSessionIds: [],
				recoveredSessionIds: [],
				skippedSessionIds: [],
			};
			const sessions: ChatSession[] = [];
			const seen = new Set<string>();
			for (const value of loaded) {
				const normalized = normalizePersistedSession(value);
				if (!normalized.session || seen.has(normalized.session.id)) {
					if (value?.id && typeof value.id === "string") {
						report.skippedSessionIds.push(value.id);
					}
					continue;
				}
				seen.add(normalized.session.id);
				sessions.push(normalized.session);
				if (normalized.migrated) {
					report.migratedSessionIds.push(normalized.session.id);
				}
				if (normalized.recovered) {
					report.recoveredSessionIds.push(normalized.session.id);
				}
			}
			this.state.sessions = sessions.sort((a, b) => b.updatedAt - a.updatedAt);
			this.lastLoadReport = report;
			if (
				this.state.activeSessionId === null ||
				!this.state.sessions.some((session) => session.id === this.state.activeSessionId)
			) {
				this.state.activeSessionId = this.state.sessions[0]?.id ?? null;
			}
			for (const session of this.state.sessions) {
				if (
					report.migratedSessionIds.includes(session.id) ||
					report.recoveredSessionIds.includes(session.id)
				) {
					await this.persistSession(session, {
						owner: "chat-engine",
						reason: "migration",
					});
				}
			}
		}
		this.emitState();
		return [...this.state.sessions];
	}

	getLastLoadReport(): SessionLoadReport {
		return {
			migratedSessionIds: [...this.lastLoadReport.migratedSessionIds],
			recoveredSessionIds: [...this.lastLoadReport.recoveredSessionIds],
			skippedSessionIds: [...this.lastLoadReport.skippedSessionIds],
		};
	}

	async saveSession(session?: ChatSession): Promise<void> {
		const target = session ?? this.getActiveSession();
		if (!target || !this.opts.persistenceAdapter) return;
		await this.persistSession(target, { owner: "chat-engine", reason: "manual" });
	}

	createSession(
		title?: string,
		externalIdentity?: ExternalSessionIdentity,
	): ChatSession {
		if (this.state.isStreaming) this.stopStreaming();
		const session: ChatSession = {
			id: createSessionId(),
			title: title ?? "Untitled Chat",
			createdAt: Date.now(),
			updatedAt: Date.now(),
			messages: [],
			persistence: createSessionPersistenceMetadata(),
			turns: [],
			modelHistory: [],
			...(externalIdentity ? { externalIdentity } : {}),
			llmProvider: this.opts.llmAdapter.getProviders()[0]?.id,
		};

		this.state.sessions.unshift(session);
		this.state.activeSessionId = session.id;
		this.emitState();
		void this.persistSession(session, {
			owner: "chat-engine",
			reason: "create",
		}).catch(() => undefined);
		return session;
	}

	switchSession(sessionId: string): boolean {
		const session = this.state.sessions.find((s) => s.id === sessionId);
		if (!session) return false;
		if (this.state.isStreaming) this.stopStreaming();
		else this.cancelPendingApprovals();
		this.state.activeSessionId = sessionId;
		this.emitState();
		return true;
	}

	getActiveSession(): ChatSession | null {
		if (!this.state.activeSessionId) return null;
		return (
			this.state.sessions.find((s) => s.id === this.state.activeSessionId) ??
			null
		);
	}

	async deleteSession(sessionId: string): Promise<void> {
		if (this.opts.persistenceAdapter) {
			await this.enqueuePersistence(() =>
				this.opts.persistenceAdapter!.deleteSession(sessionId),
			);
		}
		this.state.sessions = this.state.sessions.filter(
			(s) => s.id !== sessionId,
		);
		if (this.state.activeSessionId === sessionId) {
			this.state.activeSessionId =
				this.state.sessions[0]?.id ?? null;
		}
		this.emitState();
	}

	async archiveSession(sessionId: string): Promise<void> {
		if (this.opts.persistenceAdapter) {
			await this.enqueuePersistence(() =>
				this.opts.persistenceAdapter!.archiveSession(sessionId),
			);
		}
		const session = this.state.sessions.find((s) => s.id === sessionId);
		if (session) {
			session.archived = true;
			session.updatedAt = Date.now();
		}
		this.emitState();
	}

	getSessions(): ChatSession[] {
		return [...this.state.sessions];
	}

	// --------------------------------------------------------------------------
	// Messaging
	// --------------------------------------------------------------------------

	/**
	 * Send a message and receive streaming events.
	 *
	 * Yields text-deltas, tool-calls, tool-results, and finish events.
	 * Callers should handle UI updates based on event types.
	 */
	async *sendMessage(
		text: string,
		options?: SendOptions,
	): AsyncIterable<StreamEvent> {
		if (this.disposed) {
			yield { type: "error", message: "ChatEngine has been disposed" };
			return;
		}
		if (this.state.isStreaming) {
			yield { type: "error", message: "A response is already streaming" };
			return;
		}
		const session = this.getActiveSession();
		if (!session) {
			yield { type: "error", message: "No active session" };
			return;
		}

		const priorModelHistory = this.getModelHistory(session);
		const userMessage: ChatMessage = {
			id: `msg-${Date.now()}`,
			role: "user",
			content: text,
			timestamp: Date.now(),
		};
		const userModelMessage: ChatModelMessage = {
			role: "user",
			content: text,
		};
		const turn = createTurn(userMessage, [userModelMessage]);
		turn.assistantMessageId = `assistant-${turn.id}`;
		session.turns = [...(session.turns ?? []), turn];
		session.modelHistory = [...priorModelHistory, userModelMessage];

		const messages: ChatMessage[] = [
			...(this.opts.systemPrompt
				? [
						{
							id: "system",
							role: "system" as const,
							content: this.opts.systemPrompt,
							timestamp: 0,
						},
					]
				: []),
			...priorModelHistory.map((message, index) => ({
				id: `history-${session.id}-${index}`,
				role: message.role as ChatMessage["role"],
				content: message.content,
				timestamp: 0,
			})),
			userMessage,
		];

		// The engine is the only write owner. Persist the user input before
		// provider work starts so a reload cannot lose the submitted turn.
		session.messages.push(userMessage);
		await this.persistSession(session, {
			owner: "chat-engine",
			reason: "user-message",
			turnId: turn.id,
		});

		// Setup abort
		this.state.abortController = new AbortController();
		const signal = this.state.abortController.signal;
		this.state.isStreaming = true;
		this.emitState();

		// Get tools
		const tools = this.getAvailableTools();
		const enableTools = options?.enableTools ?? this.state.settings.enableTools;

		try {
			if (enableTools && tools.length > 0) {
				// Use AgentLoop for tool-capable streaming
				yield* this.runWithTools(
					session,
					messages,
					tools,
					signal,
					turn,
					priorModelHistory.length,
					options,
				);
			} else {
				// Simple text streaming (no tools)
				yield* this.runTextOnly(
					session,
					messages,
					signal,
					turn,
					priorModelHistory,
					options,
				);
			}
		} finally {
			this.cancelPendingApprovals();
			this.state.isStreaming = false;
			this.state.abortController = null;
			this.emitState();
		}
	}

	/**
	 * Stop the current streaming response.
	 */
	stopStreaming(): void {
		if (this.state.abortController) {
			this.state.abortController.abort();
			this.state.abortController = null;
		}
		this.cancelPendingApprovals();
		this.state.isStreaming = false;
		this.emitState();
	}

	/**
	 * Check if currently streaming.
	 */
	get isStreaming(): boolean {
		return this.state.isStreaming;
	}

	getSnapshot(): ChatEngineSnapshot {
		return {
			sessions: [...this.state.sessions],
			activeSessionId: this.state.activeSessionId,
			isStreaming: this.state.isStreaming,
			pendingApprovals: [...this.pendingApprovals.values()].map(
				({ call }) => call,
			),
		};
	}

	subscribe(listener: ChatEngineListener): () => void {
		if (this.disposed) return () => undefined;
		this.listeners.add(listener);
		listener(this.getSnapshot());
		return () => this.listeners.delete(listener);
	}

	approveTool(callId: string): boolean {
		return this.resolveApproval(callId, true);
	}

	rejectTool(callId: string): boolean {
		return this.resolveApproval(callId, false);
	}

	cancelTool(callId: string): boolean {
		return this.resolveApproval(callId, false);
	}

	dispose(): void {
		if (this.disposed) return;
		this.stopStreaming();
		this.disposed = true;
		this.listeners.clear();
	}

	// --------------------------------------------------------------------------
	// Tool Management
	// --------------------------------------------------------------------------

	/**
	 * Register a custom tool handler.
	 */
	registerTool(name: string, handler: ToolHandler): void {
		this.customTools.set(name, handler);
		this.toolExecutor.register(name, handler);
	}

	/**
	 * Get all available tool definitions (from adapter + custom).
	 */
	getAvailableTools(): ToolDefinition[] {
		const adapterTools = this.opts.toolAdapter?.getAvailableTools() ?? [];
		const customToolDefs: ToolDefinition[] = [];

		// Custom tools need to be registered with definitions too
		// For now, custom tools registered at runtime need manual definition
		// In practice, callers should provide ToolDefinition[] alongside registerTool

		return [...adapterTools, ...customToolDefs];
	}

	/**
	 * Execute a tool call directly (for manual/testing use).
	 */
	async executeTool(call: ToolCall): Promise<ToolResult> {
		return this.toolExecutor.execute(call);
	}

	// --------------------------------------------------------------------------
	// Settings
	// --------------------------------------------------------------------------

	updateSettings(settings: Partial<ChatSettings>): void {
		this.state.settings = { ...this.state.settings, ...settings };
		this.emitState();
	}

	getSettings(): ChatSettings {
		return { ...this.state.settings };
	}

	// --------------------------------------------------------------------------
	// Internal Streaming Implementations
	// --------------------------------------------------------------------------

	private async *runWithTools(
		session: ChatSession,
		messages: ChatMessage[],
		tools: ToolDefinition[],
		signal: AbortSignal,
		turn: ChatTurn,
		priorModelHistoryLength: number,
		_options?: SendOptions,
	): AsyncIterable<StreamEvent> {
		let assistantText = "";
		const assistantMessageId = turn.assistantMessageId ?? `assistant-${turn.id}`;
		const startTime = performance.now();
		let firstChunkTime: number | null = null;

		const generator = this.agentLoop.run(session, messages, tools, signal);
		let result: AgentLoopResult | undefined;

		try {
			while (true) {
				const { value, done } = await generator.next();
				if (done) {
					result = value;
					break;
				}

				// Track first chunk for metrics
				if (value.type === "text-delta" && firstChunkTime === null) {
					firstChunkTime = performance.now();
				}

				// Accumulate assistant text
				if (value.type === "text-delta") {
					assistantText += value.text;
					this.updateAssistantMessage(session, turn, assistantMessageId, assistantText, "streaming");
					await this.persistSession(session, {
						owner: "chat-engine",
						reason: "partial-output",
						turnId: turn.id,
					});
				} else if (value.type === "tool-call") {
					turn.toolCalls.push({ ...value.call, args: { ...value.call.args } });
					turn.updatedAt = Date.now();
					await this.persistSession(session, {
						owner: "chat-engine",
						reason: "tool-call",
						turnId: turn.id,
					});
				} else if (value.type === "tool-result") {
					turn.toolResults[value.callId] = { ...value.result };
					turn.updatedAt = Date.now();
					await this.persistSession(session, {
						owner: "chat-engine",
						reason: "tool-result",
						turnId: turn.id,
					});
				}

				// Forward event immediately for real-time streaming
				yield value;
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			turn.status = signal.aborted ? "cancelled" : "failed";
			turn.error = signal.aborted ? undefined : message;
			turn.updatedAt = Date.now();
			if (assistantText) {
				this.updateAssistantMessage(
					session,
					turn,
					assistantMessageId,
					assistantText,
					turn.status,
				);
			}
			await this.persistSession(session, {
				owner: "chat-engine",
				reason: signal.aborted ? "turn-cancelled" : "turn-failed",
				turnId: turn.id,
			});
			yield { type: "error", message };
			return;
		}

		const totalDurationMs = Math.round(performance.now() - startTime);
		const ttftMs = firstChunkTime
			? Math.round(firstChunkTime - startTime)
			: totalDurationMs;

		if (result && !signal.aborted) {
			const modelHistory = result.modelMessages
				? this.withoutSystemMessages(result.modelMessages)
				: [
						...(session.modelHistory ?? []),
						{ role: "assistant", content: result.text },
					];
			const generatedMessages = modelHistory.slice(priorModelHistoryLength);
			session.modelHistory = modelHistory;
			turn.modelMessages = generatedMessages;
			turn.status = "completed";
			turn.updatedAt = Date.now();
			this.updateAssistantMessage(session, turn, assistantMessageId, assistantText, "completed");
			// Yield metrics
			yield {
				type: "usage",
				promptTokens: 0,
				completionTokens: result.tokenEstimate,
				totalTokens: result.tokenEstimate,
			};
			yield { type: "metrics", ttftMs, totalDurationMs };

			const assistantMessage = session.messages.find(
				(message) => message.id === assistantMessageId,
			);
			if (assistantMessage) assistantMessage.tokenCount = result.tokenEstimate;
			await this.persistSession(session, {
				owner: "chat-engine",
				reason: "turn-complete",
				turnId: turn.id,
			});
		} else if (result && signal.aborted) {
			turn.status = "cancelled";
			turn.updatedAt = Date.now();
			if (assistantText) {
				this.updateAssistantMessage(session, turn, assistantMessageId, assistantText, "cancelled");
			}
			await this.persistSession(session, {
				owner: "chat-engine",
				reason: "turn-cancelled",
				turnId: turn.id,
			});
		}

		if (!signal.aborted) {
			yield { type: "finish", reason: "complete" };
		}
	}

	private async *runTextOnly(
		session: ChatSession,
		messages: ChatMessage[],
		signal: AbortSignal,
		turn: ChatTurn,
		priorModelHistory: ChatModelMessage[],
		_options?: SendOptions,
	): AsyncIterable<StreamEvent> {
		const adapterMessages = messages.map((m) => ({
			role: m.role,
			content: m.content,
		}));

		let assistantText = "";
		const assistantMessageId = turn.assistantMessageId ?? `assistant-${turn.id}`;
		const startTime = performance.now();
		let firstChunkTime: number | null = null;
		let chunkCount = 0;

		try {
			for await (const chunk of this.opts.llmAdapter.streamChat(
				adapterMessages,
				signal,
			)) {
				if (signal.aborted) break;
				if (chunkCount === 0) {
					firstChunkTime = performance.now();
				}
				chunkCount++;
				assistantText += chunk;
				this.updateAssistantMessage(session, turn, assistantMessageId, assistantText, "streaming");
				await this.persistSession(session, {
					owner: "chat-engine",
					reason: "partial-output",
					turnId: turn.id,
				});
				yield { type: "text-delta", text: chunk };
			}

			if (signal.aborted) {
				turn.status = "cancelled";
				turn.updatedAt = Date.now();
				if (assistantText) {
					this.updateAssistantMessage(
						session,
						turn,
						assistantMessageId,
						assistantText,
						"cancelled",
					);
				}
				await this.persistSession(session, {
					owner: "chat-engine",
					reason: "turn-cancelled",
					turnId: turn.id,
				});
				return;
			}

			const totalDurationMs = Math.round(performance.now() - startTime);
			const ttftMs = firstChunkTime
				? Math.round(firstChunkTime - startTime)
				: totalDurationMs;
			const tokenEstimate = Math.ceil(assistantText.length / 4);

			// Yield metrics
			yield {
				type: "usage",
				promptTokens: 0,
				completionTokens: tokenEstimate,
				totalTokens: tokenEstimate,
			};
			yield { type: "metrics", ttftMs, totalDurationMs };

			const assistantModelMessage: ChatModelMessage = {
				role: "assistant",
				content: assistantText,
			};
			const userModelMessage = turn.modelMessages[0] ?? {
				role: "user",
				content: "",
			};
			session.modelHistory = [
				...priorModelHistory,
				userModelMessage,
				assistantModelMessage,
			];
			turn.modelMessages = [
				...turn.modelMessages,
				assistantModelMessage,
			];
			turn.status = "completed";
			turn.updatedAt = Date.now();
			this.updateAssistantMessage(session, turn, assistantMessageId, assistantText, "completed");
			const assistantMessage = session.messages.find(
				(message) => message.id === assistantMessageId,
			);
			if (assistantMessage) assistantMessage.tokenCount = tokenEstimate;
			await this.persistSession(session, {
				owner: "chat-engine",
				reason: "turn-complete",
				turnId: turn.id,
			});

			if (!signal.aborted) {
				yield { type: "finish", reason: "complete" };
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			turn.status = signal.aborted ? "cancelled" : "failed";
			turn.error = signal.aborted ? undefined : message;
			turn.updatedAt = Date.now();
			if (assistantText) {
				this.updateAssistantMessage(
					session,
					turn,
					assistantMessageId,
					assistantText,
					turn.status,
				);
			}
			await this.persistSession(session, {
				owner: "chat-engine",
				reason: signal.aborted ? "turn-cancelled" : "turn-failed",
				turnId: turn.id,
			});
			yield { type: "error", message };
		}
	}

	// --------------------------------------------------------------------------
	// Helpers
	// --------------------------------------------------------------------------

	private getModelHistory(session: ChatSession): ChatModelMessage[] {
		if (session.modelHistory) {
			return this.withoutSystemMessages(session.modelHistory);
		}
		return session.messages
			.filter((message) => message.role !== "system")
			.map(({ role, content }) => ({ role, content }));
	}

	private withoutSystemMessages(
		messages: ChatModelMessage[],
	): ChatModelMessage[] {
		return messages
			.filter((message) => message.role !== "system")
			.map(({ role, content }) => ({ role, content }));
	}

	private updateAssistantMessage(
		session: ChatSession,
		turn: ChatTurn,
		messageId: string,
		content: string,
		status: ChatMessage["status"],
	): void {
		const existing = session.messages.find((message) => message.id === messageId);
		if (existing) {
			existing.content = content;
			existing.status = status;
			existing.turnId = turn.id;
			return;
		}
		session.messages.push({
			id: messageId,
			role: "assistant",
			content,
			timestamp: Date.now(),
			status,
			turnId: turn.id,
		});
	}

	private async persistSession(
		session: ChatSession,
		context: SessionWriteContext,
	): Promise<void> {
		if (!this.opts.persistenceAdapter) return;

		const updated = cloneSession({
			...session,
			updatedAt: Date.now(),
			persistence: {
				...(session.persistence ?? createSessionPersistenceMetadata()),
				schemaVersion: 1,
			},
		});
		await this.enqueuePersistence(() =>
			this.opts.persistenceAdapter!.saveSession(updated, context),
		);

		// Keep the live object and its nested turn/message arrays used by the
		// current generator. The adapter only ever receives the clone above, so
		// later mutations cannot rewrite a previously queued snapshot.
		session.updatedAt = updated.updatedAt;
		session.persistence = updated.persistence;
		const index = this.state.sessions.findIndex((item) => item.id === session.id);
		if (index >= 0) this.state.sessions[index] = session;
		else this.state.sessions.unshift(session);
		this.emitState();
	}

	private enqueuePersistence(work: () => Promise<void>): Promise<void> {
		const next = this.persistenceQueue.then(work, work);
		this.persistenceQueue = next.catch(() => undefined);
		return next;
	}

	private registerAdapterTools(adapter: ToolAdapter): void {
		const tools = adapter.getAvailableTools();
		for (const tool of tools) {
			this.toolExecutor.register(tool.name, (args: unknown) =>
				adapter.executeTool({
					id: `tool-${Date.now()}`,
					name: tool.name,
					args: args as Record<string, unknown>,
				}),
			);
		}
	}

	private requestToolApproval(
		call: ToolCall,
		signal?: AbortSignal,
	): Promise<boolean> {
		if (this.disposed || signal?.aborted) return Promise.resolve(false);
		if (this.pendingApprovals.has(call.id)) return Promise.resolve(false);

		return new Promise<boolean>((resolve) => {
			const pending: PendingApproval = { call, resolve };
			if (signal) {
				const onAbort = () => this.resolveApproval(call.id, false);
				signal.addEventListener("abort", onAbort, { once: true });
				pending.removeAbortListener = () =>
					signal.removeEventListener("abort", onAbort);
			}
			this.pendingApprovals.set(call.id, pending);
			this.emitState();
		});
	}

	private resolveApproval(callId: string, approved: boolean): boolean {
		const pending = this.pendingApprovals.get(callId);
		if (!pending) return false;
		this.pendingApprovals.delete(callId);
		pending.removeAbortListener?.();
		pending.resolve(approved);
		this.emitState();
		return true;
	}

	private cancelPendingApprovals(): void {
		for (const callId of [...this.pendingApprovals.keys()]) {
			this.resolveApproval(callId, false);
		}
	}

	private emitState(): void {
		if (this.disposed) return;
		const snapshot = this.getSnapshot();
		for (const listener of this.listeners) listener(snapshot);
	}
}
