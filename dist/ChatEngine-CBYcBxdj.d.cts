/**
 * Core types for super-chat
 * Framework-agnostic type definitions used throughout the library
 */
type MessageRole = 'user' | 'assistant' | 'system';
interface ChatMessage {
    id: string;
    role: MessageRole;
    content: string;
    timestamp: number;
    citations?: RetrievedPaper[];
    toolCalls?: ToolCall[];
    toolResults?: ToolResult[];
    tokenCount?: number;
    metadata?: Record<string, unknown>;
}
interface ChatSession {
    id: string;
    title: string;
    createdAt: number;
    updatedAt: number;
    messages: ChatMessage[];
    llmProvider?: string;
    llmModel?: string;
    archived?: boolean;
    metadata?: Record<string, unknown>;
}
interface ToolCall {
    id: string;
    name: string;
    args: Record<string, unknown>;
}
interface ToolResult {
    success?: boolean;
    content?: string;
    error?: string;
    path?: string;
}
interface ToolDefinition {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
}
interface RetrievedPaper {
    id: string;
    title: string;
    authors: string[];
    year: number;
    url: string;
    snippet: string;
    abstract?: string;
}
interface QueryAnalysisResult {
    intent: string;
    keywords: string[];
    requiresRetrieval: boolean;
}
interface ContextItem {
    id: string;
    type: 'note' | 'selection' | 'active-document' | 'embed';
    name: string;
    content: string;
    path?: string;
}
type StreamEvent = {
    type: 'text-delta';
    text: string;
} | {
    type: 'tool-call';
    call: ToolCall;
} | {
    type: 'tool-result';
    callId: string;
    result: ToolResult;
} | {
    type: 'tool-error';
    callId: string;
    error: string;
} | {
    type: 'pending-approval';
    call: ToolCall;
} | {
    type: 'citation';
    papers: RetrievedPaper[];
} | {
    type: 'rag-status';
    status: string;
    progress?: number;
} | {
    type: 'step-finish';
    step: number;
} | {
    type: 'finish';
    reason: string;
} | {
    type: 'error';
    message: string;
};
interface SendOptions {
    provider?: string;
    model?: string;
    enableRAG?: boolean;
    enableTools?: boolean;
    maxSteps?: number;
    signal?: AbortSignal;
}
interface AgentLoopOptions {
    maxSteps?: number;
    autoApply?: boolean;
}
interface ChatEngineOptions {
    llmAdapter: LLMAdapter;
    persistenceAdapter?: PersistenceAdapter;
    ragAdapter?: RAGAdapter;
    toolAdapter?: ToolAdapter;
    contextAdapter?: ContextAdapter;
    systemPrompt?: string;
    agentLoopOptions?: AgentLoopOptions;
}
type ProviderType = 'openai' | 'anthropic' | 'google' | 'azure' | 'ollama' | 'openrouter' | 'deepseek' | 'kimi' | 'custom';
interface ProviderInfo {
    id: string;
    name: string;
}
interface ModelInfo {
    id: string;
    name: string;
    contextWindow: number;
}
interface ProviderProfile {
    id: string;
    name: string;
    provider: ProviderType;
    model: string;
    apiKey?: string;
    baseUrl?: string;
    azureEndpoint?: string;
    azureApiVersion?: string;
    models: ModelInfo[];
    createdAt: number;
    updatedAt: number;
}
interface ChatSettings {
    activeProviderProfileId: string;
    providerProfiles: ProviderProfile[];
    enableRAG: boolean;
    enableTools: boolean;
    enableCitations: boolean;
    showTokenCount: boolean;
    showTimestamps: boolean;
    enableLaTeXPreview: boolean;
    maxSavedSessions: number;
    maxContextTokens: number;
    maxAgentSteps: number;
    autoApply: boolean;
    showProviderIndicator: boolean;
}
interface LLMAdapter {
    streamChat(messages: {
        role: string;
        content: string;
    }[], signal?: AbortSignal): AsyncIterable<string>;
    streamChatWithTools(messages: {
        role: string;
        content: string;
    }[], tools: ToolDefinition[], signal?: AbortSignal): AsyncIterable<StreamEvent>;
    getProviders(): ProviderInfo[];
    getModels(provider: string): ModelInfo[];
    testConnection(): Promise<{
        ok: boolean;
        message: string;
    }>;
}
interface PersistenceAdapter {
    loadSessions(): Promise<ChatSession[]>;
    saveSession(session: ChatSession): Promise<void>;
    deleteSession(sessionId: string): Promise<void>;
    archiveSession(sessionId: string): Promise<void>;
}
interface RAGAdapter {
    analyzeQuery(query: string): Promise<QueryAnalysisResult>;
    retrievePapers(analysis: QueryAnalysisResult): Promise<RetrievedPaper[]>;
    buildContext(papers: RetrievedPaper[]): Promise<string>;
}
interface ContextAdapter {
    searchMentions(query: string): Promise<ContextItem[]>;
    getActiveDocument(): Promise<ContextItem | null>;
    getSelection(): Promise<ContextItem | null>;
    resolveEmbed(link: string): Promise<string>;
}
interface ToolAdapter {
    executeTool(call: ToolCall): Promise<ToolResult>;
    getAvailableTools(): ToolDefinition[];
}
interface AgentEngine {
    id: string;
    name: string;
    color: string;
    adapter: LLMAdapter;
    toolExecutor?: ToolExecutor;
}
interface AgentResponse {
    agentId: string;
    agentName: string;
    message: ChatMessage;
    tokenEstimate?: number;
}
interface OrchestratorOptions {
    mode?: 'sequential' | 'parallel';
    contextStrategy?: 'full' | 'isolated';
    maxSteps?: number;
    autoApply?: boolean;
}
interface Mention {
    type: 'agent' | 'context';
    name: string;
    raw: string;
}
interface MentionParseResult {
    mentions: Mention[];
    cleanText: string;
}
type ToolHandler<T = unknown> = (args: T) => Promise<ToolResult>;
interface ToolExecutor {
    register<T>(name: string, handler: ToolHandler<T>): void;
    execute(call: ToolCall): Promise<ToolResult>;
    executeBatch(calls: ToolCall[]): Promise<ToolResult[]>;
}
interface ApprovalQueue {
    add(call: ToolCall): Promise<ToolResult>;
    approve(callId: string): void;
    reject(callId: string, reason?: string): void;
    getPending(): ToolCall[];
    onPending(callback: (calls: ToolCall[]) => void): () => void;
}
interface ApprovalQueueState {
    pending: ToolCall[];
    approved: string[];
    rejected: string[];
}

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

