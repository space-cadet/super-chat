import { toStoredSession, fromStoredSession, sessionRuntimeState, restoreRuntimeState } from "../core/conversationFormat";
/**
 * LocalStoragePersistenceAdapter — Browser localStorage session persistence.
 *
 * Stores sessions as JSON in localStorage. Keys:
 * - `super-chat:sessions` — array of session IDs
 * - `super-chat:session:{id}` — individual session JSON
 *
 * Handles serialization/deserialization, quota errors, and migration.
 */

import type { PersistenceAdapter, ChatSession } from "../core/types";



export class LocalStoragePersistenceAdapter implements PersistenceAdapter {
	private maxSessions: number;
 private storageKey: string;
 private sessionPrefix: string;

	constructor(options?: { maxSessions?: number; ownerId?: string }) {
		this.maxSessions = options?.maxSessions ?? 100;
  // Omitted ownerId preserves the original single-owner adapter contract.
  // Account-based hosts must supply a stable ownerId; legacy keys are never adopted automatically.
  const prefix = options?.ownerId === undefined ? "super-chat:" : `super-chat:owner:${encodeURIComponent(options.ownerId)}:`;
  if (options?.ownerId !== undefined && !options.ownerId.trim()) throw new Error("An owner ID is required.");
  this.storageKey = prefix + "sessions";
  this.sessionPrefix = prefix + "session:";
	}

	async loadSessions(): Promise<ChatSession[]> {
		if (typeof localStorage === "undefined") {
			return [];
		}

		try {
			const idsJson = localStorage.getItem(this.storageKey);
			const ids: string[] = idsJson ? JSON.parse(idsJson) : [];

			const sessions: ChatSession[] = [];
			for (const id of ids) {
				const sessionJson = localStorage.getItem(`${this.sessionPrefix}${id}`);
				if (sessionJson) {
					try {
						sessions.push(restoreRuntimeState(fromStoredSession(JSON.parse(sessionJson)), JSON.parse(localStorage.getItem(`${this.sessionPrefix}${id}:runtime`) ?? "null")));
					} catch {
						// Skip corrupted sessions
					}
				}
			}

			return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
		} catch {
			return [];
		}
	}

	async saveSession(session: ChatSession): Promise<void> {
		if (typeof localStorage === "undefined") {
			return;
		}

		try {
			// Update session
			const updatedSession = {
				...session,
				updatedAt: Date.now(),
			};
			localStorage.setItem(
				`${this.sessionPrefix}${session.id}`,
				JSON.stringify(toStoredSession(updatedSession)),
			);

			localStorage.setItem(`${this.sessionPrefix}${session.id}:runtime`, JSON.stringify(sessionRuntimeState(session)));
			// Update index
			const idsJson = localStorage.getItem(this.storageKey);
			const ids: string[] = idsJson ? JSON.parse(idsJson) : [];
			if (!ids.includes(session.id)) {
				ids.unshift(session.id);
			}

			// Enforce max sessions
			while (ids.length > this.maxSessions) {
				const removed = ids.pop();
				if (removed) {
					localStorage.removeItem(`${this.sessionPrefix}${removed}`);
 localStorage.removeItem(`${this.sessionPrefix}${removed}:runtime`);
				}
			}

			localStorage.setItem(this.storageKey, JSON.stringify(ids));
		} catch (err) {
			if (this.isQuotaError(err)) {
				// Try to free space by removing oldest sessions
				await this.evictOldestSessions();
				// Retry once
				await this.saveSession(session);
			} else {
				throw err;
			}
		}
	}

	async deleteSession(sessionId: string): Promise<void> {
		if (typeof localStorage === "undefined") {
			return;
		}

		localStorage.removeItem(`${this.sessionPrefix}${sessionId}`);
 localStorage.removeItem(`${this.sessionPrefix}${sessionId}:runtime`);

		const idsJson = localStorage.getItem(this.storageKey);
		const ids: string[] = idsJson ? JSON.parse(idsJson) : [];
		const filtered = ids.filter((id) => id !== sessionId);
		localStorage.setItem(this.storageKey, JSON.stringify(filtered));
	}

	async archiveSession(sessionId: string): Promise<void> {
		if (typeof localStorage === "undefined") {
			return;
		}

        const session = (await this.loadSessions()).find(item => item.id === sessionId);
        if (session) await this.saveSession({...session,archived:true});
    }

	private isQuotaError(err: unknown): boolean {
		return (
			err instanceof Error &&
			(err.name === "QuotaExceededError" ||
				err.message.includes("quota") ||
				err.message.includes("exceeded"))
		);
	}

	private async evictOldestSessions(): Promise<void> {
		const idsJson = localStorage.getItem(this.storageKey);
		const ids: string[] = idsJson ? JSON.parse(idsJson) : [];

		// Remove oldest 10% of sessions
		const toRemove = Math.max(1, Math.floor(ids.length * 0.1));
		const removed = ids.slice(-toRemove);
		const remaining = ids.slice(0, -toRemove);

		for (const id of removed) {
			localStorage.removeItem(`${this.sessionPrefix}${id}`);
 localStorage.removeItem(`${this.sessionPrefix}${id}:runtime`);
		}

		localStorage.setItem(this.storageKey, JSON.stringify(remaining));
	}
}
