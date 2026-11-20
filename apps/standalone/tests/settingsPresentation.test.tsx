import React from "react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const storage = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn(), values: new Map<string, unknown>() }));
vi.mock("../src/persistence", () => ({ standaloneSettingsStore: storage }));
import {
  ADVANCED_SECTION_TITLES, ADVANCED_SETTING_NAMES, SETTINGS_PRESENTATION_KEY,
  loadSettingsPresentation, normalizeSettingsPresentation,
} from "../src/settingsPresentation";
import { AdvancedSetting, SettingsPresentationControls, SettingsPresentationProvider } from "../src/screens/SettingsPresentation";

function Example() {
  return <SettingsPresentationProvider>
    <SettingsPresentationControls />
    <AdvancedSetting section="Chat Defaults" name="Max context messages">
      <label>Previous messages<input defaultValue="10" /></label>
    </AdvancedSetting>
    <AdvancedSetting section="Chat Defaults" name="Press Enter to send">
      <button>Ordinary setting</button>
    </AdvancedSetting>
  </SettingsPresentationProvider>;
}

beforeEach(() => {
  storage.values.clear();
  storage.load.mockReset().mockImplementation(async (key: string) => storage.values.get(key) ?? null);
  storage.save.mockReset().mockImplementation(async (key: string, value: unknown) => { storage.values.set(key, value); });
});
afterEach(cleanup);

async function readyToggle() {
  const toggle = screen.getByRole("checkbox", { name: /Show advanced settings/ });
  await waitFor(() => expect(toggle).toBeEnabled());
  return toggle;
}

describe("reference-compatible Settings presentation", () => {
  it("uses the reference key, false default and Boolean normalization", async () => {
    expect(await loadSettingsPresentation()).toEqual({ showAdvancedSettings: false });
    expect(normalizeSettingsPresentation({ showAdvancedSettings: true })).toEqual({ showAdvancedSettings: true });
    expect(normalizeSettingsPresentation({ showAdvancedSettings: 0 })).toEqual({ showAdvancedSettings: false });
    expect(normalizeSettingsPresentation({ showAdvancedSettings: "enabled" })).toEqual({ showAdvancedSettings: true });
    expect(normalizeSettingsPresentation(null)).toEqual({ showAdvancedSettings: false });
  });

  it("retains source section and per-control classification", () => {
    expect([...ADVANCED_SECTION_TITLES]).toEqual(["Debug Mode", "Diagnostics"]);
    expect(ADVANCED_SETTING_NAMES["Chat Defaults"].has("Max context messages")).toBe(true);
    expect(ADVANCED_SETTING_NAMES["Agent Tools"].has("Max agent steps")).toBe(true);
    expect(ADVANCED_SETTING_NAMES["PDF Extraction"].has("Maximum pages")).toBe(true);
  });

  it("hides advanced fields by default, persists the choice and restores it on remount", async () => {
    const view = render(<Example />);
    const toggle = await readyToggle();
    expect(screen.getByLabelText("Previous messages")).not.toBeVisible();
    expect(screen.getByRole("button", { name: "Ordinary setting" })).toBeVisible();
    fireEvent.click(toggle);
    await waitFor(() => expect(screen.getByLabelText("Previous messages")).toBeVisible());
    expect(storage.values.get(SETTINGS_PRESENTATION_KEY)).toEqual({ showAdvancedSettings: true });
    view.unmount();
    render(<Example />);
    expect(await readyToggle()).toBeChecked();
    expect(screen.getByLabelText("Previous messages")).toBeVisible();
  });

  it("keeps an unsaved field draft when advanced settings are hidden and shown again", async () => {
    storage.values.set(SETTINGS_PRESENTATION_KEY, { showAdvancedSettings: true });
    render(<Example />);
    const toggle = await readyToggle();
    fireEvent.change(screen.getByLabelText("Previous messages"), { target: { value: "27" } });
    fireEvent.click(toggle);
    await waitFor(() => expect(toggle).not.toBeChecked());
    fireEvent.click(toggle);
    await waitFor(() => expect(toggle).toBeChecked());
    expect(screen.getByLabelText("Previous messages")).toHaveValue("27");
  });

  it("keeps the previous visibility and stored value when saving fails", async () => {
    storage.save.mockRejectedValueOnce(new Error("disk full"));
    render(<Example />);
    const toggle = await readyToggle();
    fireEvent.click(toggle);
    expect(await screen.findByRole("alert")).toHaveTextContent("disk full");
    expect(toggle).not.toBeChecked();
    expect(toggle).toBeEnabled();
    expect(storage.values.has(SETTINGS_PRESENTATION_KEY)).toBe(false);
    expect(screen.getByLabelText("Previous messages")).not.toBeVisible();
  });

  it("does not overwrite an unread preference and permits retry after load failure", async () => {
    storage.values.set(SETTINGS_PRESENTATION_KEY, { showAdvancedSettings: true });
    storage.load.mockRejectedValueOnce(new Error("storage busy"));
    render(<Example />);
    expect(await screen.findByRole("alert")).toHaveTextContent("storage busy");
    expect(screen.getByRole("checkbox", { name: /Show advanced settings/ })).toBeDisabled();
    expect(storage.save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Retry loading display preference" }));
    expect(await readyToggle()).toBeChecked();
    expect(storage.save).not.toHaveBeenCalled();
  });
});
