import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MessageBubble } from '../MessageBubble';
import type { ChatMessage } from '../../../core/types';

describe('MessageBubble', () => {
  const userMessage: ChatMessage = {
    id: 'msg-1',
    role: 'user',
    content: 'Hello world',
    timestamp: Date.now(),
  };

  const assistantMessage: ChatMessage = {
    id: 'msg-2',
    role: 'assistant',
    content: 'Hello! How can I help?',
    timestamp: Date.now(),
  };

  it('renders user message with correct styling', () => {
    render(<MessageBubble message={userMessage} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
    // User messages should be right-aligned container
    const bubble = screen.getByText('Hello world').closest('div[class*="rounded-2xl"]');
    expect(bubble).toHaveClass('bg-blue-600');
  });

  it('renders assistant message with correct styling', () => {
    render(<MessageBubble message={assistantMessage} />);
    expect(screen.getByText('Hello! How can I help?')).toBeInTheDocument();
    const bubble = screen.getByText('Hello! How can I help?').closest('div[class*="rounded-2xl"]');
    expect(bubble).toHaveClass('bg-white');
  });

  it('shows copy button for assistant messages', () => {
    render(<MessageBubble message={assistantMessage} />);
    expect(screen.getByTitle('Copy')).toBeInTheDocument();
  });

  it('does not show copy button for user messages', () => {
    render(<MessageBubble message={userMessage} />);
    expect(screen.queryByTitle('Copy')).not.toBeInTheDocument();
  });

  it('calls onEdit when edit is saved', async () => {
    const onEdit = vi.fn();
    render(<MessageBubble message={userMessage} onEdit={onEdit} />);

    fireEvent.click(screen.getByTitle('Edit'));
    const textarea = screen.getByDisplayValue('Hello world');
    fireEvent.change(textarea, { target: { value: 'Edited message' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(onEdit).toHaveBeenCalledWith('msg-1', 'Edited message');
    });
  });

  it('calls onRetry when retry clicked', () => {
    const onRetry = vi.fn();
    render(<MessageBubble message={userMessage} onRetry={onRetry} />);

    fireEvent.click(screen.getByTitle('Retry'));
    expect(onRetry).toHaveBeenCalledWith('msg-1');
  });

  it('shows citations as links when present', () => {
    const messageWithCitations: ChatMessage = {
      ...assistantMessage,
      citations: [
        {
          id: 'paper-1',
          title: 'Quantum Computing Basics',
          authors: ['Alice', 'Bob'],
          year: 2024,
          url: 'https://example.com/paper',
          snippet: 'A paper about quantum computing',
        },
      ],
    };
    render(<MessageBubble message={messageWithCitations} />);
    expect(screen.getByText(/Quantum Computing Basics/)).toBeInTheDocument();
  });

  it('shows pending tool cards when toolCalls exist without results', () => {
    const messageWithTool: ChatMessage = {
      ...assistantMessage,
      toolCalls: [{ id: 'tool-1', name: 'calculator', args: { expression: '1+1' } }],
    };
    const onApprove = vi.fn();
    const onReject = vi.fn();
    render(
      <MessageBubble
        message={messageWithTool}
        onApproveTool={onApprove}
        onRejectTool={onReject}
      />
    );
    expect(screen.getByText('calculator')).toBeInTheDocument();
  });

  it('shows tool result cards when toolResults exist', () => {
    const messageWithToolResult: ChatMessage = {
      ...assistantMessage,
      toolCalls: [{ id: 'tool-1', name: 'calculator', args: { expression: '1+1' } }],
      toolResults: [{ success: true, content: '2' }],
    };
    render(<MessageBubble message={messageWithToolResult} />);
    expect(screen.getByText('calculator')).toBeInTheDocument();
    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  it('shows token count when present', () => {
    const messageWithTokens: ChatMessage = {
      ...assistantMessage,
      tokenCount: 42,
    };
    render(<MessageBubble message={messageWithTokens} />);
    expect(screen.getByText('42 tokens')).toBeInTheDocument();
  });
});
