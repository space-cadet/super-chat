import { g as ChatSession, v as ToolResult, f as ChatMessage, s as ToolCall, C as ChatEngine, b as AgentResponse } from '../ChatEngine-B9j2Kx5K.js';
import * as react_jsx_runtime from 'react/jsx-runtime';

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
declare function useChat(engine: ChatEngine, options?: {
    initialSessionId?: string;
}): UseChatReturn;

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

interface ChatAppProps {
    engine: ChatEngine;
    initialSessionId?: string;
    onNewChat?: () => void;
}
declare function ChatApp({ engine, initialSessionId, onNewChat }: ChatAppProps): react_jsx_runtime.JSX.Element;

interface MessageBubbleProps {
    message: ChatMessage;
    onEdit?: (messageId: string, newContent: string) => Promise<void>;
    onRetry?: (messageId: string) => Promise<void>;
    onApproveTool?: (callId: string) => void;
    onRejectTool?: (callId: string) => void;
}
declare function MessageBubble({ message, onEdit, onRetry, onApproveTool, onRejectTool }: MessageBubbleProps): react_jsx_runtime.JSX.Element;

interface ChatInputProps {
    onSend: (text: string) => void;
    onStop: () => void;
    isStreaming: boolean;
}
declare function ChatInput({ onSend, onStop, isStreaming }: ChatInputProps): react_jsx_runtime.JSX.Element;

interface PendingToolCardProps {
    toolCall: ToolCall;
    onApprove: (callId: string) => void;
    onReject: (callId: string) => void;
}
declare function PendingToolCard({ toolCall, onApprove, onReject }: PendingToolCardProps): react_jsx_runtime.JSX.Element;

interface SessionSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    sessions: ChatSession[];
    currentSessionId: string;
    onSelectSession: (sessionId: string) => void;
    onArchiveSession?: (sessionId: string) => void;
    showProviderIndicator?: boolean;
}
declare function SessionSidebar({ isOpen, onClose, sessions, currentSessionId, onSelectSession, onArchiveSession, showProviderIndicator, }: SessionSidebarProps): react_jsx_runtime.JSX.Element | null;

interface ToolResultCardProps {
    toolCall: ToolCall;
    toolResult: ToolResult;
}
declare function ToolResultCard({ toolCall, toolResult }: ToolResultCardProps): react_jsx_runtime.JSX.Element;

interface MarkdownRendererProps {
    content: string;
}
declare function MarkdownRenderer({ content }: MarkdownRendererProps): react_jsx_runtime.JSX.Element;

export { type AgentActions, type AgentConfig, type AgentState, ChatApp, ChatInput, MarkdownRenderer, MessageBubble, PendingToolCard, SessionSidebar, ToolResultCard, type UseAgentReturn, type UseChatActions, type UseChatReturn, type UseChatState, useAgent, useChat };
