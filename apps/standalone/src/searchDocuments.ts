import { requireOwnerSession, assertOwnerSession, ownerRequestSignal, onOwnerSessionClosed, type OwnerSession } from './ownerSession';
import type { CredentialCapability, ToolCapability } from 'super-chat/contracts';
import { WebSearchService, DEFAULT_WEB_SEARCH_SETTINGS, type WebRequest, type WebSearchSettings } from '../../../src/web/WebSearchService';
import { extractPdfFromBuffer, extractPdfFromUrl, type PdfExtractionHost } from '../../../src/documents/PdfExtractor';
import { DEFAULT_PDF_SETTINGS, type PdfSettings } from './screens/sections/SearchDocumentSettingsSection';
import { standaloneSettingsStore } from './persistence';

export type SearchDocumentSettings = WebSearchSettings & PdfSettings;
export const DEFAULT_SEARCH_DOCUMENT_SETTINGS: SearchDocumentSettings = {...DEFAULT_WEB_SEARCH_SETTINGS, ...DEFAULT_PDF_SETTINGS};
const credentialKeys = ['braveApiKey', 'tavilyApiKey', 'exaApiKey'] as const;
const transientKeys: Partial<WebSearchSettings> = {};
onOwnerSessionClosed(() => { for (const key of credentialKeys) delete transientKeys[key]; });
function credentialContext() {
 return { requestId: `standalone-search-settings-${Date.now()}` };
}
export async function loadSearchDocumentSettings(credentials?: CredentialCapability): Promise<SearchDocumentSettings> {
 const value = {...DEFAULT_SEARCH_DOCUMENT_SETTINGS, ...await standaloneSettingsStore.load<SearchDocumentSettings>('search-documents')};
 for (const key of credentialKeys) value[key] = credentials
  ? await credentials.getCredential(`standalone-search-${key}`, credentialContext()) || ''
  : transientKeys[key] || '';
 return value;
}
export async function saveSearchDocumentSettings(value: SearchDocumentSettings, credentials?: CredentialCapability): Promise<void> {
 const safe = {...value};
 for (const key of credentialKeys) {
  if (credentials?.setCredential) {
   if (value[key]) await credentials.setCredential({id: `standalone-search-${key}`, label: key, provider: key.replace('ApiKey', '')}, value[key], credentialContext());
   else await credentials.deleteCredential?.(`standalone-search-${key}`, credentialContext());
  } else transientKeys[key] = value[key];
  safe[key] = '';
 }
 await standaloneSettingsStore.save('search-documents', safe);
}
export type StandaloneWebRequester = (request: WebRequest, signal?: AbortSignal) => Promise<{status: number; text: string}>;
export interface StandaloneSearchDocumentHost {
 credentials?: CredentialCapability;
 request?: StandaloneWebRequester;
}
const browserWebRequest: StandaloneWebRequester = async (request, signal) => {
 const response = await fetch(request.url, {...request, signal});
 return {status: response.status, text: await response.text()};
};
const pdfHost: PdfExtractionHost = {
 fetch: (...args) => fetch(...args),
 async loadClient() {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  return pdfjs;
 },
};
export async function extractStandalonePdf(data: ArrayBuffer, credentials?: CredentialCapability) {
 const owner = requireOwnerSession();
 const settings = await loadSearchDocumentSettings(credentials);
 const result = await extractPdfFromBuffer(data, {maxPages: settings.pdfMaxPages, host: pdfHost});
 assertOwnerSession(owner);
 if (!result.success) throw new Error(result.error || 'PDF extraction failed.');
 return result.fullText || '';
}
export function createStandaloneSearchDocumentTools(host: StandaloneSearchDocumentHost = {}): ToolCapability {
const searchSnapshots = new Map<string, {owner: OwnerSession; query: string; provider: string; items: Awaited<ReturnType<WebSearchService['search']>>; offset: number; created: number}>();
onOwnerSessionClosed(() => searchSnapshots.clear());
return {
 id: 'standalone-search-documents', kind: 'tools',
 async getTools() {
  return [
   {name: 'search_web', title: 'Search web', description: 'Search the web using the configured provider.', parameters: {type: 'object', properties: {query: {type: 'string'}, limit: {type: 'number'}, cursor: {type: 'string'}}, required: ['query']}, risk: 'read', approval: 'never', idempotent: true},
   {name: 'read_pdf', title: 'Read PDF URL', description: 'Extract text from a public PDF URL, with bounded pages.', parameters: {type: 'object', properties: {source: {type: 'string'}, max_pages: {type: 'number'}, start_page: {type: 'number'}}, required: ['source']}, risk: 'read', approval: 'never', idempotent: true},
  ];
 },
 async executeTool(call, context) {
  const owner = requireOwnerSession();
  const signal = ownerRequestSignal(context?.signal);
  try {
   context?.signal?.throwIfAborted();
   const settings = await loadSearchDocumentSettings(host.credentials);
   if (call.name === 'search_web') {
    if (typeof call.args.query !== 'string') throw new Error('A search query is required.');
    const service = new WebSearchService(settings, request => {
     context?.signal?.throwIfAborted();
     return (host.request ?? browserWebRequest)(request, signal);
    });
    const limit = Math.min(20, Math.max(1, Math.floor(Number(call.args.limit) || 5)));
    const cursor = typeof call.args.cursor === 'string' ? call.args.cursor : undefined;
    for (const [key, snapshot] of searchSnapshots) if (Date.now() - snapshot.created > 15 * 60_000) searchSnapshots.delete(key);
    const cached = cursor ? searchSnapshots.get(cursor) : undefined;
    if (cursor && (!cached || cached.owner !== owner || cached.query !== call.args.query || cached.provider !== settings.webSearchProvider)) throw new Error('Search continuation expired or belongs to another query. Start a new search.');
    const items = cached?.items ?? await service.search(call.args.query, 20);
    assertOwnerSession(owner);
    const offset = cached?.offset ?? 0;
    const results = items.slice(offset, offset + limit);
    const hasMore = offset + limit < items.length;
    let nextCursor: string | undefined;
    if (hasMore) {
     if (searchSnapshots.size >= 100) searchSnapshots.delete(searchSnapshots.keys().next().value!);
     nextCursor = crypto.randomUUID();
     searchSnapshots.set(nextCursor, {owner, query: call.args.query, provider: settings.webSearchProvider, items, offset: offset + limit, created: Date.now()});
    }
    return {success: true, content: JSON.stringify({content: results.map((r,i) => `${i+1}. **${r.title}**\n   URL: ${r.url}\n   ${r.snippet}`).join('\n\n') || 'No search results found.', query: call.args.query, count: results.length, total_count: items.length, has_more: hasMore, next_cursor: nextCursor})};
   }
   if (call.name === 'read_pdf') {
    if (typeof call.args.source !== 'string' || !/^https?:\/\//.test(call.args.source)) throw new Error('Enter an HTTP or HTTPS PDF URL. Attach local PDFs through the composer.');
    const result = await extractPdfFromUrl(call.args.source, {method: settings.pdfExtractionMethod, serverUrl: settings.pdfExtractionServerUrl, maxPages: Math.min(50, Math.max(1, Number(call.args.max_pages) || settings.pdfMaxPages || 50)), startPage: Math.max(1, Math.floor(Number(call.args.start_page) || 1)), host: {...pdfHost, fetch: (url, init) => fetch(url, {...init, signal})}});
    assertOwnerSession(owner);
    return result.success ? {success: true, content: JSON.stringify({content: `## PDF: ${call.args.source}\n\n${result.fullText || '(No text extracted)'}`, metadata: result.metadata, page_start: Math.max(1, Math.floor(Number(call.args.start_page) || 1)), page_end: result.pages?.at(-1)?.pageNumber, total_pages: result.metadata?.totalPages, has_more: (result.pages?.at(-1)?.pageNumber ?? 0) < (result.metadata?.totalPages ?? 0), next_page: (result.pages?.at(-1)?.pageNumber ?? 0) + 1})} : {success: false, error: result.error};
   }
   return {success: false, error: `Unknown tool: ${call.name}`};
 } catch (error) { return {success: false, error: error instanceof Error ? error.message : String(error)}; }
 },
};
}
