import type { ChatSession, ChatModelMessage } from './types';
import { toStoredSession } from './conversationFormat';
import type { ChatMessage, CompactionSummary } from './conversation';
// Copied from Obsidian-AI semanticCompaction.ts.
export function fingerprintTranscript(messages: ChatMessage[]): string {
    const serialized = JSON.stringify(messages) ?? '';
    let hash = 2166136261;
    for (let index = 0; index < serialized.length; index++) {
        hash ^= serialized.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return `fnv1a:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
function formatSummary(summary: CompactionSummary): string {
    const section = (title: string, items: string[]) => `## ${title}\n${items.length ? items.map(item => `- ${item}`).join('\n') : '- None recorded'}`;
    return ['[Derived summary of earlier conversation - verify important details against the full transcript]', section('Key Decisions', summary.keyDecisions), section('Tool Results', summary.toolResults), section('User Intent', summary.userIntent), section('Open Questions', summary.openQuestions)].join('\n\n');
}
/** Rebuild model input from the canonical transcript, never from an exported runtime cache. */
export function buildConversationHistory(session: ChatSession): ChatModelMessage[] {
    const saved = toStoredSession(session);
    let messages = saved.messages;
    const history: ChatModelMessage[] = [];
    const compact = saved.compactionMetadata;
    if (compact?.version === 1 && compact.sourceMessageIds.length && compact.sourceMessageIds.every((id, i) => messages[i]?.id === id) && fingerprintTranscript(messages.slice(0, compact.sourceMessageIds.length)) === compact.sourceFingerprint) {
        history.push({ role: 'user', content: formatSummary(compact.summary) });
        messages = messages.slice(compact.sourceMessageIds.length);
    }
    for (const message of messages) {
        if (message.isDebug)
            continue;
        const entry: ChatModelMessage = { role: message.role, content: message.content };
        if (message.resolvedParts?.length)
            entry.resolvedParts = structuredClone(message.resolvedParts);
        else if (message.attachments?.length)
            entry.attachments = structuredClone(message.attachments);
        if (message.role === 'assistant') {
            const parts = message.contentParts?.length ? message.contentParts : [...(message.content ? [{ type: 'text' as const, content: message.content }] : []), ...(message.toolCalls ?? []).map(item => ({ type: 'tool_call' as const, ...item }))];
            if (parts.some(part => part.type === 'tool_call')) {
                const content: Record<string, unknown>[] = [];
                for (const part of parts) {
                    if (part.type === 'text') {
                        content.push({ type: 'text', text: part.content });
                        continue;
                    }
                    // An incomplete call is display history, not a valid provider tool exchange.
                    if (!part.result)
                        continue;
                    const call = part.call;
                    content.push({ type: 'tool-call', toolCallId: call.toolCallId, toolName: call.toolName, input: call.args, ...(call.providerMetadata ? { providerMetadata: call.providerMetadata } : {}) });
                    content.push({ type: 'tool-result', toolCallId: call.toolCallId, toolName: call.toolName, output: JSON.stringify(part.result) });
                }
                if (!content.length)
                    continue;
                entry.content = JSON.stringify(content);
            }
        }
        history.push(entry);
    }
    return history;
}
