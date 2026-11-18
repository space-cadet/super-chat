import { parseSessionArchive } from "../../utils/importChat";
import { useMessageSelection } from "../hooks/useMessageSelection";
import { getThinkingModeOptions } from "../../api/thinkingModes";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useChat } from "../hooks/useChat";
import type { ChatEngine } from "../../core/ChatEngine";
import type { ChatMessage, ChatSettings } from "../../core/types";
import type { ProviderProfileSnapshot } from "../../contracts/host";
import { ChatInput } from "./ChatInput";
import { MessageBubble } from "./MessageBubble";
import { PendingToolCard } from "./PendingToolCard";
import ChatTabBar from "./ChatTabBar";
import SessionPickerModal from "./presentational/SessionPickerModal";
import SearchResults from "./presentational/search-results";
import ExportModal from "./presentational/ExportModal";
import { useSearch } from "../hooks/useSearch";
import { generateFilename, serializeChatExport } from "../../utils/exportChat";
import type { ExportFormat } from "../../utils/exportChat";
import type { ChatSession } from "../../core/types";
import { ChatIcon } from "./ChatIcon";

interface ChatAppProps {
  onSaveExport?: (filename: string, content: string) => Promise<void>;
  engine: ChatEngine;
  initialSessionId?: string;
  onNewChat?: () => void;
  onOpenSettings?: () => void;
  loadSessionsOnMount?: boolean;
  providerProfiles?: ProviderProfileSnapshot | null;
  chatSettings?: Partial<ChatSettings>;
}

