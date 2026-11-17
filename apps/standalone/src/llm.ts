import {
	createProviderProfile,
	VercelLLMAdapter,
	type LLMAdapter,
	type ModelInfo,
	type ProviderProfile,
	type ProviderInfo,
	type ProviderType,
	type StreamEvent,
	type ToolDefinition,
} from "super-chat";
import type { CredentialReference } from "super-chat/contracts";
import { standaloneHost } from "./host";
import { standaloneSettingsStore } from "./persistence";

export type StandaloneProvider = Exclude<ProviderType, "azure">;

export type StandaloneProviderConfiguration = Pick<ProviderProfile, "model" | "baseUrl"> & {
	provider: StandaloneProvider;
};

const PROVIDER_SETTINGS_KEY = "standalone.model-provider";
const SYSTEM_PROMPT = "You are Super Chat, a helpful assistant. Use available tools for arithmetic and the device's current local time when they help answer the user.";
const providerCatalog = new VercelLLMAdapter({
	profile: createProviderProfile("openai", "gpt-4o-mini", ""),
}).getProviders();
const supportedProviderIds = new Set(
	providerCatalog.filter((provider) => provider.id !== "azure").map((provider) => provider.id),
);

interface CachedAdapter {
	configurationKey: string;
	adapter: VercelLLMAdapter;
}

let cachedAdapter: CachedAdapter | undefined;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStandaloneProvider(value: string): value is StandaloneProvider {
	return value !== "azure" && supportedProviderIds.has(value);
}

function validateConfiguration(value: unknown): StandaloneProviderConfiguration {
	if (!isRecord(value)) throw new Error("Choose a model provider in Settings.");
	if (typeof value.provider !== "string" || !isStandaloneProvider(value.provider)) {
		throw new Error("The selected model provider is not supported by this build.");
	}
	if (typeof value.model !== "string" || value.model.trim().length === 0 || value.model.length > 160) {
		throw new Error("Enter a model name in Settings.");
	}

	const configuration: StandaloneProviderConfiguration = {
		provider: value.provider as StandaloneProvider,
		model: value.model.trim(),
	};
	if (value.baseUrl !== undefined) {
		if (typeof value.baseUrl !== "string" || value.baseUrl.length > 2048) {
			throw new Error("The provider URL is invalid.");
		}
		configuration.baseUrl = validateBaseUrl(value.baseUrl, configuration.provider);
	}
	if (configuration.provider === "custom" && !configuration.baseUrl) {
		throw new Error("Enter a base URL for the custom provider.");
	}
	return configuration;
}

