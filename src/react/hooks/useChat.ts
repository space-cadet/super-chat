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

import { useState, useCallback, useEffect } from "react";
import type {
  ChatMessage,
  ChatSession,
  RetrievalSnapshot,
  ToolCall,
} from "../../core/types";
import type { ChatEngine } from "../../core/ChatEngine";

export interface UseChatState {
  messages: ChatMessage[];
  sessions: ChatSession[];
  openSessionIds: string[];
  currentSession: ChatSession | null;
  isStreaming: boolean;
  error: string | null;
  pendingTools: ToolCall[];
  retrieval: RetrievalSnapshot;
}

export interface UseChatActions {
  sendMessage: (text: string) => Promise<void>;
  createSession: (title?: string) => ChatSession;
  switchSession: (sessionId: string) => boolean;
  openSession: (sessionId: string) => boolean;
  closeSessionTab: (sessionId: string) => boolean;
  deleteSession: (sessionId: string) => Promise<void>;
  archiveSession: (sessionId: string) => Promise<void>;
  stopStreaming: () => void;
  approveTool: (callId: string) => boolean;
  rejectTool: (callId: string, reason?: string) => void;
  loadSessions: () => Promise<void>;
  replayMessage: (messageId: string) => Promise<void>;
}

export type UseChatReturn = UseChatState & UseChatActions;

function getOpenSessionIds(engine: ChatEngine): string[] {
  return engine.getOpenSessionIds?.() ?? [];
}

export function useChat(
	engine: ChatEngine,
	options?: { initialSessionId?: string; loadSessionsOnMount?: boolean },
): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [openSessionIds, setOpenSessionIds] = useState<string[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingTools, setPendingTools] = useState<ToolCall[]>([]);
  const [retrieval, setRetrieval] = useState<RetrievalSnapshot>({
    status: "idle",
    progress: 0,
    sources: [],
    warnings: [],
  });

  // Sync with engine state
  useEffect(() => {
    const sync = () => {
      const session = engine.getActiveSession();
      setCurrentSession(session);
      setMessages(session?.messages ?? []);
      setIsStreaming(engine.isStreaming);
      setSessions(engine.getSessions());
      setOpenSessionIds(getOpenSessionIds(engine));
    };

    sync();
    return engine.subscribe((snapshot) => {
      const session = engine.getActiveSession();
      setSessions(snapshot.sessions);
      setOpenSessionIds(snapshot.openSessionIds);
      setCurrentSession(session);
      setIsStreaming(snapshot.isStreaming);
      setPendingTools(snapshot.pendingApprovals);
      if (snapshot.retrieval) setRetrieval(snapshot.retrieval);
      if (!snapshot.isStreaming) {
        setMessages(session?.messages ?? []);
      }
    });
  }, [engine]);

  const loadSessions = useCallback(async () => {
    const loaded = await engine.loadSessions();
    setSessions(loaded);
    setOpenSessionIds(getOpenSessionIds(engine));
  }, [engine]);

  // Load sessions on mount + optionally switch to initial session
	useEffect(() => {
		if (options?.loadSessionsOnMount === false) return;

		void loadSessions().then(() => {
			if (options?.initialSessionId) {
				engine.switchSession(options.initialSessionId);
				const session = engine.getActiveSession();
				setCurrentSession(session);
				setMessages(session?.messages ?? []);
			}
		}).catch((err) => {
			const message = err instanceof Error ? err.message : String(err);
			setError(message);
			console.error("[super-chat] session load failed:", message);
		});
	}, [engine, loadSessions, options?.initialSessionId, options?.loadSessionsOnMount]);

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
                return [
                  ...prev,
                  {
                    id: "streaming-assistant",
                    role: "assistant",
                    content: assistantText,
                    timestamp: Date.now(),
                    sender: { id: "assistant", name: "Assistant", kind: "assistant" },
                  },
                ];
              });
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
      setOpenSessionIds(getOpenSessionIds(engine));
      setCurrentSession(session);
      setMessages([]);
      return session;
    },
    [engine]
  );

  const replayMessage = useCallback(
    async (messageId: string) => {
      setError(null);
      setIsStreaming(true);
      try {
        for await (const event of engine.replayMessage(messageId)) {
          if (event.type === "error") setError(event.message);
        }
        const session = engine.getActiveSession();
        setCurrentSession(session);
        setMessages(session?.messages ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsStreaming(false);
      }
    },
    [engine],
  );

  const switchSession = useCallback(
    (sessionId: string) => {
      const ok = engine.switchSession(sessionId);
      if (ok) {
        const session = engine.getActiveSession();
        setCurrentSession(session);
        setMessages(session?.messages ?? []);
        setOpenSessionIds(getOpenSessionIds(engine));
      }
      return ok;
    },
    [engine]
  );

  const openSession = useCallback(
    (sessionId: string) => {
      const ok = engine.openSession?.(sessionId) ?? engine.switchSession(sessionId);
      if (ok) {
        const session = engine.getActiveSession();
        setCurrentSession(session);
        setMessages(session?.messages ?? []);
        setOpenSessionIds(getOpenSessionIds(engine));
      }
      return ok;
    },
    [engine],
  );

  const closeSessionTab = useCallback(
    (sessionId: string) => {
      const ok = engine.closeSessionTab?.(sessionId) ?? false;
      if (ok) {
        const session = engine.getActiveSession();
        setCurrentSession(session);
        setMessages(session?.messages ?? []);
        setOpenSessionIds(getOpenSessionIds(engine));
      }
      return ok;
    },
    [engine],
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

  const approveTool = useCallback(
    (callId: string) => engine.approveTool(callId),
    [engine]
  );

  const rejectTool = useCallback((callId: string, reason?: string) => {
    void reason;
    engine.rejectTool(callId);
  }, [engine]);

  return {
    messages,
    sessions,
    openSessionIds,
    currentSession,
    isStreaming,
    error,
    pendingTools,
    retrieval,
    sendMessage,
    createSession,
    switchSession,
    openSession,
    closeSessionTab,
    deleteSession,
    archiveSession,
    stopStreaming,
    approveTool,
    rejectTool,
    loadSessions,
    replayMessage,
  };
}
