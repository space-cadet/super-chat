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

import { useState, useCallback, useRef, useEffect } from "react";
import type {
  ChatMessage,
  ChatSession,
  ToolCall,
  ToolResult,
} from "../../core/types";
import type { ChatEngine } from "../../core/ChatEngine";

export interface UseChatState {
  messages: ChatMessage[];
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  isStreaming: boolean;
  error: string | null;
  pendingTools: ToolCall[];
}

export interface UseChatActions {
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

export type UseChatReturn = UseChatState & UseChatActions;

export function useChat(engine: ChatEngine): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingTools, setPendingTools] = useState<ToolCall[]>([]);

  // Track pending approvals
  const approvalResolvers = useRef<Map<string, (result: ToolResult) => void>>(
    new Map()
  );

  // Sync with engine state
  useEffect(() => {
    const sync = () => {
      const session = engine.getActiveSession();
      setCurrentSession(session);
      setMessages(session?.messages ?? []);
      setIsStreaming(engine.isStreaming);
    };

    sync();
    // Poll for engine state changes (engine doesn't have events yet)
    const interval = setInterval(sync, 100);
    return () => clearInterval(interval);
  }, [engine]);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = useCallback(async () => {
    const loaded = await engine.loadSessions();
    setSessions(loaded);
  }, [engine]);

  const sendMessage = useCallback(
    async (text: string) => {
      setError(null);
      setIsStreaming(true);

      try {
        const stream = engine.sendMessage(text);
        let assistantText = "";

        for await (const event of stream) {
          switch (event.type) {
            case "text-delta":
              assistantText += event.text;
              // Update messages with streaming text
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return [
                    ...prev.slice(0, -1),
                    { ...last, content: assistantText },
                  ];
                }
                return prev;
              });
              break;

            case "tool-call":
              // Tool call detected — add to pending
              setPendingTools((prev) => [...prev, event.call]);
              break;

            case "tool-result":
              // Remove from pending
              setPendingTools((prev) =>
                prev.filter((t) => t.id !== event.callId)
              );
              break;

            case "error":
              setError(event.message);
              break;

            case "finish":
              setIsStreaming(false);
              break;
          }
        }

        // Refresh session state
        const session = engine.getActiveSession();
        setCurrentSession(session);
        setMessages(session?.messages ?? []);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setIsStreaming(false);
      }
    },
    [engine]
  );

  const createSession = useCallback(
    (title?: string) => {
      const session = engine.createSession(title);
      setSessions(engine.getSessions());
      setCurrentSession(session);
      setMessages([]);
      return session;
    },
    [engine]
  );

  const switchSession = useCallback(
    (sessionId: string) => {
      const ok = engine.switchSession(sessionId);
      if (ok) {
        const session = engine.getActiveSession();
        setCurrentSession(session);
        setMessages(session?.messages ?? []);
      }
      return ok;
    },
    [engine]
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
      await engine.deleteSession(sessionId);
      setSessions(engine.getSessions());
      const session = engine.getActiveSession();
      setCurrentSession(session);
      setMessages(session?.messages ?? []);
    },
    [engine]
  );

  const archiveSession = useCallback(
    async (sessionId: string) => {
      await engine.archiveSession(sessionId);
      setSessions(engine.getSessions());
    },
    [engine]
  );

  const stopStreaming = useCallback(() => {
    engine.stopStreaming();
    setIsStreaming(false);
  }, [engine]);

  const approveTool = useCallback((callId: string, result: ToolResult) => {
    const resolver = approvalResolvers.current.get(callId);
    if (resolver) {
      resolver(result);
      approvalResolvers.current.delete(callId);
    }
    setPendingTools((prev) => prev.filter((t) => t.id !== callId));
  }, []);

  const rejectTool = useCallback((callId: string, reason?: string) => {
    const resolver = approvalResolvers.current.get(callId);
    if (resolver) {
      resolver({ success: false, error: reason ?? "User rejected" });
      approvalResolvers.current.delete(callId);
    }
    setPendingTools((prev) => prev.filter((t) => t.id !== callId));
  }, []);

  return {
    messages,
    sessions,
    currentSession,
    isStreaming,
    error,
    pendingTools,
    sendMessage,
    createSession,
    switchSession,
    deleteSession,
    archiveSession,
    stopStreaming,
    approveTool,
    rejectTool,
    loadSessions,
  };
}
