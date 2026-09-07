import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SessionTabs } from '../SessionTabs';
import type { ChatSession } from '../../../core/types';

describe('SessionTabs', () => {
  const sessions: ChatSession[] = [
    { id: 'one', title: 'Research', createdAt: 1, updatedAt: 2, messages: [] },
    { id: 'two', title: 'Draft', createdAt: 1, updatedAt: 3, messages: [{ id: 'm', role: 'user', content: 'Hi', timestamp: 1 }] },
  ];

  it('renders open sessions in tab order', () => {
    render(
      <SessionTabs
        sessions={sessions}
        openSessionIds={['two', 'one']}
        activeSessionId="two"
        onSelectSession={vi.fn()}
        onCloseSession={vi.fn()}
      />,
    );

    expect(screen.getByRole('tablist', { name: 'Open conversations' })).toBeInTheDocument();
    expect(screen.getByTitle('Draft')).toBeInTheDocument();
    expect(screen.getByTitle('Research')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Draft/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('switches and closes a tab through its controls', () => {
    const onSelectSession = vi.fn();
    const onCloseSession = vi.fn();
    render(
      <SessionTabs
        sessions={sessions}
        openSessionIds={['two', 'one']}
        activeSessionId="two"
        onSelectSession={onSelectSession}
        onCloseSession={onCloseSession}
      />,
    );

    fireEvent.click(screen.getByTitle('Research'));
    fireEvent.click(screen.getByRole('button', { name: 'Close Draft' }));
    expect(onSelectSession).toHaveBeenCalledWith('one');
    expect(onCloseSession).toHaveBeenCalledWith('two');
  });
});
