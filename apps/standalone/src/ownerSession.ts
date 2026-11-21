/** The lifetime of one unlocked local user's work. Never persisted. */
export interface OwnerSession { readonly userId: string; readonly signal: AbortSignal }
let current: OwnerSession | null = null;
let controller: AbortController | null = null;
const cleanup = new Set<() => void>();
export function openOwnerSession(userId: string): OwnerSession {
 closeOwnerSession();
 controller = new AbortController();
 current = Object.freeze({ userId, signal: controller.signal });
 return current;
}
export function requireOwnerSession(): OwnerSession {
 if (!current) throw new Error('Sign in to access your local data.');
 assertOwnerSession(current);
 return current;
}
export function assertOwnerSession(session: OwnerSession): void {
 if (session !== current || session.signal.aborted) throw new Error('This sign-in session has ended.');
}
export function onOwnerSessionClosed(callback: () => void): () => void {
 cleanup.add(callback); return () => { cleanup.delete(callback); };
}
export function closeOwnerSession(): void {
 current = null;
 controller?.abort(); controller = null;
 for (const callback of cleanup) { try { callback(); } catch { /* Continue revoking other services. */ } }
}
export function ownerRequestSignal(signal?: AbortSignal): AbortSignal {
 const session = requireOwnerSession();
 return signal ? AbortSignal.any([session.signal, signal]) : session.signal;
}
