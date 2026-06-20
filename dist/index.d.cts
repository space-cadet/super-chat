import { T as ToolAdapter, u as ToolHandler, t as ToolDefinition, s as ToolCall, v as ToolResult, L as LLMAdapter, g as ChatSession, f as ChatMessage, r as StreamEvent, C as ChatEngine, b as AgentResponse, o as ProviderProfile, n as ProviderInfo, m as ModelInfo, p as ProviderType, P as PersistenceAdapter } from './ChatEngine-B9j2Kx5K.cjs';
export { A as AgentEngine, a as AgentLoopOptions, c as ApprovalQueue, d as ApprovalQueueState, e as ChatEngineOptions, h as ChatSettings, i as ContextAdapter, j as ContextItem, M as Mention, k as MentionParseResult, l as MessageRole, O as OrchestratorOptions, Q as QueryAnalysisResult, R as RAGAdapter, q as RetrievedPaper, S as SendOptions } from './ChatEngine-B9j2Kx5K.cjs';

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
 * Refactored to use an AsyncGenerator for real-time event streaming.
 * All communication happens via yielded StreamEvents — no callbacks.
 *
 * Each call to run() performs up to maxSteps iterations of:
 *   1. Stream LLM response with tools (single step via stopWhen)
 *   2. Detect tool calls from the stream and yield them
 *   3. Execute tool (auto-approved or via user confirmation)
 *   4. Yield tool results and feed them back into conversation
 *   5. Repeat until no more tool calls or maxSteps reached
 */

interface AgentLoopOptions {
    llmAdapter: LLMAdapter;
    toolExecutor?: ToolExecutor;
    maxSteps?: number;
    autoApply?: boolean;
    /** Called to request user approval. Return result to approve, null to reject. */
    requestApproval?: (call: ToolCall) => Promise<ToolResult | null>;
}
interface AgentLoopResult {
    text: string;
    tokenEstimate: number;
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
     * Yields StreamEvent in real-time as the loop progresses:
     *   - text-delta: as text arrives from the LLM
     *   - tool-call: when a tool call is detected
     *   - tool-result: after tool execution completes
     *   - pending-approval: when approval is needed (if not autoApply)
     *   - step-finish: when a step completes (tools executed, messages updated)
     *
     * Returns AgentLoopResult when the loop finishes.
     *
     * @param session - Chat session (for metadata)
     * @param messages - Conversation messages (system + history + user)
     * @param tools - Tool definitions to make available to the LLM
     * @param signal - AbortSignal for cancellation
     */
    run(session: ChatSession, messages: ChatMessage[], tools: ToolDefinition[], signal?: AbortSignal): AsyncGenerator<StreamEvent, AgentLoopResult>;
}

/**
 * Topology System — Defines visibility graphs between agents.
 *
 * Each topology answers: "Which agents can agent X see?"
 * This controls message routing in the multi-agent orchestrator.
 */
interface Topology {
    /**
     * Return the list of agent IDs that `agentId` can directly communicate with.
     * These are the "neighbors" in the topology graph.
     */
    neighbors(agentId: string): string[];
    /**
     * Return all agent IDs known to this topology.
     */
    allAgentIds(): string[];
    /**
     * Check if `agentId` can receive a message from `fromId`.
     * Default implementation uses neighbors(), but topologies may override
     * for special cases (e.g. user broadcasts).
     */
    canReceiveFrom(agentId: string, fromId: string): boolean;
}
/** Special ID representing the human user in the topology. */
declare const USER_ID = "__user__";
/**
 * Every agent sees every other agent, and all agents see the user.
 * This is the default topology for traditional multi-agent chat.
 */
declare class FullyConnectedTopology implements Topology {
    private agentIds;
    constructor(agentIds: string[]);
    neighbors(agentId: string): string[];
    allAgentIds(): string[];
    canReceiveFrom(agentId: string, fromId: string): boolean;
}
/**
 * Agents arranged in a ring. Each agent sees only its immediate
 * predecessor and successor. The user is connected to all agents
 * (broadcast), but agent-to-agent messages only flow around the ring.
 */
declare class RingTopology implements Topology {
    private agentIds;
    constructor(agentIds: string[]);
    neighbors(agentId: string): string[];
    allAgentIds(): string[];
    canReceiveFrom(agentId: string, fromId: string): boolean;
}
/**
 * One hub agent at the center. All leaf agents communicate only
 * through the hub. The user broadcasts to all agents (all leaves
 * and the hub can see user messages).
 */
declare class StarTopology implements Topology {
    private hubId;
    private leafIds;
    constructor(hubId: string, leafIds: string[]);
    neighbors(agentId: string): string[];
    allAgentIds(): string[];
    canReceiveFrom(agentId: string, fromId: string): boolean;
}

/**
 * AgentInbox — Per-agent message store and router.
 *
 * Messages are stored in a shared queue and filtered by recipient.
 * The InboxRouter uses a Topology to decide which agents receive
 * which messages.
 */

interface AgentMessage {
    /** Sender ID. Use USER_ID for human user messages. */
    from: string;
    /** Recipient ID. Use '*' for broadcast (routed by topology). */
    to: string;
    /** Message content. */
    content: string;
    /** Unix timestamp (ms). */
    timestamp: number;
    /** Optional round number (for debate mode). */
    round?: number;
}
/**
 * Per-agent message store. Each agent has its own inbox
 * containing only the messages it is allowed to see.
 */
