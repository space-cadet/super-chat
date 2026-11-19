import type {
	CredentialCapability,
	DocumentCapability,
	LifecycleCapability,
	SuperChatHost,
} from "super-chat/contracts";
import type { DiagnosticsCapability } from "../diagnostics";
import type { WebDAVTransport } from "../../../../src/sync/WebDAVStorageAdapter";
import { standaloneMemoryTools } from "../memory";
import { standalonePersistence } from "../persistence";
import { getProviderProfileSnapshot, subscribeStandaloneProviderSettings } from "../providerSettings";
import { createStandaloneSearchDocumentTools, type StandaloneWebRequester } from "../searchDocuments";
import { standaloneTools } from "../tools";

export type StandalonePlatform = "web" | "android" | "desktop";

export interface StandaloneHttpRequest {
	url: string;
	method: string;
	headers?: Record<string, string>;
	body?: string;
	timeoutMs?: number;
	signal?: AbortSignal;
}

export interface StandaloneHttpResponse {
	status: number;
	text: string;
	headers: Record<string, string>;
}

export type StandaloneHttpTransport = (request: StandaloneHttpRequest) => Promise<StandaloneHttpResponse>;

export interface StandalonePlatformServices {
	documents: DocumentCapability;
	diagnostics: DiagnosticsCapability;
	lifecycle: LifecycleCapability;
	credentials?: CredentialCapability;
	httpTransport: StandaloneHttpTransport;
	request?: StandaloneWebRequester;
}

export interface StandaloneAppHost extends SuperChatHost {
	platform: StandalonePlatform;
	standalone: {
		diagnostics: DiagnosticsCapability;
		httpTransport: StandaloneHttpTransport;
		webDavTransport: WebDAVTransport;
	};
}

/** Compose shared app capabilities with the services owned by one platform. */
export function createStandaloneHost(
	platform: StandalonePlatform,
	services: StandalonePlatformServices,
): StandaloneAppHost {
	const webDavTransport: WebDAVTransport = (request) => services.httpTransport({
		...request,
		timeoutMs: 30_000,
	});
	return {
		id: "com.spacecadet.superchat",
		name: "Super Chat",
		platform,
		standalone: {
			diagnostics: services.diagnostics,
			httpTransport: services.httpTransport,
			webDavTransport,
		},
		capabilities: {
			lifecycle: services.lifecycle,
			providerProfiles: {
				id: "standalone-provider-profiles",
				kind: "provider-profiles",
				getSnapshot: () => getProviderProfileSnapshot(),
				subscribe: subscribeStandaloneProviderSettings,
			},
			persistence: standalonePersistence,
			documents: services.documents,
			tools: [
				standaloneTools,
				standaloneMemoryTools,
				createStandaloneSearchDocumentTools({
					credentials: services.credentials,
					request: services.request,
				}),
			],
			...(services.credentials ? { credentials: services.credentials } : {}),
		},
	};
}
