/**
 * Core types for super-chat
 * Framework-agnostic type definitions used throughout the library
 */

// ============================================================================
// Message Types
// ============================================================================

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
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

export interface ChatSession {
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
  | { type: 'step-finish'; step: number }
  | { type: 'finish'; reason: string }
  | { type: 'error'; message: string }
  | { type: 'usage'; promptTokens: number; completionTokens: number; totalTokens: number }
  | { type: 'metrics'; ttftMs: number; totalDurationMs: number };

// ============================================================================
// Options Types
// ============================================================================

export interface SendOptions {
  provider?: string;
  model?: string;
  enableRAG?: boolean;
  enableTools?: boolean;
  maxSteps?: number;
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
  saveSession(session: ChatSession): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
  archiveSession(sessionId: string): Promise<void>;
}

export interface RAGAdapter {
  analyzeQuery(query: string): Promise<QueryAnalysisResult>;
  retrievePapers(analysis: QueryAnalysisResult): Promise<RetrievedPaper[]>;
  buildContext(papers: RetrievedPaper[]): Promise<string>;
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
