import { T as ToolAdapter, u as ToolHandler, t as ToolDefinition, s as ToolCall, v as ToolResult, L as LLMAdapter, g as ChatSession, f as ChatMessage, o as ProviderProfile, r as StreamEvent, n as ProviderInfo, m as ModelInfo, p as ProviderType, P as PersistenceAdapter } from './ChatEngine-CBYcBxdj.cjs';
export { A as AgentEngine, a as AgentLoopOptions, b as AgentResponse, c as ApprovalQueue, d as ApprovalQueueState, C as ChatEngine, e as ChatEngineOptions, h as ChatSettings, i as ContextAdapter, j as ContextItem, M as Mention, k as MentionParseResult, l as MessageRole, O as OrchestratorOptions, Q as QueryAnalysisResult, R as RAGAdapter, q as RetrievedPaper, S as SendOptions } from './ChatEngine-CBYcBxdj.cjs';

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

interface ToolExecutorOptions {
    adapter?: ToolAdapter;
}
declare class ToolExecutor {
    private handlers;
    private adapter?;
    constructor(opts?: ToolExecutorOptions);
    /** Dynamically register a handler for a tool name. */
    register<T>(name: string, handler: ToolHandler<T>): void;
    /** Get all available tool definitions from the adapter. */
    getAvailableTools(): ToolDefinition[];
    /** Execute a single tool call. */
    execute(call: ToolCall): Promise<ToolResult>;
    /** Execute multiple tool calls in parallel. */
    executeBatch(calls: ToolCall[]): Promise<ToolResult[]>;
    private serializeResult;
}

/**
 * AgentLoop — Manual multi-step tool calling loop.
 *
 * Mirrors obsidian-ai's proven implementation but stays framework-agnostic.
 * Uses callbacks (not pure async generator) because approval requires UI
 * interaction mid-stream.
 *
 * Each call to run() performs up to maxSteps iterations of:
 *   1. Stream LLM response with tools (single step via stopWhen)
 *   2. Detect tool calls from the stream
 *   3. Execute tool (auto-approved or via user confirmation)
 *   4. Feed tool result back into conversation
 *   5. Repeat until no more tool calls or maxSteps reached
 */

interface AgentLoopOptions {
    llmAdapter: LLMAdapter;
    toolExecutor?: ToolExecutor;
    maxSteps?: number;
    autoApply?: boolean;
    /** Called with accumulated text whenever a text-delta arrives. */
    onTextDelta?: (accumulatedText: string) => void;
    /** Called when a tool call is detected (before execution/approval). */
    onToolCall?: (call: ToolCall) => void;
    /** Called when a tool result is available (after execution/approval). */
    onToolResult?: (call: ToolCall, result: ToolResult) => void;
    /** Called to request user approval. Return result to approve, null to reject. */
    requestApproval?: (call: ToolCall) => Promise<ToolResult | null>;
}
interface AgentLoopResult {
    text: string;
    stepsTaken: number;
}
/**
 * Default tool result formatter — serializes to JSON.
 * Override per-tool by providing a custom formatter.
 */
type ToolResultFormatter = (toolName: string, result: ToolResult) => string;
declare class AgentLoop {
    private opts;
    private formatResult;
    constructor(opts: AgentLoopOptions, formatResult?: ToolResultFormatter);
    /**
     * Runs the agent loop with the given initial messages and tools.
     *
     * @param session - Chat session (for metadata)
     * @param messages - Conversation messages (system + history + user)
     * @param tools - Tool definitions to make available to the LLM
     * @param signal - AbortSignal for cancellation
     * @returns Final accumulated text and metadata
     */
    run(session: ChatSession, messages: ChatMessage[], tools: ToolDefinition[], signal?: AbortSignal): Promise<AgentLoopResult>;
}

/**
 * VercelLLMAdapter — Bridges super-chat's LLMAdapter interface to Vercel AI SDK v6.
 *
 * Supports 9 providers via AI SDK's unified provider architecture.
 * Uses streamText with stopWhen: stepCountIs(1) for single-step streaming,
 * enabling the manual AgentLoop to control multi-step execution.
 */

