// Adapted from obsidian-ai ChatTabBar.
import React, { useEffect, useRef } from "react";
import { ChatSession } from "../../core/types";
import ChatIcon from "./ChatIcon";

interface ChatTabBarProps {
  sessions: ChatSession[];
  openSessionIds: string[];
  activeSessionId: string | null;
  generatingSessionIds?: ReadonlySet<string>;
  onSelect: (sessionId: string) => void;
  onClose: (sessionId: string) => void;
  onCloseOthers: (sessionId: string) => void;
  onCloseToRight: (sessionId: string) => void;
  onRename: (sessionId: string, title: string) => void;
  tabTitleWidth?: number;
}

/** Special tab IDs that don't correspond to sessions */
const SPECIAL_TABS = new Set<string>();
const NO_GENERATING_SESSIONS: ReadonlySet<string> = new Set();

function isSpecialTab(id: string): boolean {
  return SPECIAL_TABS.has(id);
}

function getSpecialTabLabel(id: string): string {
  switch (id) {
    default:
      return id;
  }
}

/** A lightweight tab strip for sessions within one shared chat view. */
const ChatTabBar: React.FC<ChatTabBarProps> = ({
  sessions,
  openSessionIds,
  activeSessionId,
  generatingSessionIds = NO_GENERATING_SESSIONS,
  onSelect,
  onClose,
  onCloseOthers,
  onCloseToRight,
  onRename,
  tabTitleWidth = 160,
}) => {
  const tabListRef = useRef<HTMLDivElement>(null);

  // Build tab list including both sessions and special tabs
  const tabs = openSessionIds
    .map((id) => {
      if (isSpecialTab(id)) {
        return {
          id,
          type: "special" as const,
          label: getSpecialTabLabel(id),
        };
      }
      const session = sessions.find((s) => s.id === id);
      return session
        ? {
            id,
            type: "session" as const,
            label: session.title || "New chat",
            session,
          }
        : null;
    })
    .filter(Boolean) as Array<
    | { id: string; type: "special"; label: string }
    | { id: string; type: "session"; label: string; session: ChatSession }
  >;

  // A restored desktop workspace can retain a prior horizontal scroll offset.
  // Begin every newly mounted tab strip at its first tab so no title starts offscreen.
  useEffect(() => {
    tabListRef.current?.scrollTo?.({ left: 0 });
  }, []);

  if (tabs.length === 0) return null;

  return (
    <div
      ref={tabListRef}
      className="chat-session-tabs"
      role="tablist"
      style={
        {
          "--chat-tab-title-width": `${tabTitleWidth}px`,
        } as React.CSSProperties
      }
    >
      {tabs.map((tab) => {
        const active = tab.id === activeSessionId;
        const isSpecial = tab.type === "special";
        const isGenerating = !isSpecial && generatingSessionIds.has(tab.id);
        const accessibleLabel = isGenerating
          ? `${tab.label} — generating`
          : tab.label;
        return (
          <div
            key={tab.id}
            className={`chat-session-tab${active ? " is-active" : ""}${isSpecial ? " is-special" : ""}`}
            role="presentation"
          >
            <button
              className="chat-session-tab-select"
              role="tab"
              aria-selected={active}
              aria-label={accessibleLabel}
              aria-busy={isGenerating}
              onClick={() => onSelect(tab.id)}
              title={accessibleLabel}
            >
              {isGenerating && (
                <span className="chat-session-tab-spinner" aria-hidden="true" />
              )}
              <span className="chat-session-tab-label" dir="ltr">
                {tab.label}
              </span>
            </button>
            <button
              className="chat-session-tab-close"
              onClick={() => onClose(tab.id)}
              aria-label={`Close ${tab.label}`}
              title="Close tab"
            >
              <ChatIcon icon="x" size={13} />
            </button>
            <details className="chat-tab-menu">
              <summary aria-label={"Actions for " + tab.label}>⋯</summary>
              <div className="chat-tab-menu-actions">
                <button onClick={() => onCloseOthers(tab.id)}>
                  Close other tabs
                </button>
                <button onClick={() => onCloseToRight(tab.id)}>
                  Close tabs to the right
                </button>
                <button
                  onClick={() => {
                    const title = window.prompt("Session title", tab.label);
                    if (title?.trim()) onRename(tab.id, title);
                  }}
                >
                  Rename session
                </button>
              </div>
            </details>
          </div>
        );
      })}
    </div>
  );
};

export default ChatTabBar;
