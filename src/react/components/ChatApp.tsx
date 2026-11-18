import { useState, useCallback, useEffect } from 'react';
import { useChat } from '../hooks/useChat';
import type { ChatEngine } from '../../core/ChatEngine';
import type { ChatMessage } from '../../core/types';
import type { ProviderProfileSnapshot } from '../../contracts/host';
import { ChatInput } from './ChatInput';
import { MessageBubble } from './MessageBubble';
import { SessionSidebar } from './SessionSidebar';
import { PendingToolCard } from './PendingToolCard';
import { SessionTabs } from './SessionTabs';

interface ChatAppProps {
	engine: ChatEngine;
	initialSessionId?: string;
	onNewChat?: () => void;
 onOpenSettings?: () => void;
	loadSessionsOnMount?: boolean;
	providerProfiles?: ProviderProfileSnapshot | null;
}

export function ChatApp({
	engine,
	initialSessionId,
	onNewChat,
 onOpenSettings,
	loadSessionsOnMount = true,
	providerProfiles,
}: ChatAppProps) {
  const {
    messages,
    sessions,
    openSessionIds,
    currentSession,
    isStreaming,
    error,
    pendingTools,
    retrieval,
    sendMessage,
    createSession,
    switchSession,
    openSession,
    closeSessionTab,
    archiveSession,
    stopStreaming,
    approveTool,
    rejectTool,
    replayMessage,
	} = useChat(engine, { initialSessionId, loadSessionsOnMount });

  const [sidebarOpen, setSidebarOpen] = useState(false);
	const [modelDraft, setModelDraft] = useState('');
	const [modelNotice, setModelNotice] = useState<string | null>(null);

	const handleNewChat = useCallback(() => {
		createSession("New Chat");
		onNewChat?.();
	}, [createSession, onNewChat]);

  const currentSessionId = currentSession?.id ?? '';
	const profiles = providerProfiles?.profiles ?? [];
	const selectedProfile = profiles.find((profile) => profile.id === currentSession?.llmProfileId)
		?? profiles.find((profile) => profile.id === providerProfiles?.defaultProfileId);
	const modelSuggestions = selectedProfile ? engine.getModels(selectedProfile.provider) : [];

	useEffect(() => {
		setModelDraft(currentSession?.llmModel ?? selectedProfile?.model ?? '');
		setModelNotice(null);
	}, [currentSession?.id, currentSession?.llmModel, selectedProfile?.id, selectedProfile?.model]);

	const commitModel = useCallback(async (value: string) => {
		if (!currentSession || !selectedProfile || !value.trim()) return;
		try {
			await engine.setSessionModelSelection(currentSession.id, {
				providerProfileId: selectedProfile.id,
				provider: selectedProfile.provider,
				model: value.trim(),
			});
			setModelDraft(value.trim());
			setModelNotice(null);
		} catch (cause) {
			setModelNotice(cause instanceof Error ? cause.message : String(cause));
		}
	}, [currentSession, engine, selectedProfile]);

	const changeChatProfile = useCallback(async (profileId: string) => {
		const profile = profiles.find((entry) => entry.id === profileId);
		if (!currentSession || !profile) return;
		try {
			await engine.setSessionModelSelection(currentSession.id, {
				providerProfileId: profile.id,
				provider: profile.provider,
				model: profile.model,
			});
			setModelDraft(profile.model);
			setModelNotice(null);
		} catch (cause) {
			setModelNotice(cause instanceof Error ? cause.message : String(cause));
		}
	}, [currentSession, engine, profiles]);

  return (
		<div className="flex flex-col h-full min-h-0 overflow-hidden bg-gray-50">
		<div className="chat-toolbar-wrap">
			<div className="chat-toolbar" role="toolbar" aria-label="Chat actions">
				<button className="chat-toolbar-icon" type="button" onClick={handleNewChat} aria-label="New chat" title="New chat">
					<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M12 5v14M5 12h14" /></svg>
				</button>
				<button className="chat-toolbar-icon" type="button" onClick={() => setSidebarOpen(true)} aria-label="Open chat history" title="Open chat history">
					<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
				</button>
<button className="chat-toolbar-icon" type="button" disabled title="Search chats — unavailable" aria-label="Search chats — unavailable">⌕</button>
				{selectedProfile && currentSession && (
					<>
						<label className="chat-toolbar-field">
							<span className="sr-only">Provider for this chat</span>
					<select
						aria-label="Provider for this chat"
						value={selectedProfile.id}
						disabled={isStreaming || profiles.length < 2}
						onChange={(event) => void changeChatProfile(event.target.value)}
					>
						{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name} · {profile.provider}</option>)}
					</select>
						</label>
						<label className="chat-toolbar-field chat-toolbar-model">
							<span className="sr-only">Model for this chat</span>
					<input
						aria-label="Model for this chat"
						list="chat-model-suggestions"
						value={modelDraft}
						maxLength={160}
						disabled={isStreaming}
						autoComplete="off"
						onChange={(event) => setModelDraft(event.target.value)}
						onBlur={(event) => void commitModel(event.currentTarget.value)}
						onKeyDown={(event) => {
							if (event.key === 'Enter') {
								event.preventDefault();
								void commitModel(event.currentTarget.value);
							}
						}}
					/>
					<datalist id="chat-model-suggestions">
						{modelSuggestions.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}
					</datalist>
						</label>
					</>
				)}
				{!selectedProfile && (
					<div className="chat-toolbar-model-empty" role="status" title="Connect a provider in Settings to choose a model">
						<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="5" y="5" width="14" height="14" rx="3"/><path strokeLinecap="round" d="M9 2.5v2.5m6-2.5v2.5M9 19v2.5m6-2.5v2.5M2.5 9H5m-2.5 6H5M19 9h2.5M19 15h2.5M9 9h6v6H9z"/></svg>
						<span>Connect a model</span>
					</div>
				)}
