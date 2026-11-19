import { describe, expect, it, vi } from "vitest";
vi.mock("../src/persistence", () => ({ standalonePersistence: {}, standaloneSettingsStore: {} }));
import { defaultDebugTelemetry, redactDiagnosticData, selectMessageTelemetry, checkSessionDataHealth } from "../src/settingsPortTools";
import type { ChatMessage, ChatSession } from "../../../src/core/types";
const message: ChatMessage = { id: "m", role: "assistant", content: "private conversation", timestamp: 1, metadata: { usage: { totalTokens: 42, providerPayload: "Bearer secret-value", secret: "hidden" }, requestBreakdown: { input: 30, prompt: "private prompt" } } };
describe("standalone diagnostic exports", () => {
 it("keeps debug exports off by default", () => { expect(selectMessageTelemetry(message, defaultDebugTelemetry)).toBeUndefined(); });
 it("allows numeric usage and estimates while excluding raw provider strings", () => {
  const output = JSON.stringify(selectMessageTelemetry(message, { ...defaultDebugTelemetry, enabled: true }));
  expect(output).toContain("42"); expect(output).not.toContain("secret-value"); expect(output).not.toContain("private prompt"); expect(output).not.toContain("private conversation");
 });
 it("redacts nested credentials without deleting token counts", () => {
  expect(redactDiagnosticData({ nested: [{ apiKey: "secret", totalTokens: 42 }] })).toEqual({ nested: [{ apiKey: "<redacted>", totalTokens: 42 }] });
 });
 it("reports duplicate IDs and invalid timestamps without changing records", () => {
  const session = { id: "s", createdAt: 1, updatedAt: NaN, messages: [message, message] } as ChatSession;
  expect(checkSessionDataHealth([session]).map(issue => issue.issue)).toEqual(["Invalid session timestamp", "Missing or duplicate message ID"]);
  expect(session.messages).toHaveLength(2);
 });
});
