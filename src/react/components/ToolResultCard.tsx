import { useState } from 'react';
import type { ToolCall, ToolResult } from '../../core/types';

interface ToolResultCardProps {
  toolCall: ToolCall;
  toolResult: ToolResult;
}

export function ToolResultCard({ toolCall, toolResult }: ToolResultCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isSuccess = toolResult.success !== false;

  return (
    <div className={`rounded-lg border overflow-hidden text-sm ${
      isSuccess ? 'border-green-200 bg-green-50/30' : 'border-red-200 bg-red-50/30'
    }`}>
      {/* Compact header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full px-3 py-2 flex items-center gap-2 hover:bg-opacity-50 transition-colors text-left ${
          isSuccess ? 'hover:bg-green-50/80' : 'hover:bg-red-50/80'
        }`}
      >
        <svg className={`w-4 h-4 flex-shrink-0 ${isSuccess ? 'text-green-600' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isSuccess ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          )}
        </svg>
        <span className="font-medium text-gray-700 truncate">{toolCall.name}</span>
        <span className="ml-auto flex items-center gap-1 text-gray-400">
          <span className={`text-xs px-1.5 py-0.5 rounded ${
            isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {isSuccess ? 'Success' : 'Error'}
          </span>
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
        <div className={`border-t ${isSuccess ? 'border-green-100' : 'border-red-100'}`}>
          {/* Arguments */}
          <div className="px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">Arguments</p>
            <pre className="text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap bg-white/50 rounded p-2">
              {JSON.stringify(toolCall.args, null, 2)}
            </pre>
          </div>

          {/* Result */}
          <div className="px-3 py-2 border-t border-gray-100">
            <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">Result</p>
            {toolResult.error ? (
              <p className="text-red-600 text-xs">{toolResult.error}</p>
            ) : toolResult.content ? (
              <pre className="text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap bg-white/50 rounded p-2">
                {toolResult.content}
              </pre>
            ) : toolResult.path ? (
              <p className="text-gray-600 text-xs">📄 {toolResult.path}</p>
            ) : (
              <p className="text-gray-400 italic text-xs">No output</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
