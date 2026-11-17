import type { ChatSession } from "super-chat";
import type { ChatPersistenceCapability } from "super-chat/contracts";

const DATABASE_NAME = "super-chat-standalone";
const DATABASE_VERSION = 1;
const SESSIONS_STORE = "sessions";
const SETTINGS_STORE = "settings";

interface SettingRecord<T = unknown> {
	key: string;
	value: T;
	updatedAt: number;
}

let databasePromise: Promise<IDBDatabase> | undefined;

function openDatabase(): Promise<IDBDatabase> {
	if (typeof globalThis.indexedDB === "undefined") {
		return Promise.reject(new Error("Local storage is unavailable in this WebView."));
	}

	if (!databasePromise) {
		databasePromise = new Promise((resolve, reject) => {
			const request = globalThis.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

			request.onupgradeneeded = () => {
				const database = request.result;
				if (!database.objectStoreNames.contains(SESSIONS_STORE)) {
					database.createObjectStore(SESSIONS_STORE, { keyPath: "id" });
				}
				if (!database.objectStoreNames.contains(SETTINGS_STORE)) {
					database.createObjectStore(SETTINGS_STORE, { keyPath: "key" });
				}
			};

			request.onsuccess = () => {
				const database = request.result;
				database.onversionchange = () => {
					database.close();
					databasePromise = undefined;
				};
				resolve(database);
			};
			request.onerror = () => {
				databasePromise = undefined;
				reject(request.error ?? new Error("Could not open local chat storage."));
			};
			request.onblocked = () => {
				databasePromise = undefined;
				reject(new Error("Local chat storage is busy in another app window."));
			};
		});
	}

	return databasePromise;
}

function transactionCompletion(transaction: IDBTransaction): Promise<void> {
	return new Promise((resolve, reject) => {
		transaction.oncomplete = () => resolve();
		transaction.onerror = () => reject(transaction.error ?? new Error("Local storage transaction failed."));
		transaction.onabort = () => reject(transaction.error ?? new Error("Local storage transaction was interrupted."));
	});
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error ?? new Error("Local storage request failed."));
	});
}

async function runRequest<T>(
	storeName: string,
	mode: IDBTransactionMode,
	makeRequest: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
	const database = await openDatabase();
	const transaction = database.transaction(storeName, mode);
	const completed = transactionCompletion(transaction);
	let request: Promise<T>;
	try {
		request = requestResult(makeRequest(transaction.objectStore(storeName)));
	} catch (error) {
		await completed.catch(() => undefined);
		throw error;
	}
	const [result] = await Promise.all([request, completed]);
	return result;
}

async function runWrite(
	storeName: string,
	write: (store: IDBObjectStore, transaction: IDBTransaction) => void,
): Promise<void> {
	const database = await openDatabase();
	const transaction = database.transaction(storeName, "readwrite");
	const completed = transactionCompletion(transaction);
	try {
		write(transaction.objectStore(storeName), transaction);
	} catch (error) {
		await completed.catch(() => undefined);
		throw error;
	}
	await completed;
}

function requireKey(key: string): void {
	if (!key.trim()) throw new Error("A settings key is required.");
}

/** Durable session storage for the standalone Capacitor hosts. */
export const standalonePersistence: ChatPersistenceCapability = {
	id: "standalone-indexeddb-persistence",
	kind: "persistence",
	schemaVersion: DATABASE_VERSION,
	async loadSessions() {
		const sessions = await runRequest<ChatSession[]>(SESSIONS_STORE, "readonly", (store) => store.getAll());
		return sessions.sort((left, right) => right.updatedAt - left.updatedAt);
	},
	async saveSession(session) {
		await runWrite(SESSIONS_STORE, (store) => {
			store.put(session);
		});
	},
	async deleteSession(sessionId) {
		await runWrite(SESSIONS_STORE, (store) => {
			store.delete(sessionId);
		});
	},
	async archiveSession(sessionId) {
		await runWrite(SESSIONS_STORE, (store) => {
			const request = store.get(sessionId);
			request.onsuccess = () => {
				if (request.result) {
					store.put({ ...request.result, archived: true, updatedAt: Date.now() });
				}
			};
		});
	},
};

/** Store non-secret preferences here; provider credentials belong in the native credential capability. */
export const standaloneSettingsStore = {
	async load<T>(key: string): Promise<T | null> {
		requireKey(key);
		const record = await runRequest<SettingRecord<T> | undefined>(
			SETTINGS_STORE,
			"readonly",
			(store) => store.get(key),
		);
		return record?.value ?? null;
	},
	async save<T>(key: string, value: T): Promise<void> {
		requireKey(key);
		await runWrite(SETTINGS_STORE, (store) => {
			store.put({ key, value, updatedAt: Date.now() } satisfies SettingRecord<T>);
		});
	},
	async remove(key: string): Promise<void> {
		requireKey(key);
		await runWrite(SETTINGS_STORE, (store) => {
			store.delete(key);
		});
	},
};
