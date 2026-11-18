import { standaloneMemoryTools } from "./memory";
import { standaloneDocuments } from "./documents";
import type { SuperChatHost } from "super-chat/contracts";
import { androidCredentialCapability, hasAndroidSecureCredentials } from "./androidCredentials";
import { standaloneLifecycle } from "./lifecycle";
import { standalonePersistence } from "./persistence";
import { getProviderProfileSnapshot, subscribeStandaloneProviderSettings } from "./providerSettings";
import { standaloneTools } from "./tools";

/** Android and desktop standalone shells expose host services through this contract. */
export const standaloneHost: SuperChatHost = {
	id: "com.spacecadet.superchat",
	name: "Super Chat",
	capabilities: {
		lifecycle: standaloneLifecycle,
		providerProfiles: {
			id: "standalone-provider-profiles",
			kind: "provider-profiles",
			getSnapshot: () => getProviderProfileSnapshot(),
			subscribe: subscribeStandaloneProviderSettings,
		},
		persistence: standalonePersistence,
		documents: standaloneDocuments,
		tools: [standaloneTools, standaloneMemoryTools],
		...(hasAndroidSecureCredentials ? { credentials: androidCredentialCapability } : {}),
	},
};
