import { useState } from 'react';
import type { ChatSession } from '../../core/types';

interface SessionSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  currentSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onArchiveSession?: (sessionId: string) => void;
  showProviderIndicator?: boolean;
}

export function SessionSidebar({
  isOpen,
  onClose,
  sessions,
  currentSessionId,
  onSelectSession,
  onArchiveSession,
  showProviderIndicator = true,
}: SessionSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  if (!isOpen) return null;

  const filteredSessions = sessions
    .filter((s) => {
      const matchesSearch = (s.title || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesArchive = showArchived ? s.archived === true : s.archived !== true;
      return matchesSearch && matchesArchive;
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="flex-1 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="w-80 bg-white shadow-xl flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Chat History</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sessions..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Archive toggle */}
        <div className="px-3 py-2 border-b flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="text-xs text-blue-600 hover:text-blue-700"
          >
            {showArchived ? 'Active' : 'Trash'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredSessions.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              {showArchived ? 'No archived sessions' : 'No sessions yet'}
            </p>
          ) : (
            filteredSessions.map((session) => (
              <div
                key={session.id}
                className={`group relative w-full text-left p-3 rounded-lg transition-colors ${
                  session.id === currentSessionId
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-100'
                }`}
              >
                <button
                  onClick={() => {
                    onSelectSession(session.id);
                    onClose();
                  }}
                  className="w-full text-left"
                >
                  <p className="font-medium text-sm text-gray-900 truncate pr-6">
                    {session.title || 'Untitled'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-gray-500">
                      {session.messages.length} messages ·{' '}
                      {new Date(session.updatedAt).toLocaleDateString()}
                    </p>
                    {showProviderIndicator && session.llmProvider && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                        {session.llmProvider}
                        {session.llmModel ? ` · ${session.llmModel.split('-').slice(0, 2).join('-')}` : ''}
                      </span>
                    )}
                  </div>
                </button>

                {/* Archive button — hover-activated */}
                {!showArchived && onArchiveSession && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onArchiveSession(session.id);
                    }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-600"
                    title="Archive"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
