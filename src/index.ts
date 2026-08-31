/**
 * super-chat — Core exports
 */

// Core types
export type {
	MessageRole,
	ChatMessage,
	ChatModelMessage,
	ChatRetrievedSource,
	RetrievalStatus,
	RetrievalErrorCode,
	RetrievalError,
	RetrievalResult,
	RetrievalSnapshot,
	ChatSession,
	ChatTurn,
	ChatTurnStatus,
	ExternalSessionIdentity,
	SessionId,
	SessionPersistenceMetadata,
	ToolCall,
	ToolResult,
	ToolDefinition,
	RetrievedPaper,
	QueryAnalysisResult,
	ContextItem,
	StreamEvent,
	SendOptions,
	ReplayOptions,
	AgentLoopOptions,
	ChatEngineOptions,
	ChatEngineSnapshot,
	ChatEngineListener,
	ProviderType,
	ProviderInfo,
	ModelInfo,
	ProviderProfile,
	ChatSettings,
	LLMAdapter,
	PersistenceAdapter,
	SessionWriteReason,
	SessionWriteContext,
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

// Topology
export {
	FullyConnectedTopology,
	RingTopology,
	StarTopology,
	USER_ID,
} from './core/Topology';
export type { Topology } from './core/Topology';

// Agent Inbox
export { InMemoryAgentInbox, InboxRouter } from './core/AgentInbox';
export type { AgentInbox, AgentMessage, InboxRouterOptions } from './core/AgentInbox';

// Orchestrator
export { ManyBodyOrchestrator } from './core/Orchestrator';
export type { OrchestratorAgent, ManyBodyOrchestratorOptions, OrchestratorRunResult } from './core/Orchestrator';

// Adapters
export { VercelLLMAdapter, createProviderProfile } from './adapters/VercelLLMAdapter';
export { MemoryPersistenceAdapter } from './adapters/MemoryPersistence';
export { LocalStoragePersistenceAdapter } from './adapters/LocalStoragePersistence';
export { DemoToolAdapter } from './adapters/DemoToolAdapter';
export { HostPersistenceAdapter, HostRAGAdapter, HostToolAdapter, createChatEngineForHost } from './adapters/HostAdapters';
export { FixtureSuperChatHost } from './adapters/FixtureSuperChatHost';

// Core classes
export { ChatEngine } from './core/ChatEngine';
export { estimateTokens } from './core/tokenEstimator';
export {
  DEFAULT_RETRIEVAL_CONTEXT_TOKENS,
  normalizeRetrievedSources,
  normalizeRetrievalResult,
  assembleRetrievedContext,
  estimateContextTokens,
} from './core/retrieval';
export type {
  RetrievalContextOptions,
  NormalizedRetrievedSources,
  RetrievedContext,
} from './core/retrieval';
export {
	CURRENT_SESSION_SCHEMA_VERSION,
	SESSION_MIGRATION_ID,
	createSessionId,
	createTurnId,
	createExternalSessionIdentity,
	createSessionPersistenceMetadata,
	cloneSession,
	normalizePersistedSession,
	isEngineWrite,
} from './core/sessionPersistence';
export type { SessionLoadReport, NormalizedSessionResult } from './core/sessionPersistence';

// Host contracts
export type {
	HostCapabilityKind,
	HostOperationContext,
	HostCapabilityBase,
	HostIdentity,
	IdentityCapability,
	ChatPersistenceCapability,
	CredentialReference,
	CredentialCapability,
	ToolRisk,
	ToolApprovalPolicy,
	HostToolDescriptor,
	ToolCapability,
	RetrievalRequest,
	RetrievedSource,
	RetrievalResult as HostRetrievalResult,
	RetrievalCapability,
	HostDocument,
	DocumentWrite,
	DocumentCapability,
	NavigationTarget,
	NavigationCapability,
	NotificationLevel,
	HostNotification,
	NotificationCapability,
	LifecycleCapability,
	SuperChatCapabilities,
	SuperChatHost,
	HostCapability,
	HostContractIssue,
	HostContractReport,
} from './contracts';
export {
	getHostCapability,
	hasHostCapability,
	listHostCapabilities,
	validateHostContract,
	assertHostContract,
	validateRetrievalResponse,
	runRetrievalConformance,
} from './contracts';
export type {
	RetrievalResponseKind,
	RetrievalConformanceIssue,
	RetrievalConformanceReport,
	RetrievalConformanceOptions,
} from './contracts';
// export { ApprovalQueue } from './core/ApprovalQueue';
// export { Orchestrator } from './core/Orchestrator';
// export { MentionParser } from './core/MentionParser';
// export { MentionResolver } from './core/MentionResolver';
