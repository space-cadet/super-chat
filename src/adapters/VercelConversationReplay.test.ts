import { expect, it, vi } from 'vitest';
const captured = vi.hoisted(() => ({ requests: [] as Record<string, unknown>[] }));
vi.mock('ai', async (importOriginal) => ({ ...await importOriginal<typeof import('ai')>(), streamText: (request: Record<string, unknown>) => { captured.requests.push(request); return { fullStream: (async function* () { yield { type: 'finish', totalUsage: { inputTokens: 30, outputTokens: 15, totalTokens: 45, inputTokenDetails: { cacheReadTokens: 5 }, outputTokenDetails: { reasoningTokens: 3 } } }; })() }; } }));
import { VercelLLMAdapter, createProviderProfile } from './VercelLLMAdapter';
import { fromStoredSession } from '../core/conversationFormat';
import { buildConversationHistory } from '../core/conversationHistory';
import fixture from '../core/__fixtures__/obsidian-rich.json';
it('converts imported tools and resolved images into actual SDK model messages and reports usage', async () => {
    const session = fromStoredSession({ ...fixture, compactionMetadata: undefined } as never);
    const adapter = new VercelLLMAdapter({ profile: createProviderProfile('openai', 'gpt-4o-mini', 'test-key') });
    const events = [];
    for await (const event of adapter.streamChatWithTools(buildConversationHistory(session), [{ name: 'search_web', description: 'Search', parameters: { type: 'object', properties: { query: { type: 'string' } } } }]))
        events.push(event);
    const request = JSON.stringify(captured.requests[0].messages);
    expect(request).toContain('tool-call');
    expect(request).toContain('tool-result');
    expect(request).toContain('call-1');
    expect(request).toContain('thoughtSignature');
    expect(request).toContain('image');
    expect(request).toContain('Explain with resolved context');
    expect(request).not.toContain('Private debug');
    expect(events).toContainEqual(expect.objectContaining({ type: 'usage', providerUsage: { inputTokens: 30, outputTokens: 15, totalTokens: 45, cachedInputTokens: 5, reasoningTokens: 3 } }));
});
it('captures original text and resolved attachment data for newly sent messages', async () => {
    const adapter = new VercelLLMAdapter({ profile: createProviderProfile('openai', 'gpt-4o-mini', 'test-key') });
    const events = [];
    for await (const event of adapter.streamChatEvents([{ role: 'user', messageId: 'new-user', content: 'Look at this image', attachments: [{ id: 'image', type: 'image', name: 'image.png', path: 'image.png', mimeType: 'image/png', data: 'aGVsbG8=' }] }]))
        events.push(event);
    expect(events).toContainEqual(expect.objectContaining({ type: 'message-parts-resolved', messageId: 'new-user', parts: expect.arrayContaining([{ type: 'text', text: 'Look at this image' }, expect.objectContaining({ type: 'image' })]) }));
});
