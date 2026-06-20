import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PendingToolCard } from '../PendingToolCard';
import type { ToolCall } from '../../../core/types';

describe('PendingToolCard', () => {
  const toolCall: ToolCall = {
    id: 'tool-1',
    name: 'web_search',
    args: { query: 'test' },
  };

  it('renders tool name and pending badge', () => {
    render(<PendingToolCard toolCall={toolCall} onApprove={vi.fn()} onReject={vi.fn()} />);
    expect(screen.getByText('web_search')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('expands to show arguments when clicked', () => {
    render(<PendingToolCard toolCall={toolCall} onApprove={vi.fn()} onReject={vi.fn()} />);

    const header = screen.getByText('web_search').closest('button');
    fireEvent.click(header!);

    expect(screen.getByText('Arguments')).toBeInTheDocument();
    expect(screen.getByText(/"query"/)).toBeInTheDocument();
  });

  it('calls onApprove when approve button clicked', () => {
    const onApprove = vi.fn();
    render(<PendingToolCard toolCall={toolCall} onApprove={onApprove} onReject={vi.fn()} />);

    // Expand first
    const header = screen.getByText('web_search').closest('button');
    fireEvent.click(header!);

    fireEvent.click(screen.getByText('Approve'));
    expect(onApprove).toHaveBeenCalledWith('tool-1');
  });

  it('calls onReject when reject button clicked', () => {
    const onReject = vi.fn();
    render(<PendingToolCard toolCall={toolCall} onApprove={vi.fn()} onReject={onReject} />);

    // Expand first
    const header = screen.getByText('web_search').closest('button');
    fireEvent.click(header!);

    fireEvent.click(screen.getByText('Reject'));
    expect(onReject).toHaveBeenCalledWith('tool-1');
  });

  it('toggles expanded state on repeated clicks', () => {
    render(<PendingToolCard toolCall={toolCall} onApprove={vi.fn()} onReject={vi.fn()} />);

    const header = screen.getByText('web_search').closest('button');
    fireEvent.click(header!);
    expect(screen.getByText('Arguments')).toBeInTheDocument();

    fireEvent.click(header!);
    expect(screen.queryByText('Arguments')).not.toBeInTheDocument();
  });
});
