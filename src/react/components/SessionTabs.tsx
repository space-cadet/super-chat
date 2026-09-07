import type { ChatSession } from '../../core/types';

interface SessionTabsProps {
  sessions: ChatSession[];
  openSessionIds: string[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onCloseSession: (sessionId: string) => void;
}

/** The small, persistent tab strip for conversations currently open in the UI. */
export function SessionTabs({
  sessions,
  openSessionIds,
  activeSessionId,
  onSelectSession,
  onCloseSession,
}: SessionTabsProps) {
  const openSessions = openSessionIds
    .map((id) => sessions.find((session) => session.id === id))
    .filter((session): session is ChatSession => Boolean(session));

  if (openSessions.length === 0) return null;

  return (
    <nav
      aria-label="Open conversations"
      role="tablist"
      className="flex items-end gap-1 overflow-x-auto border-b bg-gray-100 px-3 pt-2"
    >
      {openSessions.map((session) => {
        const active = session.id === activeSessionId;
        return (
          <div
            key={session.id}
            role="tab"
            aria-selected={active}
            className={`group flex min-w-0 max-w-56 items-center rounded-t-lg border border-b-0 ${
              active
                ? 'border-gray-200 bg-white text-gray-900'
                : 'border-transparent text-gray-500 hover:bg-gray-200'
            }`}
          >
            <button
              type="button"
              onClick={() => onSelectSession(session.id)}
              className="min-w-0 flex-1 truncate px-3 py-2 text-left text-sm"
              title={session.title || 'Untitled Chat'}
            >
              {session.title || 'Untitled Chat'}
              {session.messages.length > 0 && (
                <span className="ml-1 text-xs text-gray-400">· {session.messages.length}</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => onCloseSession(session.id)}
              aria-label={`Close ${session.title || 'Untitled Chat'}`}
              title="Close conversation tab"
              className="mr-1 rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
            >
              ×
            </button>
          </div>
        );
      })}
    </nav>
  );
}
