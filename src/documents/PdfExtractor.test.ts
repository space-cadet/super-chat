import {describe, expect, it, vi} from 'vitest';
import {extractPdfFromBuffer, extractPdfFromUrl, type PdfClient} from './PdfExtractor';
const client: PdfClient = {getDocument: () => ({promise: Promise.resolve({numPages: 3, getPage: async n => ({getTextContent: async () => ({items: [{str: `Page ${n}`}]})})})})};
describe('PDF extraction', () => {
 it('extracts all pages with the unlimited setting', async () => {
  const result = await extractPdfFromBuffer(new ArrayBuffer(0), {maxPages: 0, host: {fetch, loadClient: async () => client}});
  expect(result.metadata?.extractedPages).toBe(3);
  expect(result.fullText).toContain('Page 3');
 });
 it('keeps explicit server mode for later pages', async () => {
  const request = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({success: true, full_text: 'later page'})));
  const result = await extractPdfFromUrl('https://example.com/p.pdf', {method: 'server', startPage: 2, serverUrl: 'https://extract.example', host: {fetch: request}});
  expect(result.fullText).toBe('later page');
  expect(request.mock.calls[0]?.[0]).toBe('https://extract.example/extract');
 });
});

it('uses the host extractor for PDF attachments on every provider', async () => {
 const {resolveAttachment} = await import('../context/AttachmentEngine');
 const extract = vi.fn(async (_buffer: ArrayBuffer) => 'Extracted document');
 const parts = await resolveAttachment({id: 'pdf', type: 'pdf', path: 'paper.pdf', name: 'paper.pdf', data: btoa('PDF bytes'), mimeType: 'application/pdf'}, undefined, 'deepseek', extract);
 expect(parts).toEqual([{type: 'text', text: '[PDF attached: paper.pdf]\n\nExtracted document'}]);
 expect(new TextDecoder().decode(extract.mock.calls[0]?.[0])).toBe('PDF bytes');
});
