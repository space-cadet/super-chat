/**
 * super-chat — Core exports
 */

// Core types
export type {
	MessageRole,
	ChatMessage,
	ChatSession,
	ToolCall,
	ToolResult,
	ToolDefinition,
	RetrievedPaper,
	QueryAnalysisResult,
	ContextItem,
	StreamEvent,
	SendOptions,
	AgentLoopOptions,
	ChatEngineOptions,
	ProviderType,
	ProviderInfo,
	ModelInfo,
	ProviderProfile,
	ChatSettings,
	LLMAdapter,
	PersistenceAdapter,
	RAGAdapter,
	ContextAdapter,
	ToolAdapter,
	AgentEngine,
	AgentResponse,
	OrchestratorOptions,
	Mention,
	MentionParseResult,
	ToolHandler,
	ApprovalQueue,
	ApprovalQueueState,
} from './core/types';

// Core implementations
export { ToolExecutor } from './core/ToolExecutor';
export { AgentLoop } from './core/AgentLoop';
export type { AgentLoopOptions as AgentLoopRunOptions, AgentLoopResult, ToolResultFormatter } from './core/AgentLoop';

// Adapters
export { VercelLLMAdapter, createProviderProfile } from './adapters/VercelLLMAdapter';
export { MemoryPersistenceAdapter } from './adapters/MemoryPersistence';
export { LocalStoragePersistenceAdapter } from './adapters/LocalStoragePersistence';
export { DemoToolAdapter } from './adapters/DemoToolAdapter';

// Core classes
export { ChatEngine } from './core/ChatEngine';
// export { ApprovalQueue } from './core/ApprovalQueue';
// export { Orchestrator } from './core/Orchestrator';
// export { MentionParser } from './core/MentionParser';
// export { MentionResolver } from './core/MentionResolver';
