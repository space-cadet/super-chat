import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatApp } from '../ChatApp';
import type { ChatEngine } from '../../../core/ChatEngine';
import type { ChatSession } from '../../../core/types';

function createMockEngine() {
  return {
    getActiveSession: vi.fn(),
    getSessions: vi.fn(),
    loadSessions: vi.fn(),
    createSession: vi.fn(),
    switchSession: vi.fn(),
    deleteSession: vi.fn(),
    archiveSession: vi.fn(),
    sendMessage: vi.fn(),
    stopStreaming: vi.fn(),
    isStreaming: false,
  } as unknown as ChatEngine & {
    getActiveSession: ReturnType<typeof vi.fn>;
    getSessions: ReturnType<typeof vi.fn>;
    loadSessions: ReturnType<typeof vi.fn>;
    createSession: ReturnType<typeof vi.fn>;
    switchSession: ReturnType<typeof vi.fn>;
    deleteSession: ReturnType<typeof vi.fn>;
    archiveSession: ReturnType<typeof vi.fn>;
    sendMessage: ReturnType<typeof vi.fn>;
    stopStreaming: ReturnType<typeof vi.fn>;
  };
}

describe('ChatApp', () => {
  let mockEngine: ReturnType<typeof createMockEngine>;

  beforeEach(() => {
    mockEngine = createMockEngine();
    mockEngine.getActiveSession.mockReturnValue(null);
    mockEngine.getSessions.mockReturnValue([]);
    mockEngine.loadSessions.mockResolvedValue([]);
  });

  it('renders empty state when no messages', () => {
    render(<ChatApp engine={mockEngine} />);
    expect(screen.getByText('Start a new conversation')).toBeInTheDocument();
  });

  it('renders header with current session title', () => {
    const session: ChatSession = {
      id: 'sess-1',
      title: 'Test Session',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    mockEngine.getActiveSession.mockReturnValue(session);
    render(<ChatApp engine={mockEngine} />);
    expect(screen.getByText('Test Session')).toBeInTheDocument();
  });

  it('calls onNewChat when new chat button clicked', () => {
    const newSession: ChatSession = {
      id: 'sess-new',
      title: 'Untitled Chat',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    mockEngine.createSession.mockReturnValue(newSession);
    const onNewChat = vi.fn();
    render(<ChatApp engine={mockEngine} onNewChat={onNewChat} />);

    fireEvent.click(screen.getByText('+ New Chat'));
    expect(mockEngine.createSession).toHaveBeenCalled();
    expect(onNewChat).toHaveBeenCalled();
  });

  it('renders messages from current session', () => {
    const session: ChatSession = {
      id: 'sess-1',
      title: 'Test',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [
        { id: 'msg-1', role: 'user', content: 'Hello', timestamp: Date.now() },
        { id: 'msg-2', role: 'assistant', content: 'Hi there!', timestamp: Date.now() },
      ],
    };
    mockEngine.getActiveSession.mockReturnValue(session);
    render(<ChatApp engine={mockEngine} />);

    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
  });

  it('opens sidebar when menu button clicked', async () => {
    render(<ChatApp engine={mockEngine} />);
    const menuButton = screen.getByTitle('Open sidebar');
    fireEvent.click(menuButton);

    await waitFor(() => {
      expect(screen.getByText('Chat History')).toBeInTheDocument();
    });
  });

  it('accepts initialSessionId prop', () => {
    render(<ChatApp engine={mockEngine} initialSessionId="sess-abc" />);
    // Should render without error; hook handles the initial session
    expect(screen.getByText('Start a new conversation')).toBeInTheDocument();
  });
});
