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

const STORAGE_KEY = "super-chat:sessions";
const SESSION_PREFIX = "super-chat:session:";

export class LocalStoragePersistenceAdapter implements PersistenceAdapter {
	private maxSessions: number;

	constructor(options?: { maxSessions?: number }) {
		this.maxSessions = options?.maxSessions ?? 100;
	}

	async loadSessions(): Promise<ChatSession[]> {
		if (typeof localStorage === "undefined") {
			return [];
		}

		try {
			const idsJson = localStorage.getItem(STORAGE_KEY);
			const ids: string[] = idsJson ? JSON.parse(idsJson) : [];

			const sessions: ChatSession[] = [];
			for (const id of ids) {
				const sessionJson = localStorage.getItem(`${SESSION_PREFIX}${id}`);
				if (sessionJson) {
					try {
						sessions.push(JSON.parse(sessionJson));
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
				`${SESSION_PREFIX}${session.id}`,
				JSON.stringify(updatedSession),
			);

			// Update index
			const idsJson = localStorage.getItem(STORAGE_KEY);
			const ids: string[] = idsJson ? JSON.parse(idsJson) : [];
			if (!ids.includes(session.id)) {
				ids.unshift(session.id);
			}

			// Enforce max sessions
			while (ids.length > this.maxSessions) {
				const removed = ids.pop();
				if (removed) {
					localStorage.removeItem(`${SESSION_PREFIX}${removed}`);
				}
			}

			localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
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

		localStorage.removeItem(`${SESSION_PREFIX}${sessionId}`);

		const idsJson = localStorage.getItem(STORAGE_KEY);
		const ids: string[] = idsJson ? JSON.parse(idsJson) : [];
		const filtered = ids.filter((id) => id !== sessionId);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
	}

	async archiveSession(sessionId: string): Promise<void> {
		if (typeof localStorage === "undefined") {
			return;
		}

		const sessionJson = localStorage.getItem(`${SESSION_PREFIX}${sessionId}`);
		if (sessionJson) {
			const session = JSON.parse(sessionJson) as ChatSession;
			localStorage.setItem(
				`${SESSION_PREFIX}${sessionId}`,
				JSON.stringify({
					...session,
					archived: true,
					updatedAt: Date.now(),
				}),
			);
		}
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
		const idsJson = localStorage.getItem(STORAGE_KEY);
		const ids: string[] = idsJson ? JSON.parse(idsJson) : [];

		// Remove oldest 10% of sessions
		const toRemove = Math.max(1, Math.floor(ids.length * 0.1));
		const removed = ids.slice(-toRemove);
		const remaining = ids.slice(0, -toRemove);

		for (const id of removed) {
			localStorage.removeItem(`${SESSION_PREFIX}${id}`);
		}

		localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
	}
}
