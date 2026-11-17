import { Capacitor, registerPlugin } from "@capacitor/core";
import type {
	CredentialCapability,
	CredentialReference,
} from "super-chat/contracts";

interface StoredCredentialReference {
	id: string;
	label: string;
	provider?: string;
}

interface SecureCredentialsPlugin {
	listCredentials(): Promise<{ credentials: StoredCredentialReference[] }>;
	getCredential(options: { id: string }): Promise<{ secret: string | null }>;
	setCredential(options: {
		id: string;
		label: string;
		provider?: string;
		secret: string;
	}): Promise<void>;
	deleteCredential(options: { id: string }): Promise<void>;
}

const SecureCredentials = registerPlugin<SecureCredentialsPlugin>("SecureCredentials");

export const androidCredentialCapability: CredentialCapability = {
	id: "android-keystore-credentials",
	kind: "credentials",
	async listCredentials(_context): Promise<CredentialReference[]> {
		const result = await SecureCredentials.listCredentials();
		return result.credentials.map((credential) => ({ ...credential }));
	},
	async getCredential(credentialId, _context) {
		const result = await SecureCredentials.getCredential({ id: credentialId });
		return result.secret;
	},
	async setCredential(credential, secret, _context) {
		await SecureCredentials.setCredential({
			id: credential.id,
			label: credential.label,
			...(credential.provider ? { provider: credential.provider } : {}),
			secret,
		});
	},
	async deleteCredential(credentialId, _context) {
		await SecureCredentials.deleteCredential({ id: credentialId });
	},
};

export const hasAndroidSecureCredentials =
	Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
