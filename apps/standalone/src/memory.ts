import { MemoryService, MemoryToolProvider, type MemoryAuditRecord, type MemoryCategory, type MemoryToolSettings, type ScoredMemoryEntry } from "super-chat";
import { standaloneSettingsStore } from "./persistence";

const STATE_KEY = "long-term-memory";
const SETTINGS_KEY = "memory-settings";
const DEFAULT_BACKUP_RETENTION = 20;

interface MemoryBackup {
  savedAt: string;
  snapshot: Record<string, string>;
}

interface MemoryState {
  current: Record<string, string>;
  backups: MemoryBackup[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function loadState(): Promise<MemoryState> {
  const value = await standaloneSettingsStore.load<unknown>(STATE_KEY);
  if (value === null) return { current: {}, backups: [] };
  if (!isRecord(value) || !isRecord(value.current) || !Array.isArray(value.backups) ||
    !Object.values(value.current).every(item => typeof item === "string") ||
    !value.backups.every(item => isRecord(item) && typeof item.savedAt === "string" && isRecord(item.snapshot) && Object.values(item.snapshot).every(entry => typeof entry === "string"))) {
    throw new Error("Saved memory or its recovery copies could not be read. The stored data was left untouched.");
  }
  return value as unknown as MemoryState;
}

async function withMemoryLock<T>(operation: () => Promise<T>): Promise<T> {
  if (globalThis.navigator?.locks) return navigator.locks.request("super-chat-memory", operation);
  return operation();
}

export async function loadMemorySettings(): Promise<MemoryToolSettings> {
  const value = await standaloneSettingsStore.load<unknown>(SETTINGS_KEY);
  if (value === null) return { enabled: false, auditEnabled: false, contextBudgetTokens: 2_000, backupRetention: DEFAULT_BACKUP_RETENTION };
  if (!isRecord(value)) throw new Error("Saved memory settings could not be read.");
  const enabled = value.enabled === undefined ? false : value.enabled;
  const auditEnabled = value.auditEnabled === undefined ? false : value.auditEnabled;
  const contextBudgetTokens = value.contextBudgetTokens === undefined ? 2_000 : value.contextBudgetTokens;
  const backupRetention = value.backupRetention === undefined ? DEFAULT_BACKUP_RETENTION : value.backupRetention;
  if (typeof enabled !== "boolean" || typeof auditEnabled !== "boolean" ||
    typeof contextBudgetTokens !== "number" || !Number.isInteger(contextBudgetTokens) || contextBudgetTokens < 0 || contextBudgetTokens > 8_000 ||
    typeof backupRetention !== "number" || !Number.isInteger(backupRetention) || backupRetention < 0 || backupRetention > 100) {
    throw new Error("Saved memory settings contain an invalid value.");
  }
  return { enabled, auditEnabled, contextBudgetTokens, backupRetention };
}

export async function saveMemorySettings(settings: MemoryToolSettings): Promise<void> {
  if (typeof settings.enabled !== "boolean" || typeof settings.auditEnabled !== "boolean") throw new Error("Choose valid memory and audit settings.");
  const contextBudgetTokens = settings.contextBudgetTokens ?? 2_000;
  const backupRetention = settings.backupRetention ?? DEFAULT_BACKUP_RETENTION;
  if (!Number.isInteger(contextBudgetTokens) || contextBudgetTokens < 0 || contextBudgetTokens > 8_000) throw new Error("Memory context must be from 0 to 8,000 tokens.");
  if (!Number.isInteger(backupRetention) || backupRetention < 0 || backupRetention > 100) throw new Error("Keep from 0 to 100 memory recovery copies.");
  await standaloneSettingsStore.save(SETTINGS_KEY, { enabled: settings.enabled, auditEnabled: settings.auditEnabled, contextBudgetTokens, backupRetention });
}

export const standaloneMemory = new MemoryService({
  withLock: withMemoryLock,
  async load() {
    return (await loadState()).current;
  },
  async save(snapshot) {
    const state = await loadState();
    const backup: MemoryBackup = { savedAt: new Date().toISOString(), snapshot: state.current };
    const settings = await loadMemorySettings();
    await standaloneSettingsStore.save(STATE_KEY, {
      current: snapshot,
      backups: settings.backupRetention && settings.backupRetention > 0 ? [backup, ...state.backups].slice(0, settings.backupRetention) : [],
    } satisfies MemoryState);
  },
});

export const standaloneMemoryTools = new MemoryToolProvider(standaloneMemory, loadMemorySettings);

export async function getMemoryContext(): Promise<string> {
  const settings = await loadMemorySettings();
  return settings.enabled ? standaloneMemory.run(store => store.getSystemPromptContext(settings.contextBudgetTokens ?? 2_000)) : "";
}

export async function getMemoryBackupCount(): Promise<number> {
  return (await loadState()).backups.length;
}

export async function listStandaloneMemories(query = ""): Promise<Array<ScoredMemoryEntry & { tier: "core" | "staged" | "archive" }>> {
  return standaloneMemory.run(async store => {
    const [core, staged, archive] = await Promise.all([store.loadCore(), store.loadStaged(), store.loadArchive()]);
    const all = [
      ...core.map(entry => ({ ...entry, tier: "core" as const })),
      ...staged.map(entry => ({ ...entry, tier: "staged" as const })),
      ...archive.map(entry => ({ ...entry, tier: "archive" as const })),
    ];
    if (!query.trim()) return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const matchingIds = new Set((await store.search(query)).map(entry => entry.id));
    return all.filter(entry => matchingIds.has(entry.id));
  });
}

export async function createStandaloneMemory(category: MemoryCategory, content: string, tags: string[]): Promise<void> {
  await standaloneMemory.run(async store => { await store.create(category, content, tags); });
}

export async function updateStandaloneMemory(id: string, category: MemoryCategory, content: string, tags: string[]): Promise<void> {
  await standaloneMemory.run(async store => {
    if (!await store.update(id, { category, content, tags })) throw new Error("This memory could not be found. Refresh the list and try again.");
  });
}

export async function deleteStandaloneMemory(id: string): Promise<void> {
  await standaloneMemory.run(async store => {
    if (!await store.delete(id)) throw new Error("This memory could not be found. Refresh the list and try again.");
  });
}

export async function evaluateStandaloneMemories(): Promise<{ promoted: number; demoted: number }> {
  return standaloneMemory.run(store => store.evaluateStaged());
}

export async function listStandaloneMemoryAudit(): Promise<MemoryAuditRecord[]> {
  return standaloneMemory.run(async (_store, snapshot) => {
    const serialized = snapshot["memory/memory-audit.jsonl"] ?? "";
    if (!serialized.trim()) return [];
    try {
      return serialized.trim().split("\n").map(line => JSON.parse(line) as MemoryAuditRecord).reverse();
    } catch {
      throw new Error("The memory activity log could not be read. Its stored content was left untouched.");
    }
  });
}

export async function restorePreviousMemory(): Promise<void> {
  await withMemoryLock(async () => {
    const state = await loadState();
    const settings = await loadMemorySettings();
    const previous = state.backups[0];
    if (!previous) throw new Error("There is no earlier memory version to restore.");
    await standaloneSettingsStore.save(STATE_KEY, {
      current: previous.snapshot,
      backups: (settings.backupRetention ?? DEFAULT_BACKUP_RETENTION) > 0 ? [{ savedAt: new Date().toISOString(), snapshot: state.current }, ...state.backups.slice(1)].slice(0, settings.backupRetention ?? DEFAULT_BACKUP_RETENTION) : [],
    } satisfies MemoryState);
  });
}