interface VercelLLMAdapterOptions {
    profile: ProviderProfile;
    systemPrompt?: string;
}
declare class VercelLLMAdapter implements LLMAdapter {
    private profile;
    private systemPrompt?;
    private providerInstance?;
    constructor(opts: VercelLLMAdapterOptions);
    private getProvider;
    streamChat(messages: Array<{
        role: string;
        content: string;
    }>, signal?: AbortSignal): AsyncIterable<string>;
    streamChatWithTools(messages: Array<{
        role: string;
        content: string;
    }>, tools: ToolDefinition[], signal?: AbortSignal): AsyncIterable<StreamEvent>;
    getProviders(): ProviderInfo[];
    getModels(_provider: string): ModelInfo[];
    testConnection(): Promise<{
        ok: boolean;
        message: string;
    }>;
    /**
     * Convert simple {role, content} messages to UIMessage format for v6 SDK.
     */
    private toUIMessages;
    private providerDisplayName;
    /**
     * Converts super-chat ToolDefinition[] to AI SDK tool objects.
     */
    private buildSdkTools;
    private buildZodSchema;
    private jsonSchemaToZod;
    /**
     * Convert AI SDK stream chunk to super-chat StreamEvent.
     */
    private convertChunk;
}
declare function createProviderProfile(provider: ProviderType, model: string, apiKey: string, options?: {
    baseUrl?: string;
    name?: string;
    models?: ModelInfo[];
}): ProviderProfile;

/**
 * MemoryPersistenceAdapter — In-memory session storage for testing.
 *
 * Stores sessions in a Map, lost on page refresh. Useful for:
 * - Unit tests (no localStorage mocking needed)
 * - Demo apps (no persistence needed)
 * - Development (quick reset by refreshing)
 */

declare class MemoryPersistenceAdapter implements PersistenceAdapter {
    private sessions;
    loadSessions(): Promise<ChatSession[]>;
    saveSession(session: ChatSession): Promise<void>;
    deleteSession(sessionId: string): Promise<void>;
    archiveSession(sessionId: string): Promise<void>;
    /** Clear all sessions (useful for testing) */
    clear(): void;
    /** Get count of stored sessions */
    getCount(): number;
}

/**
 * LocalStoragePersistenceAdapter — Browser localStorage session persistence.
 *
 * Stores sessions as JSON in localStorage. Keys:
 * - `super-chat:sessions` — array of session IDs
 * - `super-chat:session:{id}` — individual session JSON
 *
 * Handles serialization/deserialization, quota errors, and migration.
 */

declare class LocalStoragePersistenceAdapter implements PersistenceAdapter {
    private maxSessions;
    constructor(options?: {
        maxSessions?: number;
    });
    loadSessions(): Promise<ChatSession[]>;
    saveSession(session: ChatSession): Promise<void>;
    deleteSession(sessionId: string): Promise<void>;
    archiveSession(sessionId: string): Promise<void>;
    private isQuotaError;
    private evictOldestSessions;
}

/**
 * DemoToolAdapter — Mock tools for testing the tool-calling pipeline.
 *
 * Provides 4 mock tools that work offline (no API keys needed):
 * - calculate: Simple arithmetic
 * - search_web: Simulated web search
 * - get_weather: Mock weather data
 * - fetch_arxiv: Mock arXiv paper retrieval
 *
 * Useful for testing AgentLoop, ToolExecutor, and UI components
 * without real API calls.
 */

declare class DemoToolAdapter implements ToolAdapter {
    private tools;
    getAvailableTools(): ToolDefinition[];
    executeTool(call: ToolCall): Promise<ToolResult>;
    private handleCalculate;
    private handleSearchWeb;
    private handleGetWeather;
    private handleFetchArxiv;
    private simpleHash;
}

export { AgentLoop, type AgentLoopResult, type AgentLoopOptions as AgentLoopRunOptions, ChatMessage, ChatSession, DemoToolAdapter, LLMAdapter, LocalStoragePersistenceAdapter, MemoryPersistenceAdapter, ModelInfo, PersistenceAdapter, ProviderInfo, ProviderProfile, ProviderType, StreamEvent, ToolAdapter, ToolCall, ToolDefinition, ToolExecutor, ToolHandler, ToolResult, type ToolResultFormatter, VercelLLMAdapter, createProviderProfile };