function validateBaseUrl(value: string, provider: StandaloneProvider): string {
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
	if (
		provider === "ollama" &&
		url.protocol === "http:" &&
		["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
	) {
		return url.toString().replace(/\/$/, "");
	}
	throw new Error("Use HTTPS for remote providers. Ollama may use HTTP on this device only.");
}

function operationContext() {
	return {
		requestId: `standalone-credential-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
	};
}

function credentialIdFor(provider: StandaloneProvider): string {
	return `standalone-provider-${provider}`;
}

function providerNeedsCredential(provider: StandaloneProvider): boolean {
	return provider !== "ollama";
}

/** Save provider settings separately from the API key, which uses Android Keystore storage. */
export async function saveStandaloneProviderConfiguration(
	configurationInput: StandaloneProviderConfiguration,
	apiKey?: string,
): Promise<void> {
	const configuration = validateConfiguration(configurationInput);
	const credentialCapability = standaloneHost.capabilities.credentials;
	const credentialId = providerNeedsCredential(configuration.provider)
		? credentialIdFor(configuration.provider)
		: undefined;

	if (credentialId) {
		if (!credentialCapability?.setCredential) {
			throw new Error("Protected API-key storage is available in the Android app only.");
		}
		const secret = apiKey?.trim() || await credentialCapability.getCredential(credentialId, operationContext());
		if (!secret) throw new Error("Enter an API key for this provider.");
		if (apiKey?.trim()) {
			const credential: CredentialReference = {
				id: credentialId,
				label: `${configuration.provider} API key`,
				provider: configuration.provider,
			};
			await credentialCapability.setCredential(credential, secret, operationContext());
		}
	}

	await standaloneSettingsStore.save(PROVIDER_SETTINGS_KEY, configuration);
	cachedAdapter = undefined;
}

export async function loadStandaloneProviderConfiguration(): Promise<StandaloneProviderConfiguration | null> {
	const stored = await standaloneSettingsStore.load<unknown>(PROVIDER_SETTINGS_KEY);
	if (stored === null) return null;
	return validateConfiguration(stored);
}

export async function removeStandaloneProviderConfiguration(): Promise<void> {
	const previous = await loadStandaloneProviderConfiguration().catch(() => null);
	await standaloneSettingsStore.remove(PROVIDER_SETTINGS_KEY);
	if (previous && providerNeedsCredential(previous.provider)) {
		await standaloneHost.capabilities.credentials?.deleteCredential?.(
			credentialIdFor(previous.provider),
			operationContext(),
		);
	}
	cachedAdapter = undefined;
}

export function getStandaloneProviders(): ProviderInfo[] {
	return providerCatalog.filter((provider) => provider.id !== "azure");
}

export function getStandaloneModels(provider: StandaloneProvider): ModelInfo[] {
	const profile = createProviderProfile(provider, "model", "");
	return new VercelLLMAdapter({ profile }).getModels(provider);
}

export class StandaloneLLMAdapter implements LLMAdapter {
	async *streamChat(
		messages: Array<{ role: string; content: string }>,
		signal?: AbortSignal,
	): AsyncIterable<string> {
		const adapter = await this.getConfiguredAdapter();
		yield* adapter.streamChat(messages, signal);
	}

	async *streamChatWithTools(
		messages: Array<{ role: string; content: string }>,
		tools: ToolDefinition[],
		signal?: AbortSignal,
	): AsyncIterable<StreamEvent> {
		const adapter = await this.getConfiguredAdapter();
		yield* adapter.streamChatWithTools(messages, tools, signal);
	}

	getProviders(): ProviderInfo[] {
		return getStandaloneProviders();
	}

	getModels(provider: string): ModelInfo[] {
		if (!isStandaloneProvider(provider)) return [];
		return getStandaloneModels(provider);
	}

	async testConnection(): Promise<{ ok: boolean; message: string }> {
		try {
			return await (await this.getConfiguredAdapter()).testConnection();
		} catch (error) {
			return {
				ok: false,
				message: error instanceof Error ? error.message : String(error),
			};
		}
	}

	private async getConfiguredAdapter(): Promise<VercelLLMAdapter> {
		const configuration = await loadStandaloneProviderConfiguration();
		if (!configuration) throw new Error("Choose a model provider in Settings before sending a message.");

		const configurationKey = `${configuration.provider}|${configuration.model}|${configuration.baseUrl ?? ""}`;
		if (cachedAdapter?.configurationKey === configurationKey) return cachedAdapter.adapter;

		let apiKey = "";
		if (providerNeedsCredential(configuration.provider)) {
			const credentials = standaloneHost.capabilities.credentials;
			if (!credentials) throw new Error("Protected API-key storage is available in the Android app only.");
			apiKey = await credentials.getCredential(credentialIdFor(configuration.provider), operationContext()) ?? "";
			if (!apiKey) throw new Error("The API key for this provider is missing. Add it in Settings.");
		}

		const profile = createProviderProfile(configuration.provider, configuration.model, apiKey, {
			baseUrl: configuration.baseUrl,
		});
		const adapter = new VercelLLMAdapter({ profile, systemPrompt: SYSTEM_PROMPT });
		cachedAdapter = { configurationKey, adapter };
		return adapter;
	}
}
