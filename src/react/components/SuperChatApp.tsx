import { useEffect, useRef, useState } from "react";
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
	/** Stable key used to reuse an engine across route unmounts. */
	cacheKey?: string;
	initialSessionId?: string;
	onNewChat?: () => void;
}

type HostWithLLMAdapter = SuperChatHost & { llmAdapter?: LLMAdapter };

interface Initialization {
	host: SuperChatHost;
	llmAdapter: LLMAdapter;
	enginePromise: Promise<ChatEngine>;
	hydrationPromise?: Promise<void>;
}

const cachedInitializations = new Map<string, Initialization>();

function createInitialization(
	host: SuperChatHost,
	llmAdapter: LLMAdapter,
): Initialization {
	const initialization: Initialization = {
		host,
		llmAdapter,
		enginePromise: (async () => {
			console.info("[super-chat] initializing");
			return createChatEngineForHost({ host, llmAdapter });
		})(),
	};

	return initialization;
}

function hydrateInitialization(initialization: Initialization): Promise<void> {
	if (!initialization.hydrationPromise) {
		initialization.hydrationPromise = initialization.enginePromise.then(async (engine) => {
			const sessions = await engine.loadSessions();
			console.info("[super-chat] sessions loaded", { count: sessions.length });

			if (!engine.getActiveSession()) {
				const identity = initialization.host.capabilities.identity
					? await initialization.host.capabilities.identity.getIdentity({
							requestId: `super-chat-${Date.now()}`,
						})
					: null;
				engine.createSession(
					identity?.displayName ? `${identity.displayName}'s Chat` : "New Chat",
					identity
						? createExternalSessionIdentity(
								initialization.host.id,
								identity.id,
								initialization.host.version,
							)
						: undefined,
				);
				await engine.saveSession();
			}
		});
	}

	return initialization.hydrationPromise;
}

function evictCachedInitialization(
	cacheKey: string | undefined,
	initialization: Initialization,
): void {
	if (cacheKey && cachedInitializations.get(cacheKey) === initialization) {
		cachedInitializations.delete(cacheKey);
	}
}

/**
 * Host-facing entry point. Products provide neutral capabilities and an LLM;
 * the shared UI owns the engine lifecycle and session initialization.
 */
export function SuperChatApp({
	host,
	llmAdapter,
	cacheKey,
	initialSessionId,
	onNewChat,
}: SuperChatAppProps) {
	const [engine, setEngine] = useState<ChatEngine | null>(null);
	const [error, setError] = useState<string | null>(null);
	const initializationRef = useRef<Initialization | null>(null);

  useEffect(() => {
    let cancelled = false;
    const resolvedAdapter = llmAdapter ?? (host as HostWithLLMAdapter).llmAdapter;

    if (!resolvedAdapter) {
		setError("SuperChatApp needs an LLM adapter from the host or llmAdapter prop.");
		return () => undefined;
	}

	const previousInitialization = initializationRef.current;
	const cached = cacheKey ? cachedInitializations.get(cacheKey) : undefined;
	const initialization =
		cached ??
		(previousInitialization &&
		previousInitialization.host === host &&
		previousInitialization.llmAdapter === resolvedAdapter
			? previousInitialization
			: createInitialization(host, resolvedAdapter));

	if (cacheKey && !cached) {
		cachedInitializations.set(cacheKey, initialization);
	}
	initializationRef.current = initialization;

	if (previousInitialization !== initialization) {
		setEngine(null);
		setError(null);
	}

	void initialization.enginePromise
		.then((nextEngine) => {
			if (cancelled) return;
			setEngine(nextEngine);

			return hydrateInitialization(initialization)
				.then(() => {
					if (!cancelled && initialSessionId) {
						nextEngine.switchSession(initialSessionId);
					}
				})
				.catch((cause) => {
					evictCachedInitialization(cacheKey, initialization);
					if (!cancelled) {
						const message = cause instanceof Error ? cause.message : String(cause);
						console.error("[super-chat] session hydration failed:", message);
						setError(message);
					}
				});
		})
		.catch((cause) => {
			evictCachedInitialization(cacheKey, initialization);
			if (!cancelled) {
				const message = cause instanceof Error ? cause.message : String(cause);
				console.error("[super-chat] initialization failed:", message);
				setError(message);
			}
		});

    return () => {
      cancelled = true;
    };
	}, [cacheKey, host, initialSessionId, llmAdapter]);

	useEffect(() => {
		if (cacheKey) return undefined;
		return () => engine?.dispose();
	}, [cacheKey, engine]);

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

	return (
		<ChatApp
			engine={engine}
			initialSessionId={initialSessionId}
			onNewChat={onNewChat}
			loadSessionsOnMount={false}
		/>
	);
}
