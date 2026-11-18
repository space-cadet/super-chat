// Copied from obsidian-ai useChatUI's message-selection state.
import { useCallback, useEffect, useState } from "react";

export function useMessageSelection(sessionId: string | undefined) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(
    new Set(),
  );
  const enterSelectionMode = useCallback((messageId?: string) => {
    setSelectionMode(true);
    if (messageId)
      setSelectedMessageIds((prev) => new Set(prev).add(messageId));
  }, []);
  const toggleMessageSelection = useCallback((messageId: string) => {
    setSelectedMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  }, []);
  const clearMessageSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedMessageIds(new Set());
  }, []);

  useEffect(() => {
    clearMessageSelection();
  }, [sessionId, clearMessageSelection]);

  useEffect(() => {
    if (!selectionMode) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") clearMessageSelection();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selectionMode, clearMessageSelection]);

  return {
    selectionMode,
    selectedMessageIds,
    enterSelectionMode,
    toggleMessageSelection,
    clearMessageSelection,
  };
}