declare class ChatEngine {
    private opts;
    private state;
    private agentLoop;
    private toolExecutor;
    private customTools;
    constructor(options: ChatEngineOptions);
    loadSessions(): Promise<ChatSession[]>;
    saveSession(session?: ChatSession): Promise<void>;
    createSession(title?: string): ChatSession;
    switchSession(sessionId: string): boolean;
    getActiveSession(): ChatSession | null;
    deleteSession(sessionId: string): Promise<void>;
    archiveSession(sessionId: string): Promise<void>;
    getSessions(): ChatSession[];
    /**
     * Send a message and receive streaming events.
     *
     * Yields text-deltas, tool-calls, tool-results, and finish events.
     * Callers should handle UI updates based on event types.
     */
    sendMessage(text: string, options?: SendOptions): AsyncIterable<StreamEvent>;
    /**
     * Stop the current streaming response.
     */
    stopStreaming(): void;
    /**
     * Check if currently streaming.
     */
    get isStreaming(): boolean;
    /**
     * Register a custom tool handler.
     */
    registerTool(name: string, handler: ToolHandler): void;
    /**
     * Get all available tool definitions (from adapter + custom).
     */
    getAvailableTools(): ToolDefinition[];
    /**
     * Execute a tool call directly (for manual/testing use).
     */
    executeTool(call: ToolCall): Promise<ToolResult>;
    updateSettings(settings: Partial<ChatSettings>): void;
    getSettings(): ChatSettings;
    private runWithTools;
    private runTextOnly;
    private registerAdapterTools;
}

export { type AgentEngine as A, ChatEngine as C, type LLMAdapter as L, type Mention as M, type OrchestratorOptions as O, type PersistenceAdapter as P, type QueryAnalysisResult as Q, type RAGAdapter as R, type SendOptions as S, type ToolAdapter as T, type AgentLoopOptions as a, type AgentResponse as b, type ApprovalQueue as c, type ApprovalQueueState as d, type ChatEngineOptions as e, type ChatMessage as f, type ChatSession as g, type ChatSettings as h, type ContextAdapter as i, type ContextItem as j, type MentionParseResult as k, type MessageRole as l, type ModelInfo as m, type ProviderInfo as n, type ProviderProfile as o, type ProviderType as p, type RetrievedPaper as q, type StreamEvent as r, type ToolCall as s, type ToolDefinition as t, type ToolHandler as u, type ToolResult as v };
