import { g as ChatSession, v as ToolResult, f as ChatMessage, s as ToolCall, C as ChatEngine, b as AgentResponse } from '../ChatEngine-CBYcBxdj.js';

/**
 * useChat — React hook for super-chat ChatEngine.
 *
 * Manages chat state (messages, sessions, streaming status) and
 * provides a simple interface for sending messages.
 *
 * Usage:
 *   const {
 *     messages,
 *     sessions,
 *     currentSession,
 *     isStreaming,
 *     sendMessage,
 *     createSession,
 *     switchSession,
 *     deleteSession,
 *     stopStreaming,
 *   } = useChat(engine);
 */

interface UseChatState {
    messages: ChatMessage[];
    sessions: ChatSession[];
    currentSession: ChatSession | null;
    isStreaming: boolean;
    error: string | null;
    pendingTools: ToolCall[];
}
interface UseChatActions {
    sendMessage: (text: string) => Promise<void>;
    createSession: (title?: string) => ChatSession;
    switchSession: (sessionId: string) => boolean;
    deleteSession: (sessionId: string) => Promise<void>;
    archiveSession: (sessionId: string) => Promise<void>;
    stopStreaming: () => void;
    approveTool: (callId: string, result: ToolResult) => void;
    rejectTool: (callId: string, reason?: string) => void;
    loadSessions: () => Promise<void>;
}
type UseChatReturn = UseChatState & UseChatActions;
declare function useChat(engine: ChatEngine): UseChatReturn;

/**
 * useAgent — React hook for multi-agent orchestration.
 *
 * Manages multiple ChatEngine instances (one per agent) and
 * provides dispatch for sequential or parallel execution.
 *
 * Usage:
 *   const { agents, responses, dispatch, isRunning } = useAgent([
 *     { id: 'researcher', name: 'Researcher', engine: researcherEngine },
 *     { id: 'critic', name: 'Critic', engine: criticEngine },
 *   ]);
 *
 *   await dispatch('What are the implications of quantum error correction?');
 */

interface AgentConfig {
    id: string;
    name: string;
    color?: string;
    engine: ChatEngine;
}
interface AgentState {
    agents: AgentConfig[];
    responses: AgentResponse[];
    isRunning: boolean;
    error: string | null;
}
interface AgentActions {
    dispatch: (text: string, mode?: "sequential" | "parallel") => Promise<void>;
    addAgent: (agent: AgentConfig) => void;
    removeAgent: (agentId: string) => void;
    clearResponses: () => void;
}
type UseAgentReturn = AgentState & AgentActions;
declare function useAgent(initialAgents?: AgentConfig[]): UseAgentReturn;

export { type AgentActions, type AgentConfig, type AgentState, type UseAgentReturn, type UseChatActions, type UseChatReturn, type UseChatState, useAgent, useChat };