<button className="chat-toolbar-icon" type="button" disabled title="Agents — unavailable" aria-label="Agents — unavailable">♧</button>
<button className="chat-toolbar-icon" type="button" disabled title="Sync — unavailable" aria-label="Sync — unavailable">↻</button>
<button className="chat-toolbar-icon" type="button" disabled title="Zen mode — unavailable" aria-label="Zen mode — unavailable">⛶</button>
<button className="chat-toolbar-icon" type="button" onClick={onOpenSettings} disabled={!onOpenSettings} title="Settings" aria-label="Settings">⚙</button>
<button className="chat-toolbar-icon" type="button" disabled title="More actions — unavailable" aria-label="More actions — unavailable">⋯</button>
			</div>
			{modelNotice && <div className="chat-toolbar-notice" role="alert">{modelNotice}</div>}
		</div>

      <SessionTabs
        sessions={sessions}
        openSessionIds={openSessionIds}
        activeSessionId={currentSessionId}
        onSelectSession={openSession}
        onCloseSession={closeSessionTab}
      />

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
                await replayMessage(id);
              }}
              onApproveTool={(callId) => approveTool(callId)}
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
                onApprove={(callId) => approveTool(callId)}
                onReject={(callId) => rejectTool(callId, 'User rejected')}
              />
            ))}
          </div>
        )}
      </div>

      {retrieval.status !== 'idle' && (
        <div className="px-4 pb-2 text-xs text-gray-600" role="status">
          {retrieval.status === 'retrieving' && 'Searching connected sources…'}
          {retrieval.status === 'complete' && retrieval.sources.length > 0 &&
            `Used ${retrieval.sources.length} retrieved source${retrieval.sources.length === 1 ? '' : 's'}.`}
          {retrieval.status === 'partial' &&
            `Retrieved ${retrieval.sources.length} source${retrieval.sources.length === 1 ? '' : 's'} with warnings.`}
          {(retrieval.status === 'failed' || retrieval.status === 'unavailable' || retrieval.status === 'unauthorized') &&
            (retrieval.error?.message || 'Source retrieval failed.')}
          {retrieval.status === 'cancelled' && 'Source retrieval cancelled.'}
        </div>
      )}

      {error && (
        <div role="alert" className="mx-4 mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

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
