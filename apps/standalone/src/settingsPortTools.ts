import type { ChatSession, ChatMessage } from "super-chat";
import { standalonePersistence, standaloneSettingsStore } from "./persistence";

export interface DebugTelemetrySettings {
 enabled: boolean;
 includeProviderUsage: boolean;
 includeRequestEstimates: boolean;
 includeRequestBreakdown: boolean;
 includeToolDetails: boolean;
 includeContextMetadata: boolean;
 includeModelTiming: boolean;
}
export const defaultDebugTelemetry: DebugTelemetrySettings = { enabled: false, includeProviderUsage: true, includeRequestEstimates: true, includeRequestBreakdown: true, includeToolDetails: true, includeContextMetadata: true, includeModelTiming: true };
export async function loadDebugTelemetry(): Promise<DebugTelemetrySettings> {
 const saved = await standaloneSettingsStore.load<Record<string, unknown>>("standalone.debug-telemetry");
 return Object.fromEntries(Object.entries(defaultDebugTelemetry).map(([key, value]) => [key, typeof saved?.[key] === "boolean" ? saved[key] : value])) as unknown as DebugTelemetrySettings;
}
export async function saveDebugTelemetry(settings: DebugTelemetrySettings): Promise<void> { await standaloneSettingsStore.save("standalone.debug-telemetry", settings); }