interface AgentInbox {
    /** Add a message to the store. */
    push(message: AgentMessage): void;
    /** Get all messages visible to a specific agent. */
    messages(agentId: string): AgentMessage[];
    /** Get messages from a specific round for an agent. */
    messagesForRound(agentId: string, round: number): AgentMessage[];
    /** Clear all messages for a specific agent. */
    clear(agentId: string): void;
    /** Clear all messages across all agents. */
    clearAll(): void;
}
declare class InMemoryAgentInbox implements AgentInbox {
    private store;
    push(message: AgentMessage): void;
    messages(agentId: string): AgentMessage[];
    messagesForRound(agentId: string, round: number): AgentMessage[];
    clear(agentId: string): void;
    clearAll(): void;
}
interface InboxRouterOptions {
    topology: Topology;
    inbox?: AgentInbox;
}
/**
 * Routes messages to agents according to a Topology.
 *
 * When a message is sent, the router determines which agents
 * can see it and delivers a copy to each of their inboxes.
 */
declare class InboxRouter {
    private topology;
    private inbox;
    constructor(opts: InboxRouterOptions);
    /** Send a message from one entity to another, respecting topology. */
    route(message: AgentMessage): void;
    /** Send a user message to all agents that can see the user. */
    broadcastUserMessage(content: string, round?: number): void;
    /** Send an agent's response to its neighbors. */
    broadcastAgentResponse(fromAgentId: string, content: string, round?: number): void;
    /** Get all messages visible to a specific agent. */
    getMessages(agentId: string): AgentMessage[];
    /** Get messages for a specific round. */
    getMessagesForRound(agentId: string, round: number): AgentMessage[];
    /** Clear all inboxes. */
    clear(): void;
}

/**
 * Orchestrator — Multi-agent coordination with topology awareness.
 *
 * The ManyBodyOrchestrator manages multiple ChatEngine instances,
 * routing messages according to a Topology and supporting three
 * execution modes: sequential, parallel, and debate.
 *
 * Error isolation: if one agent fails, others continue.
 */

interface OrchestratorAgent {
    id: string;
    name: string;
    color: string;
    engine: ChatEngine;
}
interface ManyBodyOrchestratorOptions {
    agents: OrchestratorAgent[];
    topology: Topology;
    mode?: "sequential" | "parallel" | "debate";
    /** Number of debate rounds (default: 2). Only used in debate mode. */
    debateRounds?: number;
    /** Optional custom inbox. */
    inbox?: AgentInbox;
}
interface OrchestratorRunResult {
    responses: AgentResponse[];
    errors: Array<{
        agentId: string;
        error: string;
    }>;
}
declare class ManyBodyOrchestrator {
    private agents;
    private topology;
    private router;
    private mode;
    private debateRounds;
    constructor(opts: ManyBodyOrchestratorOptions);
    /**
     * Send a user message to the orchestrator.
     *
     * Yields AgentResponse objects as agents produce them.
     * The order depends on the mode:
     *   - sequential: one at a time, in agent order
     *   - parallel: as they complete (fastest first)
     *   - debate: round by round, all agents per round
     */
    userMessage(text: string): AsyncGenerator<AgentResponse>;
    /**
     * Dispatch a user message to all agents that can see the user,
     * without collecting responses. Used when you want to populate
     * agent sessions before a subsequent operation.
     */
    dispatch(text: string): void;
    /** Get the IDs of agents that can see the user. */
    getVisibleAgentIds(): string[];
    /** Get all agent IDs in the topology. */
    getAllAgentIds(): string[];
    /** Get an agent by ID. */
    getAgent(id: string): OrchestratorAgent | undefined;
    /** Access the inbox router (for advanced use cases). */
    getRouter(): InboxRouter;
    /**
     * Sequential mode: agents respond one after another.
     * Each agent sees the original user message.
     * Responses are broadcast to neighbors via the inbox.
     */
    private runSequential;
    /**
     * Parallel mode: all visible agents respond simultaneously.
     * Results are yielded as they complete (fastest-first order).
     */
    private runParallel;
    /**
     * Debate mode: multiple rounds of agent interaction.
     *
     * Round 0: All visible agents respond to the original user message.
     * Round N: Each agent receives its neighbors' responses from round N-1
     *          and responds again.
     */
    private runDebate;
    private buildDebatePrompt;
    private runAgentAndIgnore;
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

declare function estimateTokens(text: string): number;

export { type AgentInbox, AgentLoop, type AgentLoopResult, type AgentLoopOptions as AgentLoopRunOptions, type AgentMessage, AgentResponse, ChatEngine, ChatMessage, ChatSession, DemoToolAdapter, FullyConnectedTopology, InMemoryAgentInbox, InboxRouter, type InboxRouterOptions, LLMAdapter, LocalStoragePersistenceAdapter, ManyBodyOrchestrator, type ManyBodyOrchestratorOptions, MemoryPersistenceAdapter, ModelInfo, type OrchestratorAgent, type OrchestratorRunResult, PersistenceAdapter, ProviderInfo, ProviderProfile, ProviderType, RingTopology, StarTopology, StreamEvent, ToolAdapter, ToolCall, ToolDefinition, ToolExecutor, ToolHandler, ToolResult, type ToolResultFormatter, type Topology, USER_ID, VercelLLMAdapter, createProviderProfile, estimateTokens };
