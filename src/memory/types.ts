export type MemoryCategory =
	| "user_fact"
	| "project"
	| "preference"
	| "insight"
	| "reference";

export interface MemoryEntry {
	id: string;
	timestamp: string; // ISO-8601 date (YYYY-MM-DD)
	category: MemoryCategory;
	content: string;
	tags: string[];
}


export interface MemoryStorage {
 exists(path: string): Promise<boolean>;
 read(path: string): Promise<string>;
 write(path: string, content: string): Promise<void>;
}

export interface MemorySnapshotStore {
 withLock?<T>(operation: () => Promise<T>): Promise<T>;
 load(): Promise<Record<string, string> | null>;
 save(snapshot: Record<string, string>): Promise<void>;
}
