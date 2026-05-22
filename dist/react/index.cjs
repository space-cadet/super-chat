"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }// src/react/hooks/useChat.ts
var _react = require('react');
function useChat(engine) {
  const [messages, setMessages] = _react.useState.call(void 0, []);
  const [sessions, setSessions] = _react.useState.call(void 0, []);
  const [currentSession, setCurrentSession] = _react.useState.call(void 0, null);
  const [isStreaming, setIsStreaming] = _react.useState.call(void 0, false);
  const [error, setError] = _react.useState.call(void 0, null);
  const [pendingTools, setPendingTools] = _react.useState.call(void 0, []);
  const approvalResolvers = _react.useRef.call(void 0, 
    /* @__PURE__ */ new Map()
  );
  _react.useEffect.call(void 0, () => {
    const sync = () => {
      const session = engine.getActiveSession();
      setCurrentSession(session);
      setMessages(_nullishCoalesce(_optionalChain([session, 'optionalAccess', _ => _.messages]), () => ( [])));
      setIsStreaming(engine.isStreaming);
    };
    sync();
    const interval = setInterval(sync, 100);
    return () => clearInterval(interval);
  }, [engine]);
  _react.useEffect.call(void 0, () => {
    loadSessions();
  }, []);
  const loadSessions = _react.useCallback.call(void 0, async () => {
    const loaded = await engine.loadSessions();
    setSessions(loaded);
  }, [engine]);
  const sendMessage = _react.useCallback.call(void 0, 
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
                if (_optionalChain([last, 'optionalAccess', _2 => _2.role]) === "assistant") {
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
        setMessages(_nullishCoalesce(_optionalChain([session, 'optionalAccess', _3 => _3.messages]), () => ( [])));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setIsStreaming(false);
      }
    },
    [engine]
  );
  const createSession = _react.useCallback.call(void 0, 
    (title) => {
      const session = engine.createSession(title);
      setSessions(engine.getSessions());
      setCurrentSession(session);
      setMessages([]);
      return session;
    },
    [engine]
  );
  const switchSession = _react.useCallback.call(void 0, 
    (sessionId) => {
      const ok = engine.switchSession(sessionId);
      if (ok) {
        const session = engine.getActiveSession();
        setCurrentSession(session);
        setMessages(_nullishCoalesce(_optionalChain([session, 'optionalAccess', _4 => _4.messages]), () => ( [])));
      }
      return ok;
    },
    [engine]
  );
  const deleteSession = _react.useCallback.call(void 0, 
    async (sessionId) => {
      await engine.deleteSession(sessionId);
      setSessions(engine.getSessions());
      const session = engine.getActiveSession();
      setCurrentSession(session);
      setMessages(_nullishCoalesce(_optionalChain([session, 'optionalAccess', _5 => _5.messages]), () => ( [])));
    },
    [engine]
  );
  const archiveSession = _react.useCallback.call(void 0, 
    async (sessionId) => {
      await engine.archiveSession(sessionId);
      setSessions(engine.getSessions());
    },
    [engine]
  );
  const stopStreaming = _react.useCallback.call(void 0, () => {
    engine.stopStreaming();
    setIsStreaming(false);
  }, [engine]);
  const approveTool = _react.useCallback.call(void 0, (callId, result) => {
    const resolver = approvalResolvers.current.get(callId);
    if (resolver) {
      resolver(result);
      approvalResolvers.current.delete(callId);
    }
    setPendingTools((prev) => prev.filter((t) => t.id !== callId));
  }, []);
  const rejectTool = _react.useCallback.call(void 0, (callId, reason) => {
    const resolver = approvalResolvers.current.get(callId);
    if (resolver) {
      resolver({ success: false, error: _nullishCoalesce(reason, () => ( "User rejected")) });
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

function useAgent(initialAgents = []) {
  const [agents, setAgents] = _react.useState.call(void 0, initialAgents);
  const [responses, setResponses] = _react.useState.call(void 0, []);
  const [isRunning, setIsRunning] = _react.useState.call(void 0, false);
  const [error, setError] = _react.useState.call(void 0, null);
  const dispatch = _react.useCallback.call(void 0, 
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
  const addAgent = _react.useCallback.call(void 0, (agent) => {
    setAgents((prev) => [...prev, agent]);
  }, []);
  const removeAgent = _react.useCallback.call(void 0, (agentId) => {
    setAgents((prev) => prev.filter((a) => a.id !== agentId));
    setResponses((prev) => prev.filter((r) => r.agentId !== agentId));
  }, []);
  const clearResponses = _react.useCallback.call(void 0, () => {
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



exports.useAgent = useAgent; exports.useChat = useChat;
//# sourceMappingURL=index.cjs.map