/**
 * MemoryPersistenceAdapter — In-memory session storage for testing.
 *
 * Stores sessions in a Map, lost on page refresh. Useful for:
 * - Unit tests (no localStorage mocking needed)
 * - Demo apps (no persistence needed)
 * - Development (quick reset by refreshing)
 */

import type { PersistenceAdapter, ChatSession } from "../core/types";

export class MemoryPersistenceAdapter implements PersistenceAdapter {
	private sessions = new Map<string, ChatSession>();

	async loadSessions(): Promise<ChatSession[]> {
		return Array.from(this.sessions.values()).sort(
			(a, b) => b.updatedAt - a.updatedAt,
		);
	}

	async saveSession(session: ChatSession): Promise<void> {
		this.sessions.set(session.id, {
			...session,
			updatedAt: Date.now(),
		});
	}

	async deleteSession(sessionId: string): Promise<void> {
		this.sessions.delete(sessionId);
	}

	async archiveSession(sessionId: string): Promise<void> {
		const session = this.sessions.get(sessionId);
		if (session) {
			this.sessions.set(sessionId, {
				...session,
				archived: true,
				updatedAt: Date.now(),
			});
		}
	}

	/** Clear all sessions (useful for testing) */
	clear(): void {
		this.sessions.clear();
	}

	/** Get count of stored sessions */
	getCount(): number {
		return this.sessions.size;
	}
}
