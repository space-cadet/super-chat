import { useState } from 'react';
import type { ToolCall } from '../../core/types';

interface PendingToolCardProps {
  toolCall: ToolCall;
  onApprove: (callId: string) => void;
  onReject: (callId: string) => void;
}

export function PendingToolCard({ toolCall, onApprove, onReject }: PendingToolCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50/30 text-sm overflow-hidden">
      {/* Compact header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center gap-2 hover:bg-yellow-50/80 transition-colors text-left"
      >
        <svg className="w-4 h-4 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="font-medium text-gray-700 truncate">{toolCall.name}</span>
        <span className="ml-auto flex items-center gap-1 text-gray-400">
          <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">Pending</span>
          <svg
            className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </button>

      {/* Expandable content */}
      {expanded && (
        <div className="border-t border-yellow-100">
          {/* Arguments */}
          <div className="px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">Arguments</p>
            <pre className="text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap bg-white/50 rounded p-2">
              {JSON.stringify(toolCall.args, null, 2)}
            </pre>
          </div>

          {/* Actions */}
          <div className="px-3 py-2 flex gap-2 border-t border-yellow-100">
            <button
              onClick={() => onApprove(toolCall.id)}
              className="flex-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded text-xs font-medium transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() => onReject(toolCall.id)}
              className="flex-1 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-xs font-medium transition-colors"
            >
              Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
