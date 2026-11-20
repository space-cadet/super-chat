import { beforeEach, describe, expect, it, vi } from "vitest";
const storage = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn(), values: new Map<string, unknown>() }));
vi.mock("../src/persistence", () => ({ standaloneSettingsStore: storage, standalonePersistence: {} }));
vi.mock("@standalone-host", () => ({ standaloneHost: { capabilities: {} } }));
vi.mock("../src/providerSettings", () => ({
  loadStandaloneProviderSettings: async () => ({ profiles: [], defaultProfileId: null }),
  saveStandaloneProviderSettings: async () => {}, validateStandaloneProviderProfile: (value: unknown) => value,
}));
import { exportSettings, importSettings } from "../src/dataManagement";
import { SETTINGS_PRESENTATION_KEY } from "../src/settingsPresentation";

beforeEach(() => {
  storage.values.clear();
  storage.load.mockReset().mockImplementation(async (key: string) => storage.values.get(key) ?? null);
  storage.save.mockReset().mockImplementation(async (key: string, value: unknown) => { storage.values.set(key, value); });
});
describe("Settings presentation exchange", () => {
  it("round-trips the source field through Settings export/import (also used by app-settings sync)", async () => {
    storage.values.set(SETTINGS_PRESENTATION_KEY, { showAdvancedSettings: true });
    const content = await exportSettings();
    expect(JSON.parse(content).presentation).toEqual({ showAdvancedSettings: true });
    storage.values.delete(SETTINGS_PRESENTATION_KEY);
    await importSettings(content);
    expect(storage.values.get(SETTINGS_PRESENTATION_KEY)).toEqual({ showAdvancedSettings: true });
  });
  it("preserves the device preference when importing older exports without presentation settings", async () => {
    const oldExport = JSON.parse(await exportSettings());
    delete oldExport.presentation;
    storage.values.set(SETTINGS_PRESENTATION_KEY, { showAdvancedSettings: true });
    await importSettings(JSON.stringify(oldExport));
    expect(storage.values.get(SETTINGS_PRESENTATION_KEY)).toEqual({ showAdvancedSettings: true });
  });
});
