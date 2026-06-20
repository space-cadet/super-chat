import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SessionSidebar } from '../SessionSidebar';
import type { ChatSession } from '../../../core/types';

describe('SessionSidebar', () => {
  const sessions: ChatSession[] = [
    {
      id: 'sess-1',
      title: 'First Chat',
      createdAt: Date.now() - 10000,
      updatedAt: Date.now() - 5000,
      messages: [{ id: 'm1', role: 'user', content: 'Hi', timestamp: Date.now() }],
      llmProvider: 'openai',
      llmModel: 'gpt-4',
    },
    {
      id: 'sess-2',
      title: 'Second Chat',
      createdAt: Date.now() - 20000,
      updatedAt: Date.now() - 1000,
      messages: [],
      archived: true,
    },
  ];

  it('does not render when isOpen is false', () => {
    render(
      <SessionSidebar
        isOpen={false}
        onClose={vi.fn()}
        sessions={sessions}
        currentSessionId="sess-1"
        onSelectSession={vi.fn()}
      />
    );
    expect(screen.queryByText('Chat History')).not.toBeInTheDocument();
  });

  it('renders when isOpen is true', () => {
    render(
      <SessionSidebar
        isOpen={true}
        onClose={vi.fn()}
        sessions={sessions}
        currentSessionId="sess-1"
        onSelectSession={vi.fn()}
      />
    );
    expect(screen.getByText('Chat History')).toBeInTheDocument();
  });

  it('displays active sessions by default', () => {
    render(
      <SessionSidebar
        isOpen={true}
        onClose={vi.fn()}
        sessions={sessions}
        currentSessionId="sess-1"
        onSelectSession={vi.fn()}
      />
    );
    expect(screen.getByText('First Chat')).toBeInTheDocument();
    expect(screen.queryByText('Second Chat')).not.toBeInTheDocument();
  });

  it('toggles to show archived sessions', () => {
    render(
      <SessionSidebar
        isOpen={true}
        onClose={vi.fn()}
        sessions={sessions}
        currentSessionId="sess-1"
        onSelectSession={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Trash'));
    expect(screen.getByText('Second Chat')).toBeInTheDocument();
    expect(screen.queryByText('First Chat')).not.toBeInTheDocument();
  });

  it('calls onSelectSession when session clicked', () => {
    const onSelectSession = vi.fn();
    render(
      <SessionSidebar
        isOpen={true}
        onClose={vi.fn()}
        sessions={sessions}
        currentSessionId="sess-1"
        onSelectSession={onSelectSession}
      />
    );

    fireEvent.click(screen.getByText('First Chat'));
    expect(onSelectSession).toHaveBeenCalledWith('sess-1');
  });

  it('calls onClose when overlay clicked', () => {
    const onClose = vi.fn();
    render(
      <SessionSidebar
        isOpen={true}
        onClose={onClose}
        sessions={sessions}
        currentSessionId="sess-1"
        onSelectSession={vi.fn()}
      />
    );

    const overlay = screen.getByText('Chat History').closest('.w-80')?.previousElementSibling;
    if (overlay) {
      fireEvent.click(overlay);
      expect(onClose).toHaveBeenCalled();
    }
  });

  it('shows provider indicator when enabled', () => {
    render(
      <SessionSidebar
        isOpen={true}
        onClose={vi.fn()}
        sessions={sessions}
        currentSessionId="sess-1"
        onSelectSession={vi.fn()}
        showProviderIndicator={true}
      />
    );
    expect(screen.getByText(/openai/)).toBeInTheDocument();
  });

  it('hides provider indicator when disabled', () => {
    render(
      <SessionSidebar
        isOpen={true}
        onClose={vi.fn()}
        sessions={sessions}
        currentSessionId="sess-1"
        onSelectSession={vi.fn()}
        showProviderIndicator={false}
      />
    );
    expect(screen.queryByText(/openai/)).not.toBeInTheDocument();
  });

  it('calls onArchiveSession when archive button clicked', () => {
    const onArchiveSession = vi.fn();
    render(
      <SessionSidebar
        isOpen={true}
        onClose={vi.fn()}
        sessions={sessions}
        currentSessionId="sess-1"
        onSelectSession={vi.fn()}
        onArchiveSession={onArchiveSession}
      />
    );

    const archiveButton = screen.getByTitle('Archive');
    fireEvent.click(archiveButton);
    expect(onArchiveSession).toHaveBeenCalledWith('sess-1');
  });

  it('filters sessions by search query', () => {
    render(
      <SessionSidebar
        isOpen={true}
        onClose={vi.fn()}
        sessions={sessions}
        currentSessionId="sess-1"
        onSelectSession={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search sessions...');
    fireEvent.change(searchInput, { target: { value: 'First' } });

    expect(screen.getByText('First Chat')).toBeInTheDocument();
  });
});
