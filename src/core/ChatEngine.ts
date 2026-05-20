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
	ChatMessage,
	ChatSession,
	ChatSettings,
	SendOptions,
	StreamEvent,
	ToolAdapter,
	ToolCall,
	ToolDefinition,
	ToolHandler,
	ToolResult,
} from "./types";

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
		if (this.opts.persistenceAdapter) {
			this.state.sessions = await this.opts.persistenceAdapter.loadSessions();
		}
		return [...this.state.sessions];
	}

	async saveSession(session?: ChatSession): Promise<void> {
		const target = session ?? this.getActiveSession();
		if (!target || !this.opts.persistenceAdapter) return;

		const updated = {
			...target,
			updatedAt: Date.now(),
		};

		await this.opts.persistenceAdapter.saveSession(updated);

		// Update in-memory list
		const idx = this.state.sessions.findIndex((s) => s.id === updated.id);
		if (idx >= 0) {
			this.state.sessions[idx] = updated;
		} else {
			this.state.sessions.unshift(updated);
		}
	}

	createSession(title?: string): ChatSession {
		const session: ChatSession = {
			id: `sess-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
			title: title ?? "Untitled Chat",
			createdAt: Date.now(),
			updatedAt: Date.now(),
			messages: [],
			llmProvider: this.opts.llmAdapter.getProviders()[0]?.id,
		};

		this.state.sessions.unshift(session);
		this.state.activeSessionId = session.id;
		return session;
	}

	switchSession(sessionId: string): boolean {
		const session = this.state.sessions.find((s) => s.id === sessionId);
		if (!session) return false;
		this.state.activeSessionId = sessionId;
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
		this.state.sessions = this.state.sessions.filter(
			(s) => s.id !== sessionId,
		);
		if (this.state.activeSessionId === sessionId) {
			this.state.activeSessionId =
				this.state.sessions[0]?.id ?? null;
		}
		if (this.opts.persistenceAdapter) {
			await this.opts.persistenceAdapter.deleteSession(sessionId);
		}
	}

	async archiveSession(sessionId: string): Promise<void> {
		const session = this.state.sessions.find((s) => s.id === sessionId);
		if (session) {
			session.archived = true;
			session.updatedAt = Date.now();
		}
		if (this.opts.persistenceAdapter) {
			await this.opts.persistenceAdapter.archiveSession(sessionId);
		}
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
		const session = this.getActiveSession();
		if (!session) {
			yield { type: "error", message: "No active session" };
			return;
		}

		// Build message list
		const userMessage: ChatMessage = {
			id: `msg-${Date.now()}`,
			role: "user",
			content: text,
			timestamp: Date.now(),
		};

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
			...session.messages,
			userMessage,
		];

		// Save user message
		session.messages.push(userMessage);
		await this.saveSession(session);

		// Setup abort
		this.state.abortController = new AbortController();
		const signal = this.state.abortController.signal;
		this.state.isStreaming = true;

		// Get tools
		const tools = this.getAvailableTools();
		const enableTools = options?.enableTools ?? this.state.settings.enableTools;

		try {
			if (enableTools && tools.length > 0) {
				// Use AgentLoop for tool-capable streaming
				yield* this.runWithTools(session, messages, tools, signal, options);
			} else {
				// Simple text streaming (no tools)
				yield* this.runTextOnly(session, messages, signal, options);
			}
		} finally {
			this.state.isStreaming = false;
			this.state.abortController = null;
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
		this.state.isStreaming = false;
	}

	/**
	 * Check if currently streaming.
	 */
	get isStreaming(): boolean {
		return this.state.isStreaming;
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
		_options?: SendOptions,
	): AsyncIterable<StreamEvent> {
		let assistantText = "";
		let assistantMessageId = `assistant-${Date.now()}`;
		const startTime = performance.now();
		let firstChunkTime: number | null = null;

		// Collect tool events from AgentLoop callbacks to yield them in real-time
		const toolEvents: Array<{ type: "tool-call"; call: ToolCall } | { type: "tool-result"; callId: string; result: ToolResult }> = [];

		const result = await this.agentLoop.run(session, messages, tools, signal, {
			onTextDelta: (_text) => {
				if (firstChunkTime === null) {
					firstChunkTime = performance.now();
				}
			},
			onToolCall: (call) => {
				toolEvents.push({ type: "tool-call", call });
			},
			onToolResult: (call, result) => {
				toolEvents.push({ type: "tool-result", callId: call.id, result });
			},
		});

		const totalDurationMs = Math.round(performance.now() - startTime);
		const ttftMs = firstChunkTime ? Math.round(firstChunkTime - startTime) : totalDurationMs;

		// Yield all collected tool events
		for (const event of toolEvents) {
			if (event.type === "tool-call") {
				yield { type: "tool-call", call: event.call };
			} else {
				yield { type: "tool-result", callId: event.callId, result: event.result };
			}
		}

		if (result.text) {
			assistantText = result.text;
			yield { type: "text-delta", text: result.text };
		}

		// Yield metrics
		yield { type: "usage", promptTokens: 0, completionTokens: result.tokenEstimate, totalTokens: result.tokenEstimate };
		yield { type: "metrics", ttftMs, totalDurationMs };

		// Save assistant message
		const assistantMessage: ChatMessage = {
			id: assistantMessageId,
			role: "assistant",
			content: assistantText,
			timestamp: Date.now(),
			tokenCount: result.tokenEstimate,
		};
		session.messages.push(assistantMessage);
		await this.saveSession(session);

		yield { type: "finish", reason: "complete" };
	}

	private async *runTextOnly(
		session: ChatSession,
		messages: ChatMessage[],
		signal: AbortSignal,
		_options?: SendOptions,
	): AsyncIterable<StreamEvent> {
		const adapterMessages = messages.map((m) => ({
			role: m.role,
			content: m.content,
		}));

		let assistantText = "";
		const assistantMessageId = `assistant-${Date.now()}`;
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
				yield { type: "text-delta", text: chunk };
			}

			const totalDurationMs = Math.round(performance.now() - startTime);
			const ttftMs = firstChunkTime ? Math.round(firstChunkTime - startTime) : totalDurationMs;
			const tokenEstimate = Math.ceil(assistantText.length / 4);

			// Yield metrics
			yield { type: "usage", promptTokens: 0, completionTokens: tokenEstimate, totalTokens: tokenEstimate };
			yield { type: "metrics", ttftMs, totalDurationMs };

			// Save assistant message
			const assistantMessage: ChatMessage = {
				id: assistantMessageId,
				role: "assistant",
				content: assistantText,
				timestamp: Date.now(),
				tokenCount: tokenEstimate,
			};
			session.messages.push(assistantMessage);
			await this.saveSession(session);

			if (!signal.aborted) {
				yield { type: "finish", reason: "complete" };
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			yield { type: "error", message };
		}
	}

	// --------------------------------------------------------------------------
	// Helpers
	// --------------------------------------------------------------------------

	private registerAdapterTools(adapter: ToolAdapter): void {
		const tools = adapter.getAvailableTools();
		for (const tool of tools) {
			this.toolExecutor.register(tool.name, (args: unknown) =>
				adapter.executeTool({ id: `tool-${Date.now()}`, name: tool.name, args: args as Record<string, unknown> }),
			);
		}
	}
}
