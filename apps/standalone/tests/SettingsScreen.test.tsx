import React from "react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
const storage = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn(), values: new Map<string, unknown>() }));
vi.mock("../src/persistence", () => ({ standaloneSettingsStore: storage }));
vi.mock("@standalone-host", () => ({ standaloneHost: { capabilities: {} } }));
vi.mock("../src/providerSettings", () => ({ loadStandaloneProviderSettings: async () => ({ profiles: [] }), subscribeStandaloneProviderSettings: () => () => {} }));
vi.mock("../src/memory", () => ({
  loadMemorySettings: async () => ({ enabled: false, auditEnabled: false }),
  listStandaloneMemories: async () => [], getMemoryBackupCount: async () => 0,
}));
vi.mock("../src/searchDocuments", () => ({ DEFAULT_SEARCH_DOCUMENT_SETTINGS: {}, loadSearchDocumentSettings: async () => ({}) }));
vi.mock("../src/screens/ProviderSettingsScreen", () => ({ ProviderSettingsScreen: () => <div>Profile form</div> }));
vi.mock("../src/screens/HostSettingsSections", () => ({ ChatRelaySettingsSection: () => <div />, UpdatesSettingsSection: () => <div /> }));
vi.mock("../src/screens/ToolsDiagnosticsSections", () => ({ IntegrationsSection: () => <div />, ChatCommandsSection: () => <div />, DebugModeSection: () => <input aria-label="Debug draft" defaultValue="" />, DiagnosticsSettingsSection: () => <div /> }));
vi.mock("../src/screens/DataManagementSections", () => ({ BackupRestoreSection: () => <div />, SyncComponentsSection: () => <div />, RemoteStorageSection: () => <div /> }));
vi.mock("../src/screens/sections/SearchDocumentSettingsSection", () => ({ WebSearchSettingsSection: () => <div />, PdfExtractionSettingsSection: () => <div /> }));
import { SettingsScreen } from "../src/screens/SettingsScreen";
import { defaultStandaloneChatPreferences } from "../src/appSettings";
import { SETTINGS_PRESENTATION_KEY } from "../src/settingsPresentation";

beforeEach(() => {
  HTMLElement.prototype.scrollIntoView = vi.fn();
  storage.values.clear();
  storage.load.mockReset().mockImplementation(async (key: string) => storage.values.get(key) ?? null);
  storage.save.mockReset().mockImplementation(async (key: string, value: unknown) => { storage.values.set(key, value); });
});
afterEach(cleanup);

it("applies advanced visibility to the real Settings index, panels and field bindings without clearing chat drafts", async () => {
  const saved = vi.fn();
  render(<SettingsScreen chatPreferences={defaultStandaloneChatPreferences} onChatPreferencesChange={saved} onProviderConfigurationChange={vi.fn()} />);
  const toggle = screen.getByRole("checkbox", { name: /Show advanced settings/ });
  await waitFor(() => expect(toggle).toBeEnabled());
  const index = within(screen.getByRole("navigation", { name: "Settings section index" }));
  expect(index.queryByRole("button", { name: "Debug Mode" })).toBeNull();
  expect(index.queryByRole("button", { name: "Diagnostics" })).toBeNull();
  fireEvent.click(index.getByRole("button", { name: "Chat", exact: true }));
  const instructions = screen.getByLabelText("Base instructions");
  fireEvent.change(instructions, { target: { value: "unsaved instructions" } });
  expect(screen.getByRole("checkbox", { name: /Show full request token estimate/, hidden: true })).not.toBeVisible();
  fireEvent.click(toggle);
  await waitFor(() => expect(index.getByRole("button", { name: "Debug Mode" })).toBeVisible());
  expect(index.getByRole("button", { name: "Diagnostics" })).toBeVisible();
  expect(screen.getByRole("checkbox", { name: /Show full request token estimate/ })).toBeVisible();
  expect(instructions).toHaveValue("unsaved instructions");
  expect(saved).not.toHaveBeenCalled();
  expect(storage.values.get(SETTINGS_PRESENTATION_KEY)).toEqual({ showAdvancedSettings: true });
  fireEvent.click(toggle);
  await waitFor(() => expect(index.queryByRole("button", { name: "Debug Mode" })).toBeNull());
  expect(instructions).toHaveValue("unsaved instructions");
});
