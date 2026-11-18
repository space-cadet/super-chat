import type { ChatSettings } from "super-chat";
import { standaloneSettingsStore } from "./persistence";

const SETTINGS_KEY = "standalone.chat-preferences";
const DEFAULT_SYSTEM_PROMPT = "You are Super Chat, a helpful assistant. Use available tools for arithmetic and the device's current local time when they help answer the user.";

export interface StandaloneChatPreferences {
	pressEnterToSend: boolean;
	showTokenCount: boolean;
	showTimestamps: boolean;
	enableTools: boolean;
	maxAgentSteps: number;
	maxContextTokens: number;
	systemPrompt: string;
}

export const defaultStandaloneChatPreferences: StandaloneChatPreferences = {
	pressEnterToSend: true,
	showTokenCount: true,
	showTimestamps: true,
	enableTools: true,
	maxAgentSteps: 5,
	maxContextTokens: 128_000,
	systemPrompt: DEFAULT_SYSTEM_PROMPT,
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateStandaloneChatPreferences(value: unknown): StandaloneChatPreferences {
	if (!isRecord(value)) throw new Error("Saved chat settings could not be read.");
	const merged = { ...defaultStandaloneChatPreferences, ...value };
	for (const key of ["pressEnterToSend", "showTokenCount", "showTimestamps", "enableTools"] as const) {
		if (typeof merged[key] !== "boolean") throw new Error(`The saved ${key} setting is invalid.`);
	}
	if (typeof merged.maxAgentSteps !== "number" || !Number.isInteger(merged.maxAgentSteps) || merged.maxAgentSteps < 1 || merged.maxAgentSteps > 12) {
		throw new Error("Max tool steps must be a whole number from 1 to 12.");
	}
	if (typeof merged.maxContextTokens !== "number" || !Number.isInteger(merged.maxContextTokens) || merged.maxContextTokens < 8_000 || merged.maxContextTokens > 1_000_000) {
		throw new Error("The request token budget must be from 8,000 to 1,000,000.");
	}
	if (typeof merged.systemPrompt !== "string" || merged.systemPrompt.length > 16_000) {
		throw new Error("Assistant instructions must be 16,000 characters or fewer.");
	}
	return merged as StandaloneChatPreferences;
}

export async function loadStandaloneChatPreferences(): Promise<StandaloneChatPreferences> {
	const value = await standaloneSettingsStore.load<unknown>(SETTINGS_KEY);
	return value === null ? { ...defaultStandaloneChatPreferences } : validateStandaloneChatPreferences(value);
}

export async function saveStandaloneChatPreferences(value: StandaloneChatPreferences): Promise<void> {
	await standaloneSettingsStore.save(SETTINGS_KEY, validateStandaloneChatPreferences(value));
}

/** Core settings consumed by the shared engine. */
export function toChatEngineSettings(value: StandaloneChatPreferences): Partial<ChatSettings> {
	return {
		pressEnterToSend: value.pressEnterToSend,
		showTokenCount: value.showTokenCount,
		showTimestamps: value.showTimestamps,
		enableTools: value.enableTools,
		maxAgentSteps: value.maxAgentSteps,
		maxContextTokens: value.maxContextTokens,
	};
}
