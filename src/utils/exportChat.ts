// Adapted from obsidian-ai. Platform operations are supplied by the shared host.
import type { ChatSession, ChatMessage } from "../core/types";
export type ExportScope = "single" | "multiple" | "all";
export type ExportFormat = "md" | "json" | "jsonl";
export type ChatExportRequest =
  | {
      kind: "sessions";
      sessions: ChatSession[];
      scope: ExportScope;
      format: ExportFormat;
    }
  | { kind: "messages"; messages: ChatMessage[]; format: "md" };

function formatTimestamp(ts: number): string {
  return new Date(ts).toISOString();
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString();
}

function formatDateForFilename(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}_${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
}

/** --- Markdown export --- */

export function messageToMarkdown(msg: ChatMessage, index: number): string {
  const roleLabel = msg.sender?.name ?? msg.role;
  let body = msg.content;
  const parts =
    msg.contentParts?.filter((part) => part.type === "tool_call") ??
    (msg.toolCalls ?? []).map((call, index) => ({
      type: "tool_call" as const,
      call,
      result: msg.toolResults?.[index],
    }));
  for (const part of parts) {
    body += `\n\n**Tool call** \`${part.call.name}\`\n\n\`\`\`json\n${JSON.stringify(part.call.args, null, 2)}\n\`\`\`\n`;
    if (part.result)
      body += `\n**Result**\n\n\`\`\`json\n${JSON.stringify(part.result, null, 2)}\n\`\`\`\n`;
  }
  return `### ${index + 1}. ${roleLabel}\n*${formatTimestamp(msg.timestamp)}*\n\n${body}\n`;
}

/** Serialize an ordered subset of messages using the same Markdown format as chat exports. */
export function serializeMessagesToMarkdown(messages: ChatMessage[]): string {
  return (
    messages
      .map((message, index) => messageToMarkdown(message, index))
      .join("\n---\n\n") + "\n"
  );
}

function sessionToMarkdown(session: ChatSession): string {
  const title = session.title || `Chat ${formatDate(session.createdAt)}`;
  const tags = sessionTagsToMarkdown(session.tags);
  const header = `# ${title}\n\n*Created:* ${formatDate(session.createdAt)}  \n*Updated:* ${formatDate(session.updatedAt)}  \n*Messages:* ${session.messages.length}${tags}\n\n---\n\n`;
  const body = session.messages
    .map((m, i) => messageToMarkdown(m, i))
    .join("\n---\n\n");
  return header + body + "\n";
}

function sessionTagsToMarkdown(tags?: string[]): string {
  return tags?.length ? `  \n*Tags:* ${JSON.stringify(tags)}` : "";
}

export function serializeToMarkdown(
  sessions: ChatSession[],
  scope: ExportScope,
): string {
  if (scope === "single" && sessions.length === 1) {
    return sessionToMarkdown(sessions[0]);
  }

  const header = `# Exported Chat Sessions\n\n*Exported:* ${formatDate(Date.now())}  \n*Total sessions:* ${sessions.length}  \n*Total messages:* ${sessions.reduce((sum, s) => sum + s.messages.length, 0)}\n\n---\n\n`;
  const body = sessions
    .map((session, idx) => {
      const title = session.title || `Chat ${formatDate(session.createdAt)}`;
      const tags = sessionTagsToMarkdown(session.tags);
      return `## Session ${idx + 1}: ${title}\n\n*Created:* ${formatDate(session.createdAt)}  \n*Messages:* ${session.messages.length}${tags}\n\n${session.messages.map((m, i) => messageToMarkdown(m, i)).join("\n---\n\n")}`;
    })
    .join("\n\n---\n\n");
  return header + body + "\n";
}

/** --- JSON export --- */

export function serializeToJSON(
  sessions: ChatSession[],
  scope: ExportScope,
): string {
  if (scope === "single" && sessions.length === 1)
    return JSON.stringify(sessions[0], null, 2);
  return JSON.stringify(
    {
      _exportedAt: new Date().toISOString(),
      _exportVersion: "1.0",
      count: sessions.length,
      totalMessages: sessions.reduce(
        (sum, session) => sum + session.messages.length,
        0,
      ),
      sessions,
    },
    null,
    2,
  );
}

export function serializeToJSONL(
  sessions: ChatSession[],
  scope: ExportScope,
): string {
  if (scope === "single" && sessions.length === 1) {
    const { messages, ...sessionMetadata } = sessions[0];
    if (!messages.length)
      return (
        JSON.stringify({
          _recordType: "session",
          _sessionMetadata: sessionMetadata,
        }) + "\n"
      );
    return (
      messages
        .map((message, index) =>
          JSON.stringify({
            ...message,
            ...(index === 0 ? { _sessionMetadata: sessionMetadata } : {}),
          }),
        )
        .join("\n") + "\n"
    );
  }
  return sessions.map((session) => JSON.stringify(session)).join("\n") + "\n";
}

/**
 * Canonical serialization entry point for all chat copy and export actions.
 * UI callers select a destination (clipboard or vault); this function owns
 * consistent formatting for every supported export shape.
 */
export function serializeChatExport(request: ChatExportRequest): string {
  if (request.kind === "messages") {
    return serializeMessagesToMarkdown(request.messages);
  }

  switch (request.format) {
    case "md":
      return serializeToMarkdown(request.sessions, request.scope);
    case "json":
      return serializeToJSON(request.sessions, request.scope);
    case "jsonl":
      return serializeToJSONL(request.sessions, request.scope);
  }
}

/** --- Filename generation --- */

export function generateFilename(
  scope: ExportScope,
  format: "md" | "json" | "jsonl",
  sessionTitle?: string,
  appendTimestamp = false,
): string {
  const ts = appendTimestamp ? `_${formatDateForFilename(Date.now())}` : "";
  const ext = format;
  switch (scope) {
    case "single":
      return `${sanitizeFilename(sessionTitle || "chat")}${ts}.${ext}`;
    case "multiple":
      return `chats_export${ts}.${ext}`;
    case "all":
      return `all_chats_export${ts}.${ext}`;
  }
}

function sanitizeFilename(name: string): string {
  return (
    name
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, "-")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "chat"
  );
}
