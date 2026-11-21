import type { ChatSession, ChatMessage, ToolCall } from './types';
import type { ChatSession as StoredSession, ChatMessage as StoredMessage } from './conversation';
import type { ToolCall as StoredCall } from './conversationTools';
export type { ChatSession as StoredChatSession, ChatMessage as StoredChatMessage, StoredChatData } from './conversation';
export const toStoredCall = ({ id, name, ...rest }: ToolCall, original?: StoredCall): StoredCall => ({ ...original, toolCallId: id, toolName: name, ...rest });
export const fromStoredCall = ({ toolCallId, toolName, ...rest }: StoredCall): ToolCall => ({ ...rest, id: toolCallId, name: toolName });
/** Runtime state never becomes part of the portable conversation record. */
export function toStoredMessage(message: ChatMessage): StoredMessage {
    const saved: StoredMessage = { ...structuredClone(message.conversation ?? {}), id: message.id, role: message.role === 'system' ? 'assistant' : message.role, content: message.content, timestamp: message.timestamp };
    if (message.role === 'system')
        saved.isDebug = true;
    if (message.tokenCount !== undefined)
        saved.estimatedTokens = message.tokenCount;
    if (message.sender?.kind === 'agent') {
        saved.agentId = message.sender.id;
        saved.agentName = message.sender.name;
        if (message.sender.color !== undefined)
            saved.agentColor = message.sender.color;
    }
    if (message.resolvedParts !== undefined)
        saved.resolvedParts = structuredClone(message.resolvedParts);
    if (message.attachments !== undefined)
        saved.attachments = structuredClone(message.attachments);
    if (message.toolCalls !== undefined)
        saved.toolCalls = message.toolCalls.map((call, i) => ({ call: toStoredCall(call, message.conversation?.toolCalls?.[i]?.call), ...(message.toolResults?.[i] ? { result: structuredClone(message.toolResults[i]) } : {}) }));
    if (message.contentParts !== undefined)
        saved.contentParts = message.contentParts.map((part, index) => part.type === 'text' ? { ...part } : { ...part, call: toStoredCall(part.call, message.conversation?.contentParts?.[index]?.type === "tool_call" ? (message.conversation.contentParts[index] as {
                type: "tool_call";
                call: StoredCall;
            }).call : undefined) });
    if (message.status === 'failed')
        saved.isError = true;
    return saved;
}
export function fromStoredMessage(saved: StoredMessage): ChatMessage {
    return {
        conversation: structuredClone(saved), id: saved.id, role: saved.role, content: saved.content, timestamp: saved.timestamp,
        ...(saved.resolvedParts ? { resolvedParts: structuredClone(saved.resolvedParts) } : {}),
        ...(saved.attachments ? { attachments: structuredClone(saved.attachments) } : {}),
        ...(saved.estimatedTokens !== undefined ? { tokenCount: saved.estimatedTokens } : {}),
        ...(saved.agentId || saved.agentName ? { sender: { id: saved.agentId ?? saved.agentName!, name: saved.agentName ?? saved.agentId!, kind: 'agent' as const, color: saved.agentColor } } : saved.remote && saved.fromUserId ? { sender: { id: saved.fromUserId, name: saved.fromUserId, kind: 'human' as const } } : {}),
        ...(saved.toolCalls ? { toolCalls: saved.toolCalls.map(({ call }) => fromStoredCall(call)), toolResults: saved.toolCalls.map(({ result }) => result) } : {}),
        ...(saved.contentParts ? { contentParts: saved.contentParts.map(part => part.type === 'text' ? { ...part } : { ...part, call: fromStoredCall(part.call) }) } : {}),
    } as ChatMessage;
}
export function toStoredSession(session: ChatSession): StoredSession {
    const saved: StoredSession = { ...structuredClone(session.conversation ?? {}), id: session.id, title: session.title, createdAt: session.createdAt, updatedAt: session.updatedAt, messages: session.messages.map(toStoredMessage), contextItems: structuredClone(session.conversation?.contextItems ?? []) };
    for (const key of ['tags', 'autoTagPending', 'draft', 'draftAttachments', 'thinkingMode', 'scrollPosition'] as const) {
        if (session[key] !== undefined)
            Object.assign(saved, { [key]: structuredClone(session[key]) });
    }
    if (session.llmProfileId) {
        saved.profileId = session.llmProfileId;
        if (session.llmModel)
            saved.modelOverrides = { ...saved.modelOverrides, [session.llmProfileId]: session.llmModel };
    }
    // Index-only boot metadata must not retain an obsolete count after editing.
    if (saved.messageCount !== undefined)
        saved.messageCount = saved.messages.length;
    if (saved.hydrated !== undefined)
        saved.hydrated = true;
    return saved;
}
export function fromStoredSession(saved: StoredSession): ChatSession {
    if (!saved || typeof saved.id !== 'string' || typeof saved.title !== 'string' || !Array.isArray(saved.messages) || !Array.isArray(saved.contextItems))
        throw new Error('Choose an Obsidian-AI chat archive.');
    return { conversation: structuredClone(saved), id: saved.id, title: saved.title, createdAt: saved.createdAt, updatedAt: saved.updatedAt, messages: saved.messages.map(fromStoredMessage),
        ...(saved.profileId ? { llmProfileId: saved.profileId, llmModel: saved.modelOverrides?.[saved.profileId] } : {}),
        ...Object.fromEntries(['tags', 'autoTagPending', 'draft', 'draftAttachments', 'thinkingMode', 'scrollPosition'].filter(key => saved[key as keyof StoredSession] !== undefined).map(key => [key, structuredClone(saved[key as keyof StoredSession])])),
    };
}
export interface SessionRuntimeState {
    turns?: ChatSession['turns'];
    externalIdentity?: ChatSession['externalIdentity'];
    archived?: boolean;
    metadata?: ChatSession['metadata'];
    participants?: ChatSession['participants'];
    persistence?: ChatSession['persistence'];
    messageState: Record<string, Pick<ChatMessage, 'status' | 'turnId' | 'sender' | 'sources' | 'citations' | 'reasoning' | 'metadata'>>;
}
export function sessionRuntimeState(session: ChatSession): SessionRuntimeState {
    return structuredClone({ turns: session.turns, externalIdentity: session.externalIdentity, archived: session.archived, metadata: session.metadata, participants: session.participants, persistence: session.persistence, messageState: Object.fromEntries(session.messages.map(({ id, status, turnId, sender, sources, citations, reasoning, metadata }) => [id, { status, turnId, sender, sources, citations, reasoning, metadata }])) });
}
export function restoreRuntimeState(session: ChatSession, state?: SessionRuntimeState): ChatSession {
    if (!state)
        return session;
    const { messageState, ...rest } = state;
    Object.assign(session, rest);
    for (const message of session.messages)
        Object.assign(message, messageState?.[message.id] ?? {});
    return session;
}
