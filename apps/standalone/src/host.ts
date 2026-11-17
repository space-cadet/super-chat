import type { SuperChatHost } from "super-chat/contracts";
import { androidCredentialCapability, hasAndroidSecureCredentials } from "./androidCredentials";
import { standaloneLifecycle } from "./lifecycle";
import { standalonePersistence } from "./persistence";
import { standaloneTools } from "./tools";

/** Android and desktop standalone shells expose host services through this contract. */
export const standaloneHost: SuperChatHost = {
	id: "com.spacecadet.superchat",
	name: "Super Chat",
	capabilities: {
		lifecycle: standaloneLifecycle,
		persistence: standalonePersistence,
		tools: standaloneTools,
		...(hasAndroidSecureCredentials ? { credentials: androidCredentialCapability } : {}),
	},
};
