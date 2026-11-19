import {
  estimateTokens,
  estimateAttachmentTokens,
} from "../../core/tokenEstimator";
// Adapted directly from obsidian-ai ChatInput's draft, submission, and keyboard code.
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { MarkdownRenderer } from "./MarkdownRenderer";

import type { Attachment, ThinkingMode } from "../../core/types";
import type { ThinkingModeOption } from "../../api/thinkingModes";
import { createExternalAttachment } from "../../context/AttachmentEngine";
import ChatInputAttachments from "./ChatInputAttachments";

interface ChatInputProps {
  attachments?: Attachment[];
  onAttachmentsChange?: (attachments: Attachment[]) => void;
  thinkingMode?: ThinkingMode;
  thinkingModeOptions?: ThinkingModeOption[];
  onThinkingModeChange?: (mode: ThinkingMode) => void;
  onSend: (
    text: string,
    attachments?: Attachment[],
  ) => void | boolean | Promise<void | boolean>;
  onStop: () => void;
  isStreaming: boolean;
  isEditing?: boolean;
  onCancel?: () => void;
  editMessage?: string;
  pressEnterToSend?: boolean;
  draft?: string;
  onDraftChange?: (text: string) => void;
  showTokenCount?: boolean;
  tokenTotal?: string;
}

export function ChatInput({
  onSend,
  attachments = [],
  onAttachmentsChange,
  thinkingMode = "provider-default",
  thinkingModeOptions = [
    {
      value: "provider-default",
      label: "Auto",
      description: "Let the provider choose.",
    },
  ],
  onThinkingModeChange,
  onStop,
  isStreaming,
  isEditing = false,
  onCancel,
  editMessage,
  pressEnterToSend = true,
  draft,
  onDraftChange,
  showTokenCount = true,
  tokenTotal,
}: ChatInputProps) {
  const maxComposerHeight = 160;
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isReadingFiles, setIsReadingFiles] = useState(false);
  const currentAttachmentsRef = useRef(attachments);
  currentAttachmentsRef.current = attachments;
  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      setAttachmentError(null);
      setIsReadingFiles(true);
      try {
        const added = await Promise.all(
          Array.from(files).map(createExternalAttachment),
        );
        onAttachmentsChange?.([...currentAttachmentsRef.current, ...added]);
      } catch (error) {
        setAttachmentError(
          error instanceof Error ? error.message : String(error),
        );
      } finally {
        setIsReadingFiles(false);
      }
    },
    [onAttachmentsChange],
  );
  const [showPreview, setShowPreview] = useState(false);

  const [value, setValue] = useState(draft ?? "");
  const hasLatex = /\$\$?[\s\S]*?\$\$?/.test(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isComposingRef = useRef(false);
  const isSendingRef = useRef(false);
  const currentValueRef = useRef(value);
  currentValueRef.current = value;

  const updateValue = useCallback(
    (nextValue: string) => {
      setValue(nextValue);
      onDraftChange?.(nextValue);
    },
    [onDraftChange],
  );

  // An edit replaces the editor contents once. Ordinary draft updates only
  // synchronize when the composer is not editing a previous message.
  useEffect(() => {
    if (editMessage === undefined) return;
    setValue(editMessage);
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [editMessage]);

  useEffect(() => {
    if (editMessage === undefined) setValue(draft ?? "");
  }, [draft, editMessage]);

  const sendMessage = useCallback(async () => {
    const submittedValue = value;
    const trimmed = submittedValue.trim();
    const submittedAttachments = [...attachments];
    if (
      isSendingRef.current ||
      (!trimmed && !submittedAttachments.length) ||
      isStreaming ||
      isReadingFiles
    )
      return;
    isSendingRef.current = true;
    try {
      const accepted = submittedAttachments.length
        ? await onSend(trimmed, submittedAttachments)
        : await onSend(trimmed);
      if (accepted === false) return;
      if (currentValueRef.current === submittedValue) {
        updateValue("");
      }
      if (
        currentAttachmentsRef.current.length === submittedAttachments.length &&
        currentAttachmentsRef.current.every(
          (attachment, index) => attachment === submittedAttachments[index],
        )
      ) {
        onAttachmentsChange?.([]);
      }
    } finally {
      isSendingRef.current = false;
    }
  }, [
    attachments,
    isReadingFiles,
    isStreaming,
    onAttachmentsChange,
    onSend,
    updateValue,
    value,
  ]);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height =
      Math.min(textarea.scrollHeight, maxComposerHeight) + "px";
  }, [value]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (
        isComposingRef.current ||
        event.nativeEvent.isComposing ||
        event.keyCode === 229
      )
        return;
      if (event.key !== "Enter") return;
      const shouldSend = pressEnterToSend
        ? !event.shiftKey
        : !event.shiftKey && (event.metaKey || event.ctrlKey);
      if (shouldSend) {
        event.preventDefault();
        void sendMessage();
      }
    },
    [pressEnterToSend, sendMessage],
  );

  return (
    <div
      className="chat-input-wrapper"
      data-testid="chat-composer"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        if (!isStreaming) void handleFiles(event.dataTransfer.files);
      }}
    >
      {attachmentError && <div role="alert">{attachmentError}</div>}
      {isReadingFiles && <div role="status">Reading attachments…</div>}
      {showPreview && hasLatex && (
        <div className="chat-input-preview">
          <MarkdownRenderer content={value} />
        </div>
      )}
      <div className="chat-input-row">
        {hasLatex && (
          <button
            type="button"
            title="Toggle LaTeX preview"
            aria-pressed={showPreview}
            onClick={() => setShowPreview((previous) => !previous)}
          >
            Preview
          </button>
        )}
        <textarea
          ref={textareaRef}
          className="chat-textarea"
          rows={1}
          aria-label="Message"
          placeholder="Type a message..."
          value={value}
          onChange={(event) => updateValue(event.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => {
            isComposingRef.current = true;
          }}
          onCompositionEnd={() => {
            isComposingRef.current = false;
          }}
          disabled={isStreaming}
        />
        {isStreaming ? (
          <button
            type="button"
            className="chat-btn chat-stop-btn"
            onClick={onStop}
          >
            Stop
          </button>
        ) : (
          <button
            type="button"
            className="chat-btn chat-send-btn"
            disabled={(!value.trim() && !attachments.length) || isReadingFiles}
            onClick={() => void sendMessage()}
          >
            {isEditing ? "Resubmit" : "Send"}
          </button>
        )}
        {isEditing && (
          <button type="button" className="chat-btn" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
      <ChatInputAttachments
        tokenTotal={showTokenCount ? tokenTotal ??
          "Draft ~" +
          (
            estimateTokens(value) +
            attachments.reduce(
              (total, attachment) =>
                total + estimateAttachmentTokens(attachment),
              0,
            )
          ).toLocaleString() +
          " tokens (estimate)" : undefined}
        attachments={attachments}
        onAttachmentsChange={onAttachmentsChange}
        onFiles={(files) => void handleFiles(files)}
        thinkingMode={thinkingMode}
        thinkingEnabled={
          thinkingMode !== "provider-default" && thinkingMode !== "none"
        }
        thinkingModeOptions={thinkingModeOptions}
        onThinkingModeChange={(mode) => onThinkingModeChange?.(mode)}
      />
    </div>
  );
}