export function ChatApp({
  engine,
  onSaveExport,
  initialSessionId,
  onNewChat,
  onOpenSettings,
  loadSessionsOnMount = true,
  providerProfiles,
  chatSettings,
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
    deleteSession,
    openSession,
    closeSessionTab,

    stopStreaming,
    approveTool,
    rejectTool,
    resendMessage,
  } = useChat(engine, { initialSessionId, loadSessionsOnMount });
  const effectiveChatSettings = { ...engine.getSettings(), ...chatSettings };

  const selection = useMessageSelection(currentSession?.id);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [workspaceNotice, setWorkspaceNotice] = useState<string | null>(null);
  const [scrollToMessageId, setScrollToMessageId] = useState<string>();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const followRef = useRef(true);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const previousSessionRef = useRef<string | undefined>(undefined);

  const openSessionInTab = useCallback(
    (sessionId: string, messageId?: string) => {
      if (openSession(sessionId)) setScrollToMessageId(messageId);
    },
    [openSession],
  );
  const visibleSessions = useMemo(
    () => sessions.filter((session) => !session.archived),
    [sessions],
  );
  const search = useSearch(visibleSessions, openSessionInTab);

  const reportError = useCallback((cause: unknown) => {
    setWorkspaceNotice(cause instanceof Error ? cause.message : String(cause));
  }, []);
  const renameSession = useCallback(
    (id: string, title: string) => {
      void engine.updateSessionMetadata(id, { title }).catch(reportError);
    },
    [engine, reportError],
  );
  const updateDraft = useCallback(
    (draft: string) => {
      if (currentSession)
        void engine
          .updateSessionMetadata(currentSession.id, { draft })
          .catch(reportError);
    },
    [engine, currentSession?.id, reportError],
  );
  const closeTab = useCallback(
    (id: string) => {
      closeSessionTab(id);
      if (!engine.getActiveSession()) createSession("New Chat");
    },
    [engine, closeSessionTab, createSession],
  );
  const saveExport = useCallback(
    async (filename: string, content: string) => {
      if (onSaveExport) return onSaveExport(filename, content);
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    [onSaveExport],
  );
  const importArchive = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setIsImporting(true);
      try {
        if (file.size > 20 * 1024 * 1024)
          throw new Error("Chat archives must be 20 MB or smaller.");
        const sessions = parseSessionArchive(
          await file.text(),
          file.name.replace(/\.(json|jsonl)$/i, ""),
        );
        const imported = await engine.importSessions(sessions);
        if (imported[0]) openSessionInTab(imported[0].id);
        setWorkspaceNotice(
          "Imported " +
            imported.length +
            " chat" +
            (imported.length === 1 ? "." : "s."),
        );
      } catch (cause) {
        reportError(cause);
      } finally {
        setIsImporting(false);
      }
    },
    [engine, openSessionInTab, reportError],
  );
  const exportSession = useCallback(
    (session: ChatSession, format: ExportFormat, copy: boolean) => {
      const content = serializeChatExport({
        kind: "sessions",
        sessions: [session],
        scope: "single",
        format,
      });
      const action = copy
        ? navigator.clipboard.writeText(content)
        : saveExport(
            generateFilename("single", format, session.title),
            content,
          );
      void action
        .then(() =>
          setWorkspaceNotice(copy ? "Chat copied." : "Chat exported."),
        )
        .catch(reportError);
    },
    [reportError, saveExport],
  );

  // Adapted from Obsidian-AI ChatMessages: follow new content until the user scrolls up.
  useEffect(() => {
    const container = transcriptRef.current;
    if (!container) return;
    if (previousSessionRef.current !== currentSession?.id) {
      previousSessionRef.current = currentSession?.id;
      followRef.current = !scrollToMessageId;
    }
    if (scrollToMessageId) {
      const target = Array.from(
        container.querySelectorAll<HTMLElement>("[data-message-id]"),
      ).find((element) => element.dataset.messageId === scrollToMessageId);
      target?.scrollIntoView?.({ block: "center" });
      target?.focus({ preventScroll: true });
      followRef.current = false;
    } else if (followRef.current) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, currentSession?.id, scrollToMessageId]);

  useEffect(() => {
    const container = transcriptRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (followRef.current) container.scrollTop = container.scrollHeight;
    });
    if (container.firstElementChild)
      observer.observe(container.firstElementChild);
    return () => observer.disconnect();
  }, [currentSession?.id, search.searchVisible]);
  const [modelDraft, setModelDraft] = useState("");
  const [modelNotice, setModelNotice] = useState<string | null>(null);

  const handleNewChat = useCallback(() => {
    createSession("New Chat");
    onNewChat?.();
  }, [createSession, onNewChat]);

  const currentSessionId = currentSession?.id ?? "";
  const profiles = providerProfiles?.profiles ?? [];
  const selectedProfile =
    profiles.find((profile) => profile.id === currentSession?.llmProfileId) ??
    profiles.find(
      (profile) => profile.id === providerProfiles?.defaultProfileId,
    );
  const modelSuggestions = selectedProfile
    ? engine.getModels(selectedProfile.provider)
    : [];

  useEffect(() => {
    setModelDraft(currentSession?.llmModel ?? selectedProfile?.model ?? "");
    setModelNotice(null);
  }, [
    currentSession?.id,
    currentSession?.llmModel,
    selectedProfile?.id,
    selectedProfile?.model,
  ]);

  const commitModel = useCallback(
    async (value: string) => {
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
    },
    [currentSession, engine, selectedProfile],
  );

  const changeChatProfile = useCallback(
    async (profileId: string) => {
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
    },
    [currentSession, engine, profiles],
  );

  return (
    <div
      className={
        "super-chat-workspace flex flex-col h-full min-h-0 overflow-hidden bg-gray-50"
      }
    >
      <div className="chat-toolbar-wrap">
        <div className="chat-toolbar" role="toolbar" aria-label="Chat actions">
          <button
            className="chat-toolbar-icon"
            type="button"
            onClick={handleNewChat}
            aria-label="New chat"
            title="New chat"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <button
            className="chat-toolbar-icon"
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open chat history"
            title="Open chat history"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <button
            className="chat-toolbar-icon"
            type="button"
            onClick={search.toggleSearch}
            aria-pressed={search.searchVisible}
            title="Search chats"
            aria-label="Search chats"
          >
            <ChatIcon icon="search" />
          </button>
          {selectedProfile && currentSession && (
            <>
              <label className="chat-toolbar-field">
                <span className="sr-only">Provider for this chat</span>
                <select
                  aria-label="Provider for this chat"
                  value={selectedProfile.id}
                  disabled={isStreaming || profiles.length < 2}
                  onChange={(event) =>
                    void changeChatProfile(event.target.value)
                  }
                >
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name} · {profile.provider}
                    </option>
                  ))}
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
                  onBlur={(event) =>
                    void commitModel(event.currentTarget.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void commitModel(event.currentTarget.value);
                    }
                  }}
                />
                <datalist id="chat-model-suggestions">
                  {modelSuggestions.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </datalist>
              </label>
            </>
          )}
          {!selectedProfile && (
            <div
              className="chat-toolbar-model-empty"
              role="status"
              title="Connect a provider in Settings to choose a model"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <rect x="5" y="5" width="14" height="14" rx="3" />
                <path
                  strokeLinecap="round"
                  d="M9 2.5v2.5m6-2.5v2.5M9 19v2.5m6-2.5v2.5M2.5 9H5m-2.5 6H5M19 9h2.5M19 15h2.5M9 9h6v6H9z"
                />
              </svg>
              <span>Connect a model</span>
            </div>
          )}
          <button
            className="chat-toolbar-icon"
            type="button"
            disabled
            title="Agents — unavailable"
            aria-label="Agents — unavailable"
          >
            ♧
          </button>
          <button
            className="chat-toolbar-icon"
            type="button"
            disabled
            title="Sync — unavailable"
            aria-label="Sync — unavailable"
          >
            ↻
          </button>
          <button
            className="chat-toolbar-icon"
            type="button"
            disabled
            title="Zen mode — unavailable"
            aria-label="Zen mode — unavailable"
          >
            ⛶
          </button>
          <button
            className="chat-toolbar-icon"
            type="button"
            onClick={onOpenSettings}
            disabled={!onOpenSettings}
            title="Settings"
            aria-label="Settings"
          >
            ⚙
          </button>
          <button
            type="button"
            className="chat-toolbar-icon"
            aria-label="Import chats"
            title="Import chats"
            disabled={isImporting}
            onClick={() => importInputRef.current?.click()}
          >
            <ChatIcon icon="upload" />
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".json,.jsonl,application/json"
            className="sr-only"
            aria-label="Chat archive"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              void importArchive(file);
            }}
          />
          <button
            className="chat-toolbar-icon"
            type="button"
            onClick={() => setExportOpen(true)}
            title="Export chats"
            aria-label="Export chats"
          >
            <ChatIcon icon="download" />
          </button>
        </div>
        {modelNotice && (
          <div className="chat-toolbar-notice" role="alert">
            {modelNotice}
          </div>
        )}
      </div>

      <ChatTabBar
        sessions={sessions}
        openSessionIds={openSessionIds}
        activeSessionId={currentSessionId}
        generatingSessionIds={
          isStreaming && currentSessionId
            ? new Set([currentSessionId])
            : undefined
        }
        onSelect={(id) => openSessionInTab(id)}
        onClose={closeTab}
        onRename={renameSession}
        onCloseOthers={(id) => {
          openSession(id);
          openSessionIds
            .filter((other) => other !== id)
            .forEach(closeSessionTab);
        }}
        onCloseToRight={(id) => {
          openSessionIds
            .slice(openSessionIds.indexOf(id) + 1)
            .forEach(closeSessionTab);
          if (!engine.getActiveSession()) openSession(id);
        }}
      />
      {workspaceNotice && (
        <div role="status" className="chat-toolbar-notice">
          {workspaceNotice}
        </div>
      )}
      {search.searchVisible && (
        <div className="chat-search-panel">
          <div className="chat-search-input-wrapper">
            <ChatIcon icon="search" />
            <input
              autoFocus
              className="chat-search-input"
              type="search"
              aria-label="Search across chats"
              placeholder="Search across chats"
              value={search.searchQuery}
              onChange={(event) => search.setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") search.toggleSearch();
              }}
            />
            <button
              type="button"
              className="chat-search-clear"
              aria-label="Close search"
              onClick={search.toggleSearch}
            >
              <ChatIcon icon="x" />
            </button>
          </div>
          <SearchResults
            results={search.searchResults}
            loading={search.searchLoading}
            query={search.searchQuery}
            onSelectSession={search.handleSelectSearchResult}
          />
        </div>
      )}
      {/* Messages area */}
      <div
        ref={transcriptRef}
        className="flex-1 overflow-y-auto p-4"
        onScroll={() => {
          const container = transcriptRef.current;
          if (!container) return;
          const atBottom =
            container.scrollHeight -
              container.scrollTop -
              container.clientHeight <
            80;
          followRef.current = atBottom;
          setShowScrollBottom(!atBottom && messages.length > 0);
        }}
      >
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <svg
                className="w-12 h-12 mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p>Start a new conversation</p>
            </div>
          ) : (
            messages.map((message: ChatMessage) => (
              <div
                key={message.id}
                data-message-id={message.id}
                tabIndex={-1}
                className={
                  scrollToMessageId === message.id
                    ? "chat-message-search-target"
                    : undefined
                }
              >
                <MessageBubble
                  message={message}
                  showTimestamps={effectiveChatSettings.showTimestamps}
                  showTokenCount={effectiveChatSettings.showTokenCount}
                  actionsDisabled={isStreaming}
                  onEdit={async (id, text) => {
                    await resendMessage(id, text);
                  }}
                  selectionMode={selection.selectionMode}
                  selected={selection.selectedMessageIds.has(message.id)}
                  onLongPress={selection.enterSelectionMode}
                  onToggleSelection={selection.toggleMessageSelection}
                  onRetry={async (id) => {
                    await resendMessage(id);
                  }}
                  onApproveTool={(callId) => approveTool(callId)}
                  onRejectTool={(callId) => rejectTool(callId, "User rejected")}
                />
              </div>
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
                  onReject={(callId) => rejectTool(callId, "User rejected")}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      {showScrollBottom && (
        <button
          type="button"
          className="chat-return-latest"
          onClick={() => {
            setScrollToMessageId(undefined);
            followRef.current = true;
            const container = transcriptRef.current;
            if (container) container.scrollTop = container.scrollHeight;
            setShowScrollBottom(false);
          }}
        >
          Return to latest
        </button>
      )}

      {retrieval.status !== "idle" && (
        <div className="px-4 pb-2 text-xs text-gray-600" role="status">
          {retrieval.status === "retrieving" && "Searching connected sources…"}
          {retrieval.status === "complete" &&
            retrieval.sources.length > 0 &&
            `Used ${retrieval.sources.length} retrieved source${retrieval.sources.length === 1 ? "" : "s"}.`}
          {retrieval.status === "partial" &&
            `Retrieved ${retrieval.sources.length} source${retrieval.sources.length === 1 ? "" : "s"} with warnings.`}
          {(retrieval.status === "failed" ||
            retrieval.status === "unavailable" ||
            retrieval.status === "unauthorized") &&
            (retrieval.error?.message || "Source retrieval failed.")}
          {retrieval.status === "cancelled" && "Source retrieval cancelled."}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mx-4 mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {selection.selectionMode && (
        <div
          className="chat-selection-toolbar"
          role="toolbar"
          aria-label="Message selection"
        >
          <span>{selection.selectedMessageIds.size} selected</span>
          <button
            type="button"
            disabled={selection.selectedMessageIds.size === 0}
            onClick={() => {
              const selected = messages.filter((message) =>
                selection.selectedMessageIds.has(message.id),
              );
              void navigator.clipboard
                .writeText(
                  serializeChatExport({
                    kind: "messages",
                    messages: selected,
                    format: "md",
                  }),
                )
                .then(selection.clearMessageSelection)
                .catch(reportError);
            }}
          >
            Copy selected
          </button>
          <button type="button" onClick={selection.clearMessageSelection}>
            Cancel selection
          </button>
        </div>
      )}

      {/* Input */}
      <ChatInput
        key={currentSessionId}
        pressEnterToSend={effectiveChatSettings.pressEnterToSend}
        showTokenCount={effectiveChatSettings.showTokenCount}
        draft={currentSession?.draft ?? ""}
        onDraftChange={updateDraft}
        attachments={currentSession?.draftAttachments ?? []}
        onAttachmentsChange={(draftAttachments) => {
          if (currentSession)
            void engine
              .updateSessionMetadata(currentSession.id, { draftAttachments })
              .catch(reportError);
        }}
        thinkingMode={currentSession?.thinkingMode ?? "provider-default"}
        thinkingModeOptions={getThinkingModeOptions({
          provider: currentSession?.llmProvider ?? "",
          model: currentSession?.llmModel,
        })}
        onThinkingModeChange={(thinkingMode) => {
          if (currentSession)
            void engine
              .updateSessionMetadata(currentSession.id, { thinkingMode })
              .catch(reportError);
        }}
        onSend={async (text, attachments) => {
          setScrollToMessageId(undefined);
          followRef.current = true;
          return sendMessage(text, attachments);
        }}
        onStop={stopStreaming}
        isStreaming={isStreaming}
      />

      {sidebarOpen && (
        <SessionPickerModal
          sessions={sessions.filter((session) => !session.archived)}
          activeSessionId={currentSessionId}
          onClose={() => setSidebarOpen(false)}
          onLoad={(id) => {
            openSessionInTab(id);
            setSidebarOpen(false);
          }}
          onRename={renameSession}
          onDelete={(id) => {
            void deleteSession(id)
              .then(() => {
                if (!engine.getActiveSession()) createSession("New Chat");
              })
              .catch(reportError);
          }}
          onUpdateTags={(id, tags) => {
            void engine.updateSessionMetadata(id, { tags }).catch(reportError);
          }}
          onCopy={(session, format) => exportSession(session, format, true)}
          onExport={(session, format) => exportSession(session, format, false)}
        />
      )}
      {exportOpen && (
        <ExportModal
          sessions={sessions.filter(
            (session) => session.messages.length > 0 && !session.archived,
          )}
          activeSessionId={currentSessionId}
          onClose={() => setExportOpen(false)}
          onSave={saveExport}
        />
      )}
    </div>
  );
}
