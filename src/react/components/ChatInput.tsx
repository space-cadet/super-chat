import { useState, useRef, useCallback, useEffect } from 'react';

interface ChatInputProps {
  onSend: (text: string) => void;
  onStop: () => void;
  isStreaming: boolean;
}

export function ChatInput({ onSend, onStop, isStreaming }: ChatInputProps) {
  const [content, setContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Detect @mention trigger
  useEffect(() => {
    const lastAt = content.lastIndexOf('@');
    if (lastAt !== -1) {
      const afterAt = content.slice(lastAt + 1);
      const hasSpace = afterAt.includes(' ');
      if (!hasSpace && afterAt.length > 0) {
        setMentionQuery(afterAt);
      } else if (!hasSpace && afterAt.length === 0) {
        setMentionQuery('');
      } else {
        setMentionQuery(null);
      }
    } else {
      setMentionQuery(null);
    }
  }, [content]);

  const handleSubmit = useCallback(() => {
    if (!content.trim()) return;
    onSend(content.trim());
    setContent('');
    setShowPreview(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [content, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (mentionQuery !== null) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setMentionQuery(null);
          return;
        }
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit, mentionQuery]
  );

  const handleInput = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    }
  }, []);

  const hasLatex = /\$\$?[\s\S]*?\$\$?/.test(content);

  return (
    <div className="border-t bg-white p-4">
      {/* LaTeX Preview */}
      {showPreview && hasLatex && (
        <div className="max-w-4xl mx-auto mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500 mb-1">Preview:</p>
          <div className="text-sm">{content}</div>
        </div>
      )}

      {/* Mention autocomplete popover */}
      {mentionQuery !== null && (
        <div className="max-w-4xl mx-auto mb-2">
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2 text-sm">
            <p className="text-gray-500 px-2 py-1">Type to search mentions... (stub)</p>
          </div>
        </div>
      )}

      <div className="flex items-end gap-2 max-w-4xl mx-auto">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder="Type a message... Use @ for context, $ for LaTeX"
            rows={1}
            className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] max-h-[200px]"
          />
          {/* LaTeX preview toggle */}
          {hasLatex && (
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              title="Toggle LaTeX preview"
            >
              {showPreview ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          )}
        </div>
        {isStreaming ? (
          <button
            onClick={onStop}
            className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Stop
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!content.trim()}
            className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        )}
      </div>
    </div>
  );
}
