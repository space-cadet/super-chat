import { toStoredSession, fromStoredSession, sessionRuntimeState, restoreRuntimeState, type StoredChatSession, type SessionRuntimeState } from "../../../src/core/conversationFormat";
import { requireOwnerSession, assertOwnerSession, type OwnerSession } from "./ownerSession";
import type { ChatSession } from "super-chat";
import type { ChatPersistenceCapability } from "super-chat/contracts";

const DATABASE_NAME = "super-chat-standalone";
const DATABASE_VERSION = 3;
// Direct format cutover. Previous chat stores are neither read nor converted.
const OWNED_SESSIONS = "conversation-sessions";
const OWNED_SETTINGS = "owned-settings";
const META_STORE = "ownership";
const ACCOUNT_KEY = "standalone.local-account-v1";
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
                if (!database.objectStoreNames.contains(OWNED_SESSIONS)) database.createObjectStore(OWNED_SESSIONS, { keyPath: ["ownerId", "id"] });
                if (!database.objectStoreNames.contains(OWNED_SETTINGS)) database.createObjectStore(OWNED_SETTINGS, { keyPath: ["ownerId", "key"] });
                if (!database.objectStoreNames.contains(META_STORE)) database.createObjectStore(META_STORE);
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

/** Only the login record is readable before unlocking; never exported or synced. */
export async function loadLocalAccountRecord<T>(): Promise<T | null> {
 const record = await runRequest<SettingRecord<T> | undefined>(SETTINGS_STORE, "readonly", store => store.get(ACCOUNT_KEY));
 return record?.value ?? null;
}
export async function createLocalAccountRecord(value: { id: string }): Promise<void> {
 await runWrite(SETTINGS_STORE, (store, tx) => {
  const request = store.get(ACCOUNT_KEY);
  request.onsuccess = () => {
   if (request.result) { tx.abort(); return; }
   store.add({ key: ACCOUNT_KEY, value, updatedAt: Date.now() });
  };
 });
}

/** Atomically associate the legacy data once. Original records are removed in the same transaction after copying. */
export async function prepareLocalOwner(userId: string): Promise<void> {
 const database = await openDatabase();
 const tx = database.transaction([SETTINGS_STORE, SESSIONS_STORE, OWNED_SESSIONS, OWNED_SETTINGS, META_STORE], "readwrite");
 const complete = transactionCompletion(tx);
 const meta = tx.objectStore(META_STORE);
 const account = tx.objectStore(SETTINGS_STORE).get(ACCOUNT_KEY);
 account.onsuccess = () => {
  if (account.result?.value?.id !== userId) { tx.abort(); return; }
  const claim = meta.get("legacy-owner");
  claim.onsuccess = () => {
   if (claim.result) {
    if (claim.result.userId !== userId) { tx.abort(); return; }
    // An earlier migration already committed the owned records.
    tx.objectStore(SESSIONS_STORE).clear();
    const old = tx.objectStore(SETTINGS_STORE).openCursor();
    old.onsuccess = () => { const cursor = old.result; if (!cursor) return; if (cursor.key !== ACCOUNT_KEY) cursor.delete(); cursor.continue(); };
    return;
   }
   const settings = tx.objectStore(SETTINGS_STORE).openCursor();
   settings.onsuccess = () => { const cursor = settings.result; if (!cursor) return;
    if (cursor.key !== ACCOUNT_KEY) { tx.objectStore(OWNED_SETTINGS).add({ ...cursor.value, ownerId: userId }); cursor.delete(); } cursor.continue(); };
   meta.add({ userId, migratedAt: Date.now(), version: 1 }, "legacy-owner");
  };
 };
 await complete;
}

interface OwnedSession { ownerId: string; id: string; value: StoredChatSession; runtime?: SessionRuntimeState }
async function ownerRequest<T>(storeName: string, mode: IDBTransactionMode, action: (store: IDBObjectStore, owner: OwnerSession) => IDBRequest<T>): Promise<T> {
 const owner = requireOwnerSession();
 const database = await openDatabase();
 assertOwnerSession(owner);
 const tx = database.transaction(storeName, mode);
 const completed = transactionCompletion(tx);
 const revoke = () => { try { tx.abort(); } catch { /* Transaction already complete. */ } };
 owner.signal.addEventListener("abort", revoke, { once: true });
 try {
  const [result] = await Promise.all([requestResult(action(tx.objectStore(storeName), owner)), completed]);
  assertOwnerSession(owner); return result;
 } finally { owner.signal.removeEventListener("abort", revoke); }
}
function ownerRange(owner: OwnerSession) { return IDBKeyRange.bound([owner.userId, ""], [owner.userId, []]); }

export const standalonePersistence: ChatPersistenceCapability = {
 id: "standalone-owned-indexeddb-persistence", kind: "persistence", schemaVersion: 1,
 loadWorkspace() { return standaloneSettingsStore.load("chat-workspace"); },
 saveWorkspace(workspace) { return standaloneSettingsStore.save("chat-workspace", workspace); },
 async loadSessions() {
  const records = await ownerRequest<OwnedSession[]>(OWNED_SESSIONS, "readonly", (store, owner) => store.getAll(ownerRange(owner)));
  return records.map(record => restoreRuntimeState(fromStoredSession(record.value),record.runtime)).sort((a,b) => b.updatedAt-a.updatedAt);
 },
 async saveSession(session) {
  await ownerRequest(OWNED_SESSIONS, "readwrite", (store, owner) => store.put({ ownerId: owner.userId, id: session.id, value: toStoredSession(session), runtime: sessionRuntimeState(session) }));
 },
 async deleteSession(id) { await ownerRequest(OWNED_SESSIONS, "readwrite", (store, owner) => store.delete([owner.userId, id])); },
 async archiveSession(id) {
  const owner = requireOwnerSession();
  const record = await ownerRequest<OwnedSession | undefined>(OWNED_SESSIONS, "readonly", store => store.get([owner.userId, id]));
  assertOwnerSession(owner);
  if (record) await standalonePersistence.saveSession({ ...restoreRuntimeState(fromStoredSession(record.value),record.runtime), archived: true, updatedAt: Date.now() }, { requestId: crypto.randomUUID() });
 },
};
export const standaloneSettingsStore = {
 async load<T>(key: string): Promise<T | null> {
  requireKey(key);
  const record = await ownerRequest<SettingRecord<T> | undefined>(OWNED_SETTINGS, "readonly", (store, owner) => store.get([owner.userId, key]));
  return record?.value ?? null;
 },
 async save<T>(key: string, value: T): Promise<void> {
  requireKey(key);
  await ownerRequest(OWNED_SETTINGS, "readwrite", (store, owner) => store.put({ ownerId: owner.userId, key, value, updatedAt: Date.now() }));
 },
 async remove(key: string): Promise<void> {
  requireKey(key);
  await ownerRequest(OWNED_SETTINGS, "readwrite", (store, owner) => store.delete([owner.userId, key]));
 },
};
