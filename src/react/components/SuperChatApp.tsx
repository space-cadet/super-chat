import { useEffect, useState } from "react";
import type { ChatEngine } from "../../core/ChatEngine";
import type { LLMAdapter } from "../../core/types";
import { createExternalSessionIdentity } from "../../core/sessionPersistence";
import type { SuperChatHost } from "../../contracts/host";
import { createChatEngineForHost } from "../../adapters/HostAdapters";
import { ChatApp } from "./ChatApp";

export interface SuperChatAppProps {
  host: SuperChatHost;
  /** Optional when the host exposes its adapter as `llmAdapter`. */
  llmAdapter?: LLMAdapter;
  initialSessionId?: string;
  onNewChat?: () => void;
}

type HostWithLLMAdapter = SuperChatHost & { llmAdapter?: LLMAdapter };

/**
 * Host-facing entry point. Products provide neutral capabilities and an LLM;
 * the shared UI owns the engine lifecycle and session initialization.
 */
export function SuperChatApp({
  host,
  llmAdapter,
  initialSessionId,
  onNewChat,
}: SuperChatAppProps) {
  const [engine, setEngine] = useState<ChatEngine | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const resolvedAdapter = llmAdapter ?? (host as HostWithLLMAdapter).llmAdapter;

    if (!resolvedAdapter) {
      setError("SuperChatApp needs an LLM adapter from the host or llmAdapter prop.");
      return () => undefined;
    }

    setEngine(null);
    setError(null);

    void (async () => {
      try {
        const nextEngine = await createChatEngineForHost({
          host,
          llmAdapter: resolvedAdapter,
        });
        await nextEngine.loadSessions();

        if (initialSessionId) {
          nextEngine.switchSession(initialSessionId);
        }

        if (!nextEngine.getActiveSession()) {
          const identity = host.capabilities.identity
            ? await host.capabilities.identity.getIdentity({
                requestId: `super-chat-${Date.now()}`,
              })
            : null;
          nextEngine.createSession(
            identity?.displayName ? `${identity.displayName}'s Chat` : "New Chat",
            identity
              ? createExternalSessionIdentity(host.id, identity.id, host.version)
              : undefined,
          );
          await nextEngine.saveSession();
        }

        if (cancelled) {
          nextEngine.dispose();
          return;
        }
        setEngine(nextEngine);
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [host, initialSessionId, llmAdapter]);

  useEffect(() => () => engine?.dispose(), [engine]);

  if (error) {
    return (
      <div role="alert" className="p-4 text-sm text-red-700 bg-red-50">
        {error}
      </div>
    );
  }

  if (!engine) {
    return <div className="p-4 text-sm text-gray-500">Loading {host.name}…</div>;
  }

  return <ChatApp engine={engine} initialSessionId={initialSessionId} onNewChat={onNewChat} />;
}
