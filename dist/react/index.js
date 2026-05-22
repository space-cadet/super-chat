// src/react/hooks/useChat.ts
import { useState, useCallback, useRef, useEffect } from "react";
function useChat(engine) {
  const [messages, setMessages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [pendingTools, setPendingTools] = useState([]);
  const approvalResolvers = useRef(
    /* @__PURE__ */ new Map()
  );
  useEffect(() => {
    const sync = () => {
      const session = engine.getActiveSession();
      setCurrentSession(session);
      setMessages(session?.messages ?? []);
      setIsStreaming(engine.isStreaming);
    };
    sync();
    const interval = setInterval(sync, 100);
    return () => clearInterval(interval);
  }, [engine]);
  useEffect(() => {
    loadSessions();
  }, []);
  const loadSessions = useCallback(async () => {
    const loaded = await engine.loadSessions();
    setSessions(loaded);
  }, [engine]);
  const sendMessage = useCallback(
    async (text) => {
      setError(null);
      setIsStreaming(true);
      try {
        const stream = engine.sendMessage(text);
        let assistantText = "";
        for await (const event of stream) {
          switch (event.type) {
            case "text-delta":
              assistantText += event.text;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return [
                    ...prev.slice(0, -1),
                    { ...last, content: assistantText }
                  ];
                }
                return prev;
              });
              break;
            case "tool-call":
              setPendingTools((prev) => [...prev, event.call]);
              break;
            case "tool-result":
              setPendingTools(
                (prev) => prev.filter((t) => t.id !== event.callId)
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
    (title) => {
      const session = engine.createSession(title);
      setSessions(engine.getSessions());
      setCurrentSession(session);
      setMessages([]);
      return session;
    },
    [engine]
  );
  const switchSession = useCallback(
    (sessionId) => {
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
    async (sessionId) => {
      await engine.deleteSession(sessionId);
      setSessions(engine.getSessions());
      const session = engine.getActiveSession();
      setCurrentSession(session);
      setMessages(session?.messages ?? []);
    },
    [engine]
  );
  const archiveSession = useCallback(
    async (sessionId) => {
      await engine.archiveSession(sessionId);
      setSessions(engine.getSessions());
    },
    [engine]
  );
  const stopStreaming = useCallback(() => {
    engine.stopStreaming();
    setIsStreaming(false);
  }, [engine]);
  const approveTool = useCallback((callId, result) => {
    const resolver = approvalResolvers.current.get(callId);
    if (resolver) {
      resolver(result);
      approvalResolvers.current.delete(callId);
    }
    setPendingTools((prev) => prev.filter((t) => t.id !== callId));
  }, []);
  const rejectTool = useCallback((callId, reason) => {
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
    loadSessions
  };
}

// src/react/hooks/useAgent.ts
import { useState as useState2, useCallback as useCallback2 } from "react";
function useAgent(initialAgents = []) {
  const [agents, setAgents] = useState2(initialAgents);
  const [responses, setResponses] = useState2([]);
  const [isRunning, setIsRunning] = useState2(false);
  const [error, setError] = useState2(null);
  const dispatch = useCallback2(
    async (text, mode = "sequential") => {
      setError(null);
      setIsRunning(true);
      setResponses([]);
      try {
        if (mode === "parallel") {
          const promises = agents.map(async (agent) => {
            const stream = agent.engine.sendMessage(text);
            let content = "";
            for await (const event of stream) {
              if (event.type === "text-delta") {
                content += event.text;
              }
            }
            const response = {
              agentId: agent.id,
              agentName: agent.name,
              message: {
                id: `resp-${agent.id}-${Date.now()}`,
                role: "assistant",
                content,
                timestamp: Date.now()
              }
            };
            setResponses((prev) => [...prev, response]);
            return response;
          });
          await Promise.all(promises);
        } else {
          for (const agent of agents) {
            const stream = agent.engine.sendMessage(text);
            let content = "";
            for await (const event of stream) {
              if (event.type === "text-delta") {
                content += event.text;
              }
            }
            const response = {
              agentId: agent.id,
              agentName: agent.name,
              message: {
                id: `resp-${agent.id}-${Date.now()}`,
                role: "assistant",
                content,
                timestamp: Date.now()
              }
            };
            setResponses((prev) => [...prev, response]);
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      } finally {
        setIsRunning(false);
      }
    },
    [agents]
  );
  const addAgent = useCallback2((agent) => {
    setAgents((prev) => [...prev, agent]);
  }, []);
  const removeAgent = useCallback2((agentId) => {
    setAgents((prev) => prev.filter((a) => a.id !== agentId));
    setResponses((prev) => prev.filter((r) => r.agentId !== agentId));
  }, []);
  const clearResponses = useCallback2(() => {
    setResponses([]);
  }, []);
  return {
    agents,
    responses,
    isRunning,
    error,
    dispatch,
    addAgent,
    removeAgent,
    clearResponses
  };
}
export {
  useAgent,
  useChat
};
//# sourceMappingURL=index.js.map