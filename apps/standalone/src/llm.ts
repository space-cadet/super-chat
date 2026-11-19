import { extractStandalonePdf } from './searchDocuments';
import { getMemoryContext } from "./memory";
import { loadStandaloneChatPreferences } from "./appSettings";
import {
	createProviderProfile,
	estimateStructuredTokens,
	VercelLLMAdapter,
	type LLMAdapter,
	type LLMRequestOptions,
	type ProviderInfo,
	type StreamEvent,
	type ToolDefinition,
} from "super-chat";
import type { CredentialReference } from "super-chat/contracts";
import { standaloneHost } from "@standalone-host";
import {
	getStandaloneModels,
	getStandaloneProviders,
	isStandaloneProvider,
	loadStandaloneProviderSettings,
	saveStandaloneProviderSettings,
	validateStandaloneProviderProfile,
	type StandaloneProvider,
	type StandaloneProviderProfile,
} from "./providerSettings";

export { getStandaloneModels, getStandaloneProviders };
export type { StandaloneProvider };


interface CachedAdapter {
	configurationKey: string;
	adapter: VercelLLMAdapter;
}

let cachedAdapters = new Map<string, CachedAdapter>();

function operationContext() {
	return {
		requestId: `standalone-credential-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
	};
}

function profileCredentialId(profile: StandaloneProviderProfile): string {
	return profile.credentialId ?? `standalone-profile-${profile.id}-${profile.provider}`;
}

function providerNeedsCredential(provider: StandaloneProvider): boolean {
	return provider !== "ollama";
}

/** Save profile details separately from the API key, which uses Android Keystore storage. */
export async function saveStandaloneProviderProfile(
	input: Omit<StandaloneProviderProfile, "createdAt" | "updatedAt" | "credentialId"> & Partial<Pick<StandaloneProviderProfile, "createdAt" | "updatedAt" | "credentialId">>,
	apiKey?: string,
): Promise<StandaloneProviderProfile> {
	if (!isStandaloneProvider(input.provider)) throw new Error("The selected model provider is not supported by this build.");
	const settings = await loadStandaloneProviderSettings();
	const previous = settings.profiles.find((profile) => profile.id === input.id);
	const sameProvider = previous?.provider === input.provider;
	const needsCredential = providerNeedsCredential(input.provider);
	const credentialId = needsCredential
		? sameProvider && previous?.credentialId
			? previous.credentialId
			: `standalone-profile-${input.id}-${input.provider}`
		: undefined;
	const now = Date.now();
	const profile = validateStandaloneProviderProfile({
		...input,
		...(credentialId ? { credentialId } : {}),
		createdAt: previous?.createdAt ?? input.createdAt ?? now,
		updatedAt: now,
	});
	const credentialCapability = standaloneHost.capabilities.credentials;

	if (needsCredential) {
		if (!credentialCapability?.setCredential) {
			throw new Error("Protected API-key storage is available in the Android app only.");
		}
		const secret = apiKey?.trim() || (sameProvider && credentialId
			? await credentialCapability.getCredential(credentialId, operationContext())
			: null);
		if (!secret) throw new Error("Enter an API key for this provider.");
		if (apiKey?.trim() && credentialId) {
			const credential: CredentialReference = {
				id: credentialId,
				label: `${input.name.trim() || input.provider} API key`,
				provider: input.provider,
			};
			await credentialCapability.setCredential(credential, apiKey.trim(), operationContext());
		}
	}

	const profiles = settings.profiles.filter((entry) => entry.id !== profile.id);
	profiles.push(profile);
	await saveStandaloneProviderSettings({
		profiles,
		defaultProfileId: settings.defaultProfileId ?? profile.id,
	});
	if (previous?.credentialId && previous.credentialId !== credentialId) {
		await credentialCapability?.deleteCredential?.(previous.credentialId, operationContext());
	}
	cachedAdapters.clear();
	return profile;
}

export async function removeStandaloneProviderProfile(profileId: string): Promise<void> {
	const settings = await loadStandaloneProviderSettings();
	const previous = settings.profiles.find((profile) => profile.id === profileId);
	if (!previous) return;
	const profiles = settings.profiles.filter((profile) => profile.id !== profileId);
	const defaultProfileId = settings.defaultProfileId === profileId
		? profiles[0]?.id ?? null
		: settings.defaultProfileId;
	await saveStandaloneProviderSettings({ profiles, defaultProfileId });
	if (previous.credentialId) {
		await standaloneHost.capabilities.credentials?.deleteCredential?.(previous.credentialId, operationContext());
	}
	cachedAdapters.clear();
}

export async function testStandaloneProviderProfile(profileId: string): Promise<{ ok: boolean; message: string }> {
	try {
		return await (await configuredAdapterForProfile(profileId)).testConnection();
	} catch (error) {
		return { ok: false, message: error instanceof Error ? error.message : String(error) };
	}
}

async function configuredAdapterForProfile(profileId: string, modelOverride?: string): Promise<VercelLLMAdapter> {
	const settings = await loadStandaloneProviderSettings();
	const profile = settings.profiles.find((entry) => entry.id === profileId);
	if (!profile) throw new Error("This provider profile is no longer available. Choose another profile in Settings.");
	return createAdapter(profile, modelOverride);
}

async function createAdapter(profile: StandaloneProviderProfile, modelOverride?: string): Promise<VercelLLMAdapter> {
	const model = modelOverride?.trim() || profile.model;
	const configurationKey = `${profile.id}|${profile.provider}|${model}|${profile.baseUrl ?? ""}`;
	if (cachedAdapters.get(configurationKey)) return cachedAdapters.get(configurationKey)!.adapter;

	let apiKey = "";
	if (providerNeedsCredential(profile.provider)) {
		const credentials = standaloneHost.capabilities.credentials;
		if (!credentials) throw new Error("Protected API-key storage is available in the Android app only.");
		apiKey = await credentials.getCredential(profileCredentialId(profile), operationContext()) ?? "";
		if (!apiKey) throw new Error(`The API key for ${profile.name} is missing. Add it in Settings.`);
	}

	const adapterProfile = createProviderProfile(profile.provider, model, apiKey, {
		baseUrl: profile.baseUrl,
	});
	const adapter = new VercelLLMAdapter({
		profile: adapterProfile,
		extractPdf: (data) => extractStandalonePdf(data, standaloneHost.capabilities.credentials),
	});
	cachedAdapters.set(configurationKey, { configurationKey, adapter });
	return adapter;
}

async function configuredAdapter(request?: LLMRequestOptions): Promise<VercelLLMAdapter> {
	const settings = await loadStandaloneProviderSettings();
	const selected = request?.providerProfileId
		? settings.profiles.find((profile) => profile.id === request.providerProfileId)
		: undefined;
	if (request?.providerProfileId && !selected) {
		throw new Error("This chat's provider profile was removed. Choose a profile in the chat controls.");
	}
	const providerMatch = request?.provider
		? settings.profiles.find((profile) => profile.provider === request.provider)
		: undefined;
	const profile = selected ?? providerMatch ?? settings.profiles.find((entry) => entry.id === settings.defaultProfileId);
	if (!profile) throw new Error("Choose a model provider in Settings before sending a message.");
	return createAdapter(profile, request?.model);
}

async function withMemoryContext(messages: import("super-chat").ChatModelMessage[]) {
 const [preferences, memory] = await Promise.all([loadStandaloneChatPreferences(), getMemoryContext()]);
 const systemContext = [preferences.systemPrompt.trim(), memory].filter(Boolean).join("\n\n");
 return systemContext ? [{ role: "system", content: systemContext }, ...messages] : messages;
}

export class StandaloneLLMAdapter implements LLMAdapter {
 async *streamChatEvents(messages: import("super-chat").ChatModelMessage[], signal?: AbortSignal, request?: LLMRequestOptions): AsyncIterable<StreamEvent> {
  const adapter = await configuredAdapter(request);
  const preparedMessages = await withMemoryContext(messages);
  yield { type: "request-token-estimate", tokens: estimateStructuredTokens(preparedMessages) };
  yield* adapter.streamChatEvents(preparedMessages, signal, request);
 }

	async *streamChat(
		messages: Array<{ role: string; content: string }>,
		signal?: AbortSignal,
		request?: LLMRequestOptions,
	): AsyncIterable<string> {
		const adapter = await configuredAdapter(request);
		yield* adapter.streamChat(await withMemoryContext(messages), signal, request);
	}

	async *streamAuxiliaryChat(
		messages: import("super-chat").ChatModelMessage[],
		signal?: AbortSignal,
		request?: LLMRequestOptions,
	): AsyncIterable<string> {
		const adapter = await configuredAdapter(request);
		yield* adapter.streamChat(messages, signal, request);
	}

	async *streamChatWithTools(
		messages: Array<{ role: string; content: string }>,
		tools: ToolDefinition[],
		signal?: AbortSignal,
		request?: LLMRequestOptions,
	): AsyncIterable<StreamEvent> {
		const adapter = await configuredAdapter(request);
		const preparedMessages = await withMemoryContext(messages);
		yield { type: "request-token-estimate", tokens: estimateStructuredTokens(preparedMessages) };
		yield* adapter.streamChatWithTools(preparedMessages, tools, signal, request);
	}

	getProviders(): ProviderInfo[] {
		return getStandaloneProviders();
	}

	getModels(provider: string) {
		if (!isStandaloneProvider(provider)) return [];
		return getStandaloneModels(provider);
	}

	async testConnection(): Promise<{ ok: boolean; message: string }> {
		try {
			const settings = await loadStandaloneProviderSettings();
			const profile = settings.profiles.find((entry) => entry.id === settings.defaultProfileId);
			if (!profile) throw new Error("Add a provider profile in Settings first.");
			return await (await configuredAdapterForProfile(profile.id)).testConnection();
		} catch (error) {
			return { ok: false, message: error instanceof Error ? error.message : String(error) };
		}
	}
}
