/**
 * Core types for super-chat
 * Framework-agnostic type definitions used throughout the library
 */

// ============================================================================
// Message Types
// ============================================================================

export type MessageRole = 'user' | 'assistant' | 'system';

export type SessionId = string;

/** A product identity that can be mapped to a stable super-chat session. */
export interface ExternalSessionIdentity {
  namespace: string;
  id: string;
  version?: string;
}

/** Metadata needed to migrate and recover a persisted session safely. */
export interface SessionPersistenceMetadata {
  schemaVersion: number;
  migratedFromVersion?: number;
  migrationId?: string;
}

export type ChatTurnStatus =
  | 'streaming'
  | 'completed'
  | 'cancelled'
  | 'failed';

export interface ChatModelMessage {
  role: string;
  content: string;
}

export interface ChatRetrievedSource {
  id: string;
  title: string;
  content: string;
  uri?: string;
  score?: number;
  metadata?: Record<string, unknown>;
  provenance: {
    capabilityId: string;
    sourceId: string;
    retrievedAt: number;
  };
}

export type RetrievalStatus =
  | 'complete'
  | 'partial'
  | 'unavailable'
  | 'unauthorized'
  | 'cancelled';

export type RetrievalErrorCode =
  | 'cancelled'
  | 'unauthorized'
  | 'unavailable'
  | 'invalid-response'
  | 'failed';

export interface RetrievalError {
  code: RetrievalErrorCode;
  message: string;
  retryable?: boolean;
}

/** Neutral result shape; a plain source array remains accepted for compatibility. */
export interface RetrievalResult {
  sources: ChatRetrievedSource[];
  status?: RetrievalStatus;
  warnings?: string[];
  error?: RetrievalError;
}

export interface RetrievalSnapshot {
  status: 'idle' | 'retrieving' | 'failed' | RetrievalStatus;
  progress: number;
  sources: ChatRetrievedSource[];
  warnings: string[];
  error?: RetrievalError;
}

/** The durable lifecycle record for one user turn. */
export interface ChatTurn {
  id: string;
  userMessageId: string;
  assistantMessageId?: string;
  status: ChatTurnStatus;
  startedAt: number;
  updatedAt: number;
  toolCalls: ToolCall[];
  toolResults: Record<string, ToolResult>;
  modelMessages: ChatModelMessage[];
  retrievedSources?: ChatRetrievedSource[];
  retrievedContext?: string;
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  status?: ChatTurnStatus;
  turnId?: string;
  sources?: ChatRetrievedSource[];
  citations?: RetrievedPaper[];
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  tokenCount?: number;
  metadata?: Record<string, unknown>;
}

export interface ChatSession {
  /** Stable super-chat-owned session ID. */
  id: SessionId;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  /** Optional product mapping; never used as the primary session key. */
  externalIdentity?: ExternalSessionIdentity;
  persistence?: SessionPersistenceMetadata;
  turns?: ChatTurn[];
  /** Provider-neutral history used to continue a reloaded conversation. */
  modelHistory?: ChatModelMessage[];
  llmProvider?: string;
  llmModel?: string;
  archived?: boolean;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Tool Types
// ============================================================================

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface ToolResult {
  success?: boolean;
  content?: string;
  error?: string;
  path?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  risk?: 'read' | 'write' | 'destructive' | 'external';
  approval?: 'never' | 'always' | 'host-policy';
  title?: string;
}

// ============================================================================
// RAG Types
// ============================================================================

export interface RetrievedPaper {
  id: string;
  title: string;
  authors: string[];
  year: number;
  url: string;
  snippet: string;
  abstract?: string;
}

export interface QueryAnalysisResult {
  intent: string;
  keywords: string[];
  requiresRetrieval: boolean;
}

// ============================================================================
// Context Types
// ============================================================================

export interface ContextItem {
  id: string;
  type: 'note' | 'selection' | 'active-document' | 'embed';
  name: string;
  content: string;
  path?: string;
}

// ============================================================================
// Stream Events (SDK-agnostic)
// ============================================================================

export type StreamEvent =
  | { type: 'text-delta'; text: string }
  | { type: 'tool-call'; call: ToolCall }
  | { type: 'tool-result'; callId: string; result: ToolResult }
  | { type: 'tool-error'; callId: string; error: string }
  | { type: 'pending-approval'; call: ToolCall }
  | { type: 'citation'; papers: RetrievedPaper[] }
  | { type: 'rag-status'; status: string; progress?: number }
  | { type: 'rag-warning'; message: string }
  | { type: 'step-finish'; step: number }
  | { type: 'finish'; reason: string }
  | { type: 'error'; message: string }
  | { type: 'usage'; promptTokens: number; completionTokens: number; totalTokens: number }
  | { type: 'metrics'; ttftMs: number; totalDurationMs: number };

export interface ChatEngineSnapshot {
  sessions: ChatSession[];
  activeSessionId: string | null;
  isStreaming: boolean;
  pendingApprovals: ToolCall[];
  retrieval: RetrievalSnapshot;
}

export type ChatEngineListener = (snapshot: ChatEngineSnapshot) => void;

// ============================================================================
// Options Types
// ============================================================================

export interface SendOptions {
  provider?: string;
  model?: string;
  enableRAG?: boolean;
  enableTools?: boolean;
  maxSteps?: number;
  maxRetrievalResults?: number;
  signal?: AbortSignal;
}

export interface AgentLoopOptions {
  maxSteps?: number;
  autoApply?: boolean;
}

export interface ChatEngineOptions {
  llmAdapter: LLMAdapter;
  persistenceAdapter?: PersistenceAdapter;
  ragAdapter?: RAGAdapter;
  toolAdapter?: ToolAdapter;
  contextAdapter?: ContextAdapter;
  systemPrompt?: string;
  agentLoopOptions?: AgentLoopOptions;
}

export type SessionWriteReason =
  | 'create'
  | 'user-message'
  | 'partial-output'
  | 'tool-call'
  | 'tool-result'
  | 'turn-complete'
  | 'turn-cancelled'
  | 'turn-failed'
  | 'retrieval'
  | 'migration'
  | 'manual'
  | 'archive';

/** All persistence writes originate from the ChatEngine owner. */
export interface SessionWriteContext {
  owner: 'chat-engine';
  reason: SessionWriteReason;
  turnId?: string;
}

// ============================================================================
// Provider Types
// ============================================================================

export type ProviderType =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'azure'
  | 'ollama'
  | 'openrouter'
  | 'deepseek'
  | 'kimi'
  | 'custom';

export interface ProviderInfo {
  id: string;
  name: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  contextWindow: number;
}

export interface ProviderProfile {
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

// ============================================================================
// Settings Types
// ============================================================================

export interface ChatSettings {
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

// ============================================================================
// Adapter Interfaces
// ============================================================================

export interface LLMAdapter {
  streamChat(
    messages: { role: string; content: string }[],
    signal?: AbortSignal,
  ): AsyncIterable<string>;

