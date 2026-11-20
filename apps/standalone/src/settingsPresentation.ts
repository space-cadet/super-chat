import { standaloneSettingsStore } from "./persistence";

// Copied unchanged from obsidian-ai SettingsTab.ts at 7b7e73560281e11e4a9a68faafc0b2f692c75b4d.
const ADVANCED_SECTION_TITLES = new Set(["Debug Mode", "Diagnostics"]);

const ADVANCED_SETTING_NAMES: Record<string, Set<string>> = {
	"Chat Defaults": new Set([
		"Show full request token count",
		"Max sessions in sidebar",
		"Max saved conversations",
		"Max context tokens",
		"Max context messages",
		"Model request token budget",
		"Recent messages to preserve",
		"Response token reserve",
		"Compaction trigger tokens",
		"Compaction release tokens",
		"Max tool-result replay tokens",
		"Tool history mode",
	]),
	"Agent Tools": new Set(["Max agent steps", "Developer mode"]),
	"AI Intelligence Layer": new Set([
		"Identity context budget",
		"Memory core size",
		"Legacy memory backup retention",
		"Persona file path",
		"Memory file path",
		"Min messages before summarizing",
		"Enable memory audit tool",
	]),
	"PDF Extraction": new Set(["Server endpoint URL", "Maximum pages"]),
	"Remote Storage": new Set(["Conflict Resolution", "Sync Direction"]),
	Updates: new Set([
		"Release channel",
		"Auto-install stable updates",
		"Available branch builds",
	]),
	"Backup & Restore": new Set([
		"Chat storage format",
		"Session backup count",
	]),
};

export { ADVANCED_SECTION_TITLES, ADVANCED_SETTING_NAMES };

/** Source-compatible presentation subset; physical storage belongs to this host. */
export interface SettingsPresentationPreferences {
	/** Reveal advanced controls in the Settings panel. */
	showAdvancedSettings: boolean;
}

export const DEFAULT_SETTINGS_PRESENTATION: SettingsPresentationPreferences = {
	showAdvancedSettings: false,
};
export const SETTINGS_PRESENTATION_KEY = "standalone.settings-presentation";

export function normalizeSettingsPresentation(value: unknown): SettingsPresentationPreferences {
	const merged = { ...DEFAULT_SETTINGS_PRESENTATION, ...(value && typeof value === "object" && !Array.isArray(value) ? value : {}) };
	return { showAdvancedSettings: Boolean(merged.showAdvancedSettings ?? false) };
}

export async function loadSettingsPresentation(): Promise<SettingsPresentationPreferences> {
	return normalizeSettingsPresentation(await standaloneSettingsStore.load(SETTINGS_PRESENTATION_KEY));
}

export async function saveSettingsPresentation(value: SettingsPresentationPreferences): Promise<void> {
	await standaloneSettingsStore.save(SETTINGS_PRESENTATION_KEY, normalizeSettingsPresentation(value));
}