/** Export only selected, already recorded details. Never export request bodies or arbitrary metadata. */
export function selectMessageTelemetry(message: ChatMessage, settings: DebugTelemetrySettings): Record<string, unknown> | undefined {
 if (!settings.enabled) return undefined;
 const metadata = message.metadata ?? {};
 const result: Record<string, unknown> = {};
 const numericDetails = (value: unknown): unknown => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(numericDetails).filter(item => item !== undefined);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, numericDetails(item)]).filter(([, item]) => item !== undefined));
  return undefined;
 };
 const copy = (keys: string[]) => { for (const key of keys) { const value = numericDetails(metadata[key]); if (value !== undefined) result[key] = value; } };
 if (settings.includeProviderUsage) copy(["usage", "providerUsage", "promptTokens", "completionTokens", "totalTokens"]);
 if (settings.includeRequestEstimates) { if (message.tokenCount !== undefined) result.tokenCount = message.tokenCount; copy(["requestTokenEstimate"]); }
 if (settings.includeRequestBreakdown) copy(["requestBreakdown"]);
 if (settings.includeModelTiming) { copy(["responseTimeMs", "durationMs"]); if (typeof metadata.model === "string") result.model = metadata.model.slice(0, 200); }
 if (settings.includeContextMetadata) result.attachments = message.attachments?.map(attachment => ({ id: attachment.id, name: attachment.name, type: attachment.type }));
 if (settings.includeToolDetails) result.tools = message.toolCalls?.map((call, index) => ({ id: call.id, name: call.name, resultBytes: message.toolResults?.[index] ? new Blob([JSON.stringify(message.toolResults[index])]).size : 0 }));
 return redactDiagnosticData(result) as Record<string, unknown>;
}
export function redactDiagnosticData(value: unknown): unknown {
 if (Array.isArray(value)) return value.map(redactDiagnosticData);
 if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, /api.?key|password|secret|credential|authorization|access.?token|refresh.?token|session.?key/i.test(key) ? "<redacted>" : redactDiagnosticData(item)]));
 return value;
}
export interface IntegrationStatus { id: string; displayName: string; enabled: boolean; status: "available" | "disabled" | "unavailable"; message: string; capabilityCount: number }
export interface IntegrationBridge { discover(): Promise<IntegrationStatus[]>; setEnabled(id: string, enabled: boolean): Promise<void> }
let integrationBridge: IntegrationBridge | undefined;
/** Hosts install this bridge when they can discover compatible tool providers. */
export function registerStandaloneIntegrationBridge(bridge: IntegrationBridge): () => void { integrationBridge = bridge; return () => { if (integrationBridge === bridge) integrationBridge = undefined; }; }
export function hasIntegrationBridge(): boolean { return !!integrationBridge; }
export async function discoverIntegrations(): Promise<IntegrationStatus[]> { return integrationBridge?.discover() ?? []; }
export async function setIntegrationEnabled(id: string, enabled: boolean): Promise<void> {
 if (!integrationBridge) throw new Error("This host does not provide integration discovery.");
 await integrationBridge.setEnabled(id, enabled);
}
export interface DataHealthIssue { sessionId: string; messageId?: string; issue: string }
export function checkSessionDataHealth(sessions: ChatSession[]): DataHealthIssue[] {
 const issues: DataHealthIssue[] = []; const ids = new Set<string>();
 for (const session of sessions) {
  if (!session.id || ids.has(session.id)) issues.push({ sessionId: session.id, issue: "Missing or duplicate session ID" });
  ids.add(session.id);
  if (!Number.isFinite(session.createdAt) || !Number.isFinite(session.updatedAt)) issues.push({ sessionId: session.id, issue: "Invalid session timestamp" });
  if (!Array.isArray(session.messages)) { issues.push({ sessionId: session.id, issue: "Messages are not an array" }); continue; }
  const messageIds = new Set<string>();
  for (const message of session.messages) {
   if (!message.id || messageIds.has(message.id)) issues.push({ sessionId: session.id, messageId: message.id, issue: "Missing or duplicate message ID" });
   messageIds.add(message.id);
   if (typeof message.content !== "string" || !Number.isFinite(message.timestamp)) issues.push({ sessionId: session.id, messageId: message.id, issue: "Invalid message content or timestamp" });
  }
 }
 return issues;
}
export async function collectApplicationDiagnostics() {
 const sessions = await standalonePersistence.loadSessions({ requestId: "diagnostics" });
 const storage = await navigator.storage?.estimate?.().catch(() => undefined);
 const heap = (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
 return { exportVersion: "1.0", exportedAt: new Date().toISOString(), sessions: sessions.map(session => ({ id: session.id, createdAt: session.createdAt, updatedAt: session.updatedAt, messageCount: Array.isArray(session.messages) ? session.messages.length : 0, model: session.llmModel })), messageCount: sessions.reduce((total, session) => total + (Array.isArray(session.messages) ? session.messages.length : 0), 0), health: checkSessionDataHealth(sessions), runtime: { heap: heap ? { used: heap.usedJSHeapSize, total: heap.totalJSHeapSize, limit: heap.jsHeapSizeLimit } : null, domNodes: document.getElementsByTagName("*").length, storageUsage: storage?.usage ?? null, storageQuota: storage?.quota ?? null }, debugSettings: await loadDebugTelemetry() };
}
export function downloadDiagnostics(value: unknown, filename = "super-chat-diagnostics.json") { const url = URL.createObjectURL(new Blob([JSON.stringify(redactDiagnosticData(value), null, 2)], { type: "application/json" })); const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }

export async function exportRecordedTelemetry() {
 const settings = await loadDebugTelemetry();
 if (!settings.enabled) throw new Error("Enable debug mode before exporting telemetry.");
 const sessions = await standalonePersistence.loadSessions({ requestId: "debug-export" });
 return { exportedAt: new Date().toISOString(), sessions: sessions.map(session => ({ id: session.id, messages: session.messages.map(message => ({ id: message.id, telemetry: selectMessageTelemetry(message, settings) })) })) };
}

export interface DiagnosticLogSettings { level: "off" | "error" | "info" | "debug"; maxSizeMB: number; retention: number; memoryIntervalSeconds: number }
export async function loadDiagnosticLogSettings(): Promise<DiagnosticLogSettings> { const stored = await standaloneSettingsStore.load<DiagnosticLogSettings>("standalone.diagnostic-log-settings");
 const finite = (value: unknown, fallback: number, min: number, max: number) => typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
 return { level: stored && ["off", "error", "info", "debug"].includes(stored.level) ? stored.level : "error", maxSizeMB: finite(stored?.maxSizeMB, 5, 0.1, 100), retention: Math.round(finite(stored?.retention, 200, 1, 10000)), memoryIntervalSeconds: Math.round(finite(stored?.memoryIntervalSeconds, 60, 60, 3600)) }; }
export async function saveDiagnosticLogSettings(settings: DiagnosticLogSettings) {
 const normalized = { ...settings, maxSizeMB: Math.min(100, Math.max(0.1, settings.maxSizeMB || 5)), retention: Math.min(10000, Math.max(1, Math.round(settings.retention || 200))), memoryIntervalSeconds: Math.min(3600, Math.max(60, Math.round(settings.memoryIntervalSeconds || 60))) };
 await standaloneSettingsStore.save("standalone.diagnostic-log-settings", normalized); return normalized;
}
let logQueue = Promise.resolve();
/** Structured diagnostics only; callers must never pass prompts, credentials or provider payloads. */
export function recordDiagnosticEvent(level: "error" | "info" | "debug", event: string, metrics: Record<string, number | boolean | null> = {}) {
 logQueue = logQueue.catch(() => undefined).then(async () => {
  const settings = await loadDiagnosticLogSettings();
  if (settings.level === "off" || ({ error: 1, info: 2, debug: 3 }[level] > { off: 0, error: 1, info: 2, debug: 3 }[settings.level])) return;
  const entries = await standaloneSettingsStore.load<unknown[]>("standalone.diagnostic-log") ?? [];
  entries.push({ at: new Date().toISOString(), level, event: event.slice(0, 100), metrics });
  while (entries.length > settings.retention || new Blob([JSON.stringify(entries)]).size > settings.maxSizeMB * 1048576) entries.shift();
  await standaloneSettingsStore.save("standalone.diagnostic-log", entries);
 });
 return logQueue;
}
export async function exportDiagnosticLog() { await logQueue; return await standaloneSettingsStore.load<unknown[]>("standalone.diagnostic-log") ?? []; }
export function startDiagnosticSnapshots(): () => void {
 let disposed = false; let timer: ReturnType<typeof setTimeout> | undefined;
 const snapshot = async () => {
  try {
   const settings = await loadDiagnosticLogSettings();
   if (disposed) return;
   if (settings.level !== "off") {
    const heap = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
    // Baselines remain available with error-only logging, matching the reference logger.
    logQueue = logQueue.catch(() => undefined).then(async () => {
     const entries = await standaloneSettingsStore.load<unknown[]>("standalone.diagnostic-log") ?? [];
     entries.push({ at: new Date().toISOString(), level: "baseline", domNodes: document.getElementsByTagName("*").length, heapUsed: heap?.usedJSHeapSize ?? null });
     while (entries.length > settings.retention || new Blob([JSON.stringify(entries)]).size > settings.maxSizeMB * 1048576) entries.shift();
     await standaloneSettingsStore.save("standalone.diagnostic-log", entries);
    });
    await logQueue;
   }
   if (!disposed) timer = setTimeout(() => void snapshot(), settings.memoryIntervalSeconds * 1000);
  } catch { if (!disposed) timer = setTimeout(() => void snapshot(), 60000); }
 };
 void snapshot(); return () => { disposed = true; clearTimeout(timer); };
}