  streamChatWithTools(
    messages: { role: string; content: string }[],
    tools: ToolDefinition[],
    signal?: AbortSignal,
  ): AsyncIterable<StreamEvent>;

  getProviders(): ProviderInfo[];
  getModels(provider: string): ModelInfo[];
  testConnection(): Promise<{ ok: boolean; message: string }>;
}

export interface PersistenceAdapter {
  loadSessions(): Promise<ChatSession[]>;
  saveSession(session: ChatSession, context?: SessionWriteContext): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
  archiveSession(sessionId: string): Promise<void>;
}

export interface RAGAdapter {
  analyzeQuery(query: string): Promise<QueryAnalysisResult>;
  retrievePapers(analysis: QueryAnalysisResult): Promise<RetrievedPaper[]>;
  buildContext(papers: RetrievedPaper[]): Promise<string>;
  /**
   * Neutral host-backed retrieval entry point. The signal is optional so
   * existing paper-oriented adapters remain source-compatible while newer
   * adapters can cancel work with the active chat turn.
   */
  retrieveSources?(
    query: string,
    signal?: AbortSignal,
    options?: { maxResults?: number },
  ): Promise<ChatRetrievedSource[] | RetrievalResult>;
}

export interface ContextAdapter {
  searchMentions(query: string): Promise<ContextItem[]>;
  getActiveDocument(): Promise<ContextItem | null>;
  getSelection(): Promise<ContextItem | null>;
  resolveEmbed(link: string): Promise<string>;
}

export interface ToolAdapter {
  executeTool(call: ToolCall): Promise<ToolResult>;
  getAvailableTools(): ToolDefinition[];
}

// ============================================================================
// Multi-Agent Types
// ============================================================================

export interface AgentEngine {
  id: string;
  name: string;
  color: string;
  adapter: LLMAdapter;
  toolExecutor?: ToolExecutor;
}

export interface AgentResponse {
  agentId: string;
  agentName: string;
  message: ChatMessage;
  tokenEstimate?: number;
}

export interface OrchestratorOptions {
  mode?: 'sequential' | 'parallel';
  contextStrategy?: 'full' | 'isolated';
  maxSteps?: number;
  autoApply?: boolean;
}

// ============================================================================
// Mention Types
// ============================================================================

export interface Mention {
  type: 'agent' | 'context';
  name: string;
  raw: string;
}

export interface MentionParseResult {
  mentions: Mention[];
  cleanText: string;
}

// ============================================================================
// Tool Executor Types
// ============================================================================

export type ToolHandler<T = unknown> = (args: T) => Promise<ToolResult>;

export interface ToolExecutor {
  register<T>(name: string, handler: ToolHandler<T>): void;
  execute(call: ToolCall): Promise<ToolResult>;
  executeBatch(calls: ToolCall[]): Promise<ToolResult[]>;
}

// ============================================================================
// Approval Queue Types
// ============================================================================

export interface ApprovalQueue {
  add(call: ToolCall): Promise<ToolResult>;
  approve(callId: string): void;
  reject(callId: string, reason?: string): void;
  getPending(): ToolCall[];
  onPending(callback: (calls: ToolCall[]) => void): () => void;
}

export interface ApprovalQueueState {
  pending: ToolCall[];
  approved: string[];
  rejected: string[];
}
