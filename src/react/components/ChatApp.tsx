import { useState, useCallback } from 'react';
import { useChat } from '../hooks/useChat';
import type { ChatEngine } from '../../core/ChatEngine';
import type { ChatMessage } from '../../core/types';
import { ChatInput } from './ChatInput';
import { MessageBubble } from './MessageBubble';
import { SessionSidebar } from './SessionSidebar';
import { PendingToolCard } from './PendingToolCard';

interface ChatAppProps {
  engine: ChatEngine;
  initialSessionId?: string;
  onNewChat?: () => void;
}

export function ChatApp({ engine, initialSessionId, onNewChat }: ChatAppProps) {
  const {
    messages,
    sessions,
    currentSession,
    isStreaming,
    pendingTools,
    sendMessage,
    createSession,
    switchSession,
    archiveSession,
    stopStreaming,
    approveTool,
    rejectTool,
    loadSessions,
  } = useChat(engine, { initialSessionId });

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleNewChat = useCallback(() => {
    createSession();
    onNewChat?.();
  }, [createSession, onNewChat]);

  const currentSessionId = currentSession?.id ?? '';

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setSidebarOpen(true); loadSessions(); }}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
            title="Open sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="font-semibold text-gray-900">
            {currentSession?.title || 'Chat'}
          </h1>
        </div>
        <button
          onClick={handleNewChat}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
        >
          + New Chat
        </button>
      </header>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p>Start a new conversation</p>
          </div>
        ) : (
          messages.map((message: ChatMessage) => (
            <MessageBubble
              key={message.id}
              message={message}
              onRetry={async (id) => {
                // Retry not yet implemented in useChat hook
                console.log('Retry:', id);
              }}
              onApproveTool={(callId) => approveTool(callId, { success: true, content: 'Approved' })}
              onRejectTool={(callId) => rejectTool(callId, 'User rejected')}
            />
          ))
        )}

        {/* Pending tools (global, not attached to a message) */}
        {pendingTools.length > 0 && (
          <div className="space-y-2 max-w-[80%]">
            {pendingTools.map((tool) => (
              <PendingToolCard
                key={tool.id}
                toolCall={tool}
                onApprove={(callId) => approveTool(callId, { success: true, content: 'Approved' })}
                onReject={(callId) => rejectTool(callId, 'User rejected')}
              />
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        onStop={stopStreaming}
        isStreaming={isStreaming}
      />

      {/* Sidebar */}
      <SessionSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={(id) => switchSession(id)}
        onArchiveSession={archiveSession}
      />
    </div>
  );
}
