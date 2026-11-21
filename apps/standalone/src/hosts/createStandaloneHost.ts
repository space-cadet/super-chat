import { ownedService } from "../ownedServices";
import { assertOwnerSession, requireOwnerSession, ownerRequestSignal } from "../ownerSession";
import { loadLocalAccountRecord } from "../persistence";
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
 const credentials = services.credentials ? ownedService<CredentialCapability>({
  ...services.credentials,
  async listCredentials(context) {
   const owner = requireOwnerSession(); const prefix = `owner:${owner.userId}:`;
   const values = await services.credentials!.listCredentials(context);
   return values.filter(value => value.id.startsWith(prefix)).map(value => ({ ...value, id: value.id.slice(prefix.length) }));
  },
  async getCredential(id, context) {
   const owner = requireOwnerSession(); const scoped = `owner:${owner.userId}:${id}`;
   let secret = await services.credentials!.getCredential(scoped, context);
   assertOwnerSession(owner);
   // Only the installation's original account may adopt its legacy secrets.
   if (secret === null && (await loadLocalAccountRecord<{ id: string }>())?.id === owner.userId) {
    assertOwnerSession(owner);
    secret = await services.credentials!.getCredential(id, context);
    assertOwnerSession(owner);
    if (secret !== null && services.credentials!.setCredential) {
     await services.credentials!.setCredential({ id: scoped, label: id }, secret, context);
     assertOwnerSession(owner);
     await services.credentials!.deleteCredential?.(id, context);
    }
   }
   return secret;
  },
  async setCredential(credential, secret, context) {
   const owner = requireOwnerSession();
   if (!services.credentials!.setCredential) throw new Error("Credential storage is unavailable.");
   await services.credentials!.setCredential({ ...credential, id: `owner:${owner.userId}:${credential.id}` }, secret, context);
  },
  async deleteCredential(id, context) {
   const owner = requireOwnerSession();
   await services.credentials!.deleteCredential?.(`owner:${owner.userId}:${id}`, context);
   // Remove the recovery source too, so a deleted key cannot be re-adopted.
   if ((await loadLocalAccountRecord<{ id: string }>())?.id === owner.userId) {
    assertOwnerSession(owner); await services.credentials!.deleteCredential?.(id, context);
   }
  },
 }) : undefined;
 const httpTransport: StandaloneHttpTransport = async request => {
  const owner = requireOwnerSession();
  const response = await services.httpTransport({ ...request, signal: ownerRequestSignal(request.signal) });
  assertOwnerSession(owner); return response;
 };
 const request: StandaloneWebRequester = async (input, signal) => {
  const result = await httpTransport({ ...input, signal });
  return { status: result.status, text: result.text };
 };
 const webDavTransport: WebDAVTransport = (request) => httpTransport({
		...request,
		timeoutMs: 30_000,
	});
	return {
		id: "com.spacecadet.superchat",
		name: "Super Chat",
		platform,
		standalone: {
			diagnostics: services.diagnostics,
			httpTransport,
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
			documents: ownedService(services.documents),
			tools: [
				ownedService(standaloneTools),
				ownedService(standaloneMemoryTools),
				ownedService(createStandaloneSearchDocumentTools({
					credentials,
					request,
				})),
			],
			...(credentials ? { credentials } : {}),
		},
	};
}
