import {describe, expect, it, vi} from 'vitest';
import {DEFAULT_WEB_SEARCH_SETTINGS, WebSearchService} from './WebSearchService';
describe('Web search providers', () => {
 it('preserves Brave routing and bounds the requested count', async () => {
  const request = vi.fn(async (_request: unknown) => ({status: 200, text: JSON.stringify({web: {results: [{title: 'Result', url: 'https://example.com', description: 'Snippet'}]}})}));
  const service = new WebSearchService({...DEFAULT_WEB_SEARCH_SETTINGS, webSearchProvider: 'brave', braveApiKey: 'secret'}, request);
  expect(await service.search('query', 200)).toEqual([{title: 'Result', url: 'https://example.com', snippet: 'Snippet'}]);
  expect(request.mock.calls[0]?.[0]).toMatchObject({headers: {'X-Subscription-Token': 'secret'}});
  expect((request.mock.calls[0]?.[0] as {url: string}).url).toContain('count=20');
 });
 it('explains missing credentials before making requests', async () => {
  const request = vi.fn();
  await expect(new WebSearchService({...DEFAULT_WEB_SEARCH_SETTINGS, webSearchProvider: 'exa'}, request).search('query')).rejects.toThrow('Exa API key not configured');
  expect(request).not.toHaveBeenCalled();
 });
});
