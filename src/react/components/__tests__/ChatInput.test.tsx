import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ChatInput } from '../ChatInput';

describe('ChatInput', () => {
  it('renders textarea and send button', () => {
    render(<ChatInput onSend={vi.fn()} onStop={vi.fn()} isStreaming={false} />);
    expect(screen.getByPlaceholderText(/Type a message/)).toBeInTheDocument();
    expect(screen.getByText('Send')).toBeInTheDocument();
  });

  it('shows stop button when streaming', () => {
    render(<ChatInput onSend={vi.fn()} onStop={vi.fn()} isStreaming={true} />);
    expect(screen.getByText('Stop')).toBeInTheDocument();
    expect(screen.queryByText('Send')).not.toBeInTheDocument();
  });

  it('calls onSend with trimmed text when send clicked', () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} onStop={vi.fn()} isStreaming={false} />);

    const textarea = screen.getByPlaceholderText(/Type a message/);
    fireEvent.change(textarea, { target: { value: '  Hello world  ' } });
    fireEvent.click(screen.getByText('Send'));

    expect(onSend).toHaveBeenCalledWith('Hello world');
  });

  it('calls onStop when stop clicked', () => {
    const onStop = vi.fn();
    render(<ChatInput onSend={vi.fn()} onStop={onStop} isStreaming={true} />);

    fireEvent.click(screen.getByText('Stop'));
    expect(onStop).toHaveBeenCalled();
  });

  it('does not send empty messages', () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} onStop={vi.fn()} isStreaming={false} />);

    fireEvent.click(screen.getByText('Send'));
    expect(onSend).not.toHaveBeenCalled();
  });

  it('submits on Enter key', () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} onStop={vi.fn()} isStreaming={false} />);

    const textarea = screen.getByPlaceholderText(/Type a message/);
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    expect(onSend).toHaveBeenCalledWith('Test message');
  });

  it('does not submit on Shift+Enter', () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} onStop={vi.fn()} isStreaming={false} />);

    const textarea = screen.getByPlaceholderText(/Type a message/);
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

    expect(onSend).not.toHaveBeenCalled();
  });

  it('shows LaTeX preview toggle when LaTeX detected', () => {
    render(<ChatInput onSend={vi.fn()} onStop={vi.fn()} isStreaming={false} />);

    const textarea = screen.getByPlaceholderText(/Type a message/);
    fireEvent.change(textarea, { target: { value: '$E=mc^2$' } });

    expect(screen.getByTitle('Toggle LaTeX preview')).toBeInTheDocument();
  });

  it('shows mention autocomplete when @ is typed', () => {
    render(<ChatInput onSend={vi.fn()} onStop={vi.fn()} isStreaming={false} />);

    const textarea = screen.getByPlaceholderText(/Type a message/);
    fireEvent.change(textarea, { target: { value: '@' } });

    expect(screen.getByText(/Type to search mentions/)).toBeInTheDocument();
  });

  it('disables send button when input is empty', () => {
    render(<ChatInput onSend={vi.fn()} onStop={vi.fn()} isStreaming={false} />);
    const sendButton = screen.getByText('Send');
    expect(sendButton).toBeDisabled();
  });
});
