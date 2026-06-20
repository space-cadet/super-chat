import { useState, useCallback } from 'react';
import type { ChatMessage } from '../../core/types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ToolResultCard } from './ToolResultCard';
import { PendingToolCard } from './PendingToolCard';

interface MessageBubbleProps {
  message: ChatMessage;
  onEdit?: (messageId: string, newContent: string) => Promise<void>;
  onRetry?: (messageId: string) => Promise<void>;
  onApproveTool?: (callId: string) => void;
  onRejectTool?: (callId: string) => void;
}

export function MessageBubble({ message, onEdit, onRetry, onApproveTool, onRejectTool }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 800);
    } catch {
      // Fallback: ignore
    }
  }, [message.content]);

  const handleEditSave = useCallback(async () => {
    if (onEdit && editContent.trim() && editContent !== message.content) {
      await onEdit(message.id, editContent);
    }
    setIsEditing(false);
  }, [onEdit, message.id, editContent, message.content]);

  const handleEditCancel = useCallback(() => {
    setEditContent(message.content);
    setIsEditing(false);
  }, [message.content]);

  const handleMenuToggle = useCallback(() => {
    setMenuOpen(!menuOpen);
  }, [menuOpen]);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} group`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 relative ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-white border border-gray-200 text-gray-900'
        }`}
      >
        {/* Edit mode */}
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full bg-white/10 rounded-lg p-2 text-sm min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleEditSave}
                className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
              >
                Save
              </button>
              <button
                onClick={handleEditCancel}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm pr-2">
            <MarkdownRenderer content={message.content} />
          </div>
        )}

        {/* Citations — simplified: show paper titles as links */}
        {message.citations && message.citations.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-200/50">
            <p className="text-xs font-medium text-gray-500 mb-1.5">References:</p>
            <div className="flex flex-wrap gap-1.5">
              {message.citations.map((paper, i) => (
                <a
                  key={paper.id}
                  href={paper.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors text-blue-600 font-medium"
                >
                  [{i + 1}] {paper.title.slice(0, 35)}{paper.title.length > 35 ? '...' : ''}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Pending tool calls (no results yet) */}
        {message.toolCalls && message.toolCalls.length > 0 && (!message.toolResults || message.toolResults.length === 0) && onApproveTool && onRejectTool && (
          <div className="mt-2 space-y-2">
            {message.toolCalls.map((call) => (
              <PendingToolCard
                key={call.id}
                toolCall={call}
                onApprove={onApproveTool}
                onReject={onRejectTool}
              />
            ))}
          </div>
        )}

        {/* Tool results */}
        {message.toolResults && message.toolResults.length > 0 && message.toolCalls && (
          <div className="mt-2 space-y-2">
            {message.toolCalls.map((call, i) => {
              const result = message.toolResults?.[i];
              return result ? (
                <ToolResultCard key={call.id} toolCall={call} toolResult={result} />
              ) : null;
            })}
          </div>
        )}

        {/* Metadata row */}
        <div className={`flex items-center gap-2 mt-2 ${isUser ? 'text-blue-200' : 'text-gray-400'}`}>
          <span className="text-xs">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
          {message.tokenCount !== undefined && (
            <span className="text-xs">{message.tokenCount} tokens</span>
          )}
        </div>

        {/* Icon button bar — bottom of message */}
        {!isEditing && (
          <div className={`flex items-center gap-1 mt-2 pt-2 border-t ${
            isUser ? 'border-blue-500/30' : 'border-gray-100'
          }`}>
            {/* Copy — assistant only */}
            {!isUser && (
              <button
                onClick={handleCopy}
                className={`p-1.5 rounded-md transition-colors ${
                  isUser 
                    ? 'hover:bg-white/20 text-blue-100' 
                    : 'hover:bg-gray-100 text-gray-500'
                }`}
                title={copied ? 'Copied!' : 'Copy'}
              >
                {copied ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            )}

            {/* Thumbs up — assistant only */}
            {!isUser && (
              <button
                className={`p-1.5 rounded-md transition-colors ${
                  isUser 
                    ? 'hover:bg-white/20 text-blue-100' 
                    : 'hover:bg-gray-100 text-gray-500'
                }`}
                title="Good response"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
              </button>
            )}

            {/* Thumbs down — assistant only */}
            {!isUser && (
              <button
                className={`p-1.5 rounded-md transition-colors ${
                  isUser 
                    ? 'hover:bg-white/20 text-blue-100' 
                    : 'hover:bg-gray-100 text-gray-500'
                }`}
                title="Bad response"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2.5a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                </svg>
              </button>
            )}

            {/* Speaker / TTS — assistant only */}
            {!isUser && (
              <button
                className={`p-1.5 rounded-md transition-colors ${
                  isUser 
                    ? 'hover:bg-white/20 text-blue-100' 
                    : 'hover:bg-gray-100 text-gray-500'
                }`}
                title="Read aloud"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              </button>
            )}

            {/* Share — both */}
            <button
              className={`p-1.5 rounded-md transition-colors ${
                isUser 
                  ? 'hover:bg-white/20 text-blue-100' 
                  : 'hover:bg-gray-100 text-gray-500'
              }`}
              title="Share"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>

            {/* Edit — user only */}
            {isUser && onEdit && (
              <button
                onClick={() => setIsEditing(true)}
                className={`p-1.5 rounded-md transition-colors ${
                  isUser 
                    ? 'hover:bg-white/20 text-blue-100' 
                    : 'hover:bg-gray-100 text-gray-500'
                }`}
                title="Edit"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}

            {/* Retry — both */}
            {onRetry && (
              <button
                onClick={() => onRetry(message.id)}
                className={`p-1.5 rounded-md transition-colors ${
                  isUser 
                    ? 'hover:bg-white/20 text-blue-100' 
                    : 'hover:bg-gray-100 text-gray-500'
                }`}
                title="Retry"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* More options (⋯) — overflow menu */}
            <div className="relative">
              <button
                onClick={handleMenuToggle}
                className={`p-1.5 rounded-md transition-colors ${
                  isUser 
                    ? 'hover:bg-white/20 text-blue-100' 
                    : 'hover:bg-gray-100 text-gray-500'
                }`}
                title="More options"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>

              {/* Overflow menu */}
              {menuOpen && (
                <div className={`absolute bottom-full right-0 mb-1 w-56 rounded-lg shadow-lg border py-1 z-10 ${
                  isUser 
                    ? 'bg-blue-700 border-blue-600 text-white' 
                    : 'bg-white border-gray-200 text-gray-700'
                }`}>
                  {/* Branch in new chat */}
                  <button
                    className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                      isUser 
                        ? 'hover:bg-blue-600' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => { setMenuOpen(false); }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    Branch in new chat
                  </button>

                  {/* Retry (also in overflow) */}
                  {onRetry && (
                    <button
                      className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                        isUser 
                          ? 'hover:bg-blue-600' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => { setMenuOpen(false); onRetry(message.id); }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Retry
                    </button>
                  )}

                  {/* Search the web */}
                  <button
                    className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                      isUser 
                        ? 'hover:bg-blue-600' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => { setMenuOpen(false); }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    Search the web
                  </button>

                  {/* Sources (if citations) */}
                  {message.citations && message.citations.length > 0 && (
                    <button
                      className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                        isUser 
                          ? 'hover:bg-blue-600' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => { setMenuOpen(false); }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      Sources
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
