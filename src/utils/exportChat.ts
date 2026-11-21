// Public UI adapter; the serializer itself uses the exact reference records.
import type { ChatSession, ChatMessage } from '../core/types';
import { toStoredSession, toStoredMessage } from '../core/conversationFormat';
import * as format from './conversationExport';
export type { ExportScope, ExportFormat, ChatExportOptions } from './conversationExport';
export { generateFilename } from './conversationExport';
export type ChatExportRequest = {
    kind: 'sessions';
    sessions: ChatSession[];
    scope: format.ExportScope;
    format: format.ExportFormat;
    options?: format.ChatExportOptions;
} | {
    kind: 'messages';
    messages: ChatMessage[];
    format: 'md';
};
export const messageToMarkdown = (message: ChatMessage, index: number) => format.messageToMarkdown(toStoredMessage(message), index);
export const serializeMessagesToMarkdown = (messages: ChatMessage[]) => format.serializeMessagesToMarkdown(messages.map(toStoredMessage));
export const serializeToMarkdown = (sessions: ChatSession[], scope: format.ExportScope) => format.serializeToMarkdown(sessions.map(toStoredSession), scope);
export const serializeToJSON = (sessions: ChatSession[], scope: format.ExportScope) => format.serializeToJSON(sessions.map(toStoredSession), scope);
export const serializeToJSONL = (sessions: ChatSession[], scope: format.ExportScope) => format.serializeToJSONL(sessions.map(toStoredSession), scope);
export function serializeChatExport(request: ChatExportRequest): string {
    return request.kind === 'messages' ? format.serializeChatExport({ ...request, messages: request.messages.map(toStoredMessage) }) : format.serializeChatExport({ ...request, sessions: request.sessions.map(toStoredSession) });
}
