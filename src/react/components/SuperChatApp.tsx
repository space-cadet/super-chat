import { useEffect, useRef, useState } from "react";
import type { ChatEngine } from "../../core/ChatEngine";
import type { LLMAdapter } from "../../core/types";
import { createExternalSessionIdentity } from "../../core/sessionPersistence";
import type { HostOperationContext, ProviderProfileSnapshot, SuperChatHost } from "../../contracts/host";
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
 onOpenSettings?: () => void;
}

type HostWithLLMAdapter = SuperChatHost & { llmAdapter?: LLMAdapter };

interface Initialization {
	host: SuperChatHost;
	llmAdapter: LLMAdapter;
	enginePromise: Promise<ChatEngine>;
	hydrationPromise?: Promise<ProviderProfileSnapshot | null>;
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

function hydrateInitialization(initialization: Initialization): Promise<ProviderProfileSnapshot | null> {
	if (!initialization.hydrationPromise) {
		initialization.hydrationPromise = initialization.enginePromise.then(async (engine) => {
			const sessions = await engine.loadSessions();
			console.info("[super-chat] sessions loaded", { count: sessions.length });
			const providerCapability = initialization.host.capabilities.providerProfiles;
			const profiles = providerCapability
				? await providerCapability.getSnapshot({ requestId: `super-chat-profiles-${Date.now()}` })
				: null;
			const defaultProfile = profiles?.profiles.find((profile) => profile.id === profiles.defaultProfileId);
			engine.setDefaultModelSelection(defaultProfile ? {
				providerProfileId: defaultProfile.id,
				provider: defaultProfile.provider,
				model: defaultProfile.model,
			} : null);

			if (profiles) {
				for (const session of sessions) {
					const selected = profiles.profiles.find((profile) => profile.id === session.llmProfileId)
						?? profiles.profiles.find((profile) => profile.provider === session.llmProvider)
						?? defaultProfile;
					if (selected && (session.llmProfileId !== selected.id || !session.llmModel || session.llmProvider !== selected.provider)) {
						await engine.setSessionModelSelection(session.id, {
							providerProfileId: selected.id,
							provider: selected.provider,
							model: session.llmProvider === selected.provider && session.llmModel ? session.llmModel : selected.model,
						});
					}
				}
			}

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
			return profiles;
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
 onOpenSettings,
}: SuperChatAppProps) {
	const [engine, setEngine] = useState<ChatEngine | null>(null);
	const [providerProfiles, setProviderProfiles] = useState<ProviderProfileSnapshot | null>(null);
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
			return hydrateInitialization(initialization)
				.then((snapshot) => {
					if (cancelled) return;
					setProviderProfiles(snapshot);
					setEngine(nextEngine);
					if (initialSessionId) nextEngine.switchSession(initialSessionId);
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
		const capability = host.capabilities.providerProfiles;
		if (!engine || !capability) return undefined;
		let disposed = false;
		const refresh = async () => {
			const snapshot = await capability.getSnapshot({ requestId: `super-chat-profiles-${Date.now()}` });
			if (disposed) return;
			setProviderProfiles(snapshot);
			const defaultProfile = snapshot.profiles.find((profile) => profile.id === snapshot.defaultProfileId);
			engine.setDefaultModelSelection(defaultProfile ? {
				providerProfileId: defaultProfile.id,
				provider: defaultProfile.provider,
				model: defaultProfile.model,
			} : null);
			if (!engine.isStreaming) {
				for (const session of engine.getSessions()) {
					const selected = snapshot.profiles.find((profile) => profile.id === session.llmProfileId)
						?? snapshot.profiles.find((profile) => profile.provider === session.llmProvider)
						?? defaultProfile;
					if (selected && (session.llmProfileId !== selected.id || session.llmProvider !== selected.provider || !session.llmModel)) {
						await engine.setSessionModelSelection(session.id, {
							providerProfileId: selected.id,
							provider: selected.provider,
							model: session.llmProvider === selected.provider && session.llmModel ? session.llmModel : selected.model,
						});
					}
				}
			}
		};
		const unsubscribe = capability.subscribe?.(() => {
			void refresh().catch((cause) => console.error("[super-chat] provider profile refresh failed:", cause));
		});
		void refresh().catch((cause) => console.error("[super-chat] provider profile load failed:", cause));
		return () => {
			disposed = true;
			unsubscribe?.();
		};
	}, [engine, host]);

	useEffect(() => {
		if (cacheKey) return undefined;
		return () => engine?.dispose();
	}, [cacheKey, engine]);

	useEffect(() => {
		const lifecycle = host.capabilities.lifecycle;
		if (!engine || !lifecycle) return undefined;
		let disposed = false;
		const context: HostOperationContext = {
			requestId: `super-chat-lifecycle-${Date.now()}`,
		};
		const unsubscribe = lifecycle.subscribeVisibility?.((visible) => {
			if (visible) return;
			void engine.saveSession().catch((cause) => {
				const message = cause instanceof Error ? cause.message : String(cause);
				console.error("[super-chat] background save failed:", message);
			});
		});
		void Promise.resolve()
			.then(() => disposed ? undefined : lifecycle.start?.(context))
			.catch((cause) => {
				const message = cause instanceof Error ? cause.message : String(cause);
				console.error("[super-chat] host lifecycle start failed:", message);
			});

		return () => {
			disposed = true;
			unsubscribe?.();
			void Promise.resolve()
				.then(() => lifecycle.stop?.(context))
				.catch((cause) => {
					const message = cause instanceof Error ? cause.message : String(cause);
					console.error("[super-chat] host lifecycle stop failed:", message);
				});
		};
	}, [engine, host]);

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
			providerProfiles={providerProfiles}
			initialSessionId={initialSessionId}
			onNewChat={onNewChat}
 onOpenSettings={onOpenSettings}
			loadSessionsOnMount={false}
		/>
	);
}
