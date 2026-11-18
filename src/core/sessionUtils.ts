import type { ChatSession } from "./types";

export function sessionMessageCount(session: ChatSession): number {
  return session.messages.length;
}

export function getSessionTotalTokens(session: ChatSession): number {
  return session.messages.reduce(
    (total, message) => total + (message.tokenCount ?? 0),
    0,
  );
}
