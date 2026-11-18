import {
	createProviderProfile,
	VercelLLMAdapter,
	type ModelInfo,
	type ProviderInfo,
	type ProviderType,
} from "super-chat";
import type { ProviderProfileSnapshot, ProviderProfileSummary } from "super-chat/contracts";
import { standaloneSettingsStore } from "./persistence";

export type StandaloneProvider = Exclude<ProviderType, "azure">;

export interface StandaloneProviderProfile {
	id: string;
	name: string;
	provider: StandaloneProvider;
	model: string;
	baseUrl?: string;
	/** Reference only; the credential itself stays in Android Keystore. */
	credentialId?: string;
	createdAt: number;
	updatedAt: number;
}

export interface StandaloneProviderSettings {
	profiles: StandaloneProviderProfile[];
	defaultProfileId: string | null;
}

const SETTINGS_KEY = "standalone.provider-profiles";
const LEGACY_SETTINGS_KEY = "standalone.model-provider";
const providerCatalog = new VercelLLMAdapter({
	profile: createProviderProfile("openai", "gpt-4o-mini", ""),
}).getProviders();
const supportedProviderIds = new Set(
	providerCatalog.filter((provider) => provider.id !== "azure").map((provider) => provider.id),
);
const listeners = new Set<() => void>();

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isStandaloneProvider(value: string): value is StandaloneProvider {
	return value !== "azure" && supportedProviderIds.has(value);
}

export function getStandaloneProviders(): ProviderInfo[] {
	return providerCatalog.filter((provider) => provider.id !== "azure");
}

export function getStandaloneModels(provider: StandaloneProvider): ModelInfo[] {
	const profile = createProviderProfile(provider, "model", "");
	return new VercelLLMAdapter({ profile }).getModels(provider);
}

export function createStandaloneProfileId(): string {
	if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
	return `profile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function validateBaseUrl(value: unknown, provider: StandaloneProvider): string | undefined {
	if (value === undefined || value === "") return undefined;
	if (typeof value !== "string" || value.length > 2048) throw new Error("The provider URL is invalid.");
	let url: URL;
	try {
		url = new URL(value.trim());
	} catch {
		throw new Error("Enter a complete provider URL, including https://.");
	}
	if (url.username || url.password || url.search || url.hash) {
		throw new Error("Provider URLs cannot contain credentials, query strings, or fragments.");
	}
	if (url.protocol === "https:") return url.toString().replace(/\/$/, "");
	if (provider === "ollama" && url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
		return url.toString().replace(/\/$/, "");
	}
	throw new Error("Use HTTPS for remote providers. Ollama may use HTTP on this device only.");
}

function validateProfile(value: unknown): StandaloneProviderProfile {
	if (!isRecord(value)) throw new Error("A saved provider profile is invalid.");
	if (typeof value.id !== "string" || !value.id.trim() || value.id.length > 160) throw new Error("A provider profile ID is invalid.");
	if (typeof value.name !== "string" || !value.name.trim() || value.name.length > 80) throw new Error("Enter a profile name.");
	if (typeof value.provider !== "string" || !isStandaloneProvider(value.provider)) throw new Error("The selected model provider is not supported by this build.");
	if (typeof value.model !== "string" || !value.model.trim() || value.model.length > 160) throw new Error("Enter a model name.");
	const profile: StandaloneProviderProfile = {
		id: value.id.trim(),
		name: value.name.trim(),
		provider: value.provider,
		model: value.model.trim(),
		createdAt: typeof value.createdAt === "number" ? value.createdAt : Date.now(),
		updatedAt: typeof value.updatedAt === "number" ? value.updatedAt : Date.now(),
	};
	const baseUrl = validateBaseUrl(value.baseUrl, profile.provider);
	if (baseUrl) profile.baseUrl = baseUrl;
	if (profile.provider === "custom" && !profile.baseUrl) throw new Error("Enter a base URL for the custom provider.");
	if (typeof value.credentialId === "string" && value.credentialId.trim()) profile.credentialId = value.credentialId.trim();
	return profile;
}

export function validateStandaloneProviderProfile(value: unknown): StandaloneProviderProfile {
	return validateProfile(value);
}

function validateSettings(value: unknown): StandaloneProviderSettings {
	if (!isRecord(value) || !Array.isArray(value.profiles)) throw new Error("Saved provider profiles could not be read.");
	const profiles = value.profiles.map(validateProfile);
	if (new Set(profiles.map((profile) => profile.id)).size !== profiles.length) throw new Error("Provider profile IDs must be unique.");
	const defaultProfileId = typeof value.defaultProfileId === "string" && profiles.some((profile) => profile.id === value.defaultProfileId)
		? value.defaultProfileId
		: profiles[0]?.id ?? null;
	return { profiles, defaultProfileId };
}

async function migrateLegacySettings(): Promise<StandaloneProviderSettings | null> {
	const value = await standaloneSettingsStore.load<unknown>(LEGACY_SETTINGS_KEY);
	if (!isRecord(value) || typeof value.provider !== "string" || !isStandaloneProvider(value.provider)) return null;
	const profile = validateProfile({
		id: `legacy-${value.provider}`,
		name: `${providerCatalog.find((entry) => entry.id === value.provider)?.name ?? value.provider} (legacy)`,
		provider: value.provider,
		model: value.model,
		baseUrl: value.baseUrl,
		credentialId: value.provider === "ollama" ? undefined : `standalone-provider-${value.provider}`,
		createdAt: Date.now(),
		updatedAt: Date.now(),
	});
	return { profiles: [profile], defaultProfileId: profile.id };
}

export async function loadStandaloneProviderSettings(): Promise<StandaloneProviderSettings> {
	const saved = await standaloneSettingsStore.load<unknown>(SETTINGS_KEY);
	if (saved !== null) return validateSettings(saved);
	const migrated = await migrateLegacySettings();
	if (!migrated) return { profiles: [], defaultProfileId: null };
	await saveStandaloneProviderSettings(migrated);
	return migrated;
}

export async function saveStandaloneProviderSettings(value: StandaloneProviderSettings): Promise<void> {
	const settings = validateSettings(value);
	await standaloneSettingsStore.save(SETTINGS_KEY, settings);
	for (const listener of listeners) listener();
}

export function subscribeStandaloneProviderSettings(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export async function getProviderProfileSnapshot(): Promise<ProviderProfileSnapshot> {
	const settings = await loadStandaloneProviderSettings();
	const profiles: ProviderProfileSummary[] = settings.profiles.map(({ id, name, provider, model }) => ({ id, name, provider, model }));
	return { profiles, defaultProfileId: settings.defaultProfileId };
}
