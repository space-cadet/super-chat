import { ThreeTierMemoryStore } from "./ThreeTierMemoryStore";
import type { MemorySnapshotStore } from "./types";

/** Commit all tier and audit changes together through the host's snapshot store. */
export class MemoryService {
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly storage: MemorySnapshotStore) {}

  run<T>(operation: (store: ThreeTierMemoryStore, snapshot: Record<string, string>) => Promise<T>, signal?: AbortSignal): Promise<T> {
    const work = async () => {
      signal?.throwIfAborted();
      const snapshot = structuredClone(await this.storage.load() ?? {});
      const original = JSON.stringify(snapshot);
      const store = new ThreeTierMemoryStore({
        intelligenceDir: "memory",
        storage: {
          exists: async path => Object.hasOwn(snapshot, path),
          read: async path => snapshot[path] ?? "",
          write: async (path, content) => { snapshot[path] = content; },
        },
      });
      const result = await operation(store, snapshot);
      signal?.throwIfAborted();
      if (JSON.stringify(snapshot) !== original) await this.storage.save(snapshot);
      return structuredClone(result);
    };
    const next = this.queue.then(() => this.storage.withLock ? this.storage.withLock(work) : work());
    this.queue = next.then(() => undefined, () => undefined);
    return next;
  }
}
