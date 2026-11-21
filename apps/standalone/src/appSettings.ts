import type { ChatSettings } from "super-chat";
import { standaloneSettingsStore } from "./persistence";

const SETTINGS_KEY = "standalone.chat-preferences";
const DEFAULT_SYSTEM_PROMPT = "You are Super Chat, a helpful assistant. Use available tools for arithmetic and the device's current local time when they help answer the user.";

export interface StandaloneChatPreferences {
	pressEnterToSend: boolean;
	showTokenCount: boolean;
	showFullRequestTokens: boolean;
	showTimestamps: boolean;
	autoNameSessions: boolean;
 autoApply: boolean;
	autoTagSessions: boolean;
	sessionTaggingProfileId: string;
	restoreChatTabs: boolean;
	chatTabTitleWidth: number;
	enableTools: boolean;
	maxAgentSteps: number;
	maxContextTokens: number;
	maxContextMessages: number;
	systemPrompt: string;
}

export const defaultStandaloneChatPreferences: StandaloneChatPreferences = {
	pressEnterToSend: true,
	showTokenCount: true,
	showFullRequestTokens: true,
	showTimestamps: true,
	autoNameSessions: false,
 autoApply:false,
	autoTagSessions: false,
	sessionTaggingProfileId: "",
	restoreChatTabs: true,
	chatTabTitleWidth: 160,
	enableTools: true,
	maxAgentSteps: 5,
	maxContextTokens: 128_000,
	maxContextMessages: 10,
	systemPrompt: DEFAULT_SYSTEM_PROMPT,
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateStandaloneChatPreferences(value: unknown): StandaloneChatPreferences {
	if (!isRecord(value)) throw new Error("Saved chat settings could not be read.");
	const merged = { ...defaultStandaloneChatPreferences, ...value };
	for (const key of ["autoApply", "pressEnterToSend", "showTokenCount", "showFullRequestTokens", "showTimestamps", "autoNameSessions", "autoTagSessions", "restoreChatTabs", "enableTools"] as const) {
		if (typeof merged[key] !== "boolean") throw new Error(`The saved ${key} setting is invalid.`);
	}
	if (typeof merged.maxAgentSteps !== "number" || !Number.isInteger(merged.maxAgentSteps) || merged.maxAgentSteps < 1 || merged.maxAgentSteps > 12) {
		throw new Error("Max tool steps must be a whole number from 1 to 12.");
	}
	if (typeof merged.maxContextTokens !== "number" || !Number.isInteger(merged.maxContextTokens) || merged.maxContextTokens < 8_000 || merged.maxContextTokens > 1_000_000) {
		throw new Error("The request token budget must be from 8,000 to 1,000,000.");
	}
	if (typeof merged.maxContextMessages !== "number" || !Number.isSafeInteger(merged.maxContextMessages) || merged.maxContextMessages < 1) {
		throw new Error("The previous message limit must be a positive whole number.");
	}
	if (typeof merged.systemPrompt !== "string" || merged.systemPrompt.length > 16_000) {
		throw new Error("Assistant instructions must be 16,000 characters or fewer.");
	}
	if (typeof merged.sessionTaggingProfileId !== "string") {
		throw new Error("The session-tagging provider profile is invalid.");
	}
	if (!Number.isInteger(merged.chatTabTitleWidth) || merged.chatTabTitleWidth < 120 || merged.chatTabTitleWidth > 360) {
		throw new Error("Chat tab title width must be from 120 to 360 pixels.");
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
		showFullRequestTokens: value.showFullRequestTokens,
		showTimestamps: value.showTimestamps,
		autoNameSessions: value.autoNameSessions,
 autoApply:value.autoApply,
		autoTagSessions: value.autoTagSessions,
		sessionTaggingProfileId: value.sessionTaggingProfileId,
		restoreChatTabs: value.restoreChatTabs,
		chatTabTitleWidth: value.chatTabTitleWidth,
		enableTools: value.enableTools,
		maxAgentSteps: value.maxAgentSteps,
		maxContextTokens: value.maxContextTokens,
		maxContextMessages: value.maxContextMessages,
	};
}
