import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ToolResultCard } from '../ToolResultCard';
import type { ToolCall, ToolResult } from '../../../core/types';

describe('ToolResultCard', () => {
  const toolCall: ToolCall = {
    id: 'tool-1',
    name: 'calculator',
    args: { expression: '1+1' },
  };

  it('renders success state', () => {
    const result: ToolResult = { success: true, content: '2' };
    render(<ToolResultCard toolCall={toolCall} toolResult={result} />);
    expect(screen.getByText('calculator')).toBeInTheDocument();
    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  it('renders error state', () => {
    const result: ToolResult = { success: false, error: 'Division by zero' };
    render(<ToolResultCard toolCall={toolCall} toolResult={result} />);
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('defaults to success when success is undefined', () => {
    const result: ToolResult = { content: 'Result' };
    render(<ToolResultCard toolCall={toolCall} toolResult={result} />);
    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  it('expands to show arguments and result', () => {
    const result: ToolResult = { success: true, content: '2' };
    render(<ToolResultCard toolCall={toolCall} toolResult={result} />);

    const header = screen.getByText('calculator').closest('button');
    fireEvent.click(header!);

    expect(screen.getByText('Arguments')).toBeInTheDocument();
    expect(screen.getByText('Result')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows error message when result has error', () => {
    const result: ToolResult = { success: false, error: 'Something went wrong' };
    render(<ToolResultCard toolCall={toolCall} toolResult={result} />);

    const header = screen.getByText('calculator').closest('button');
    fireEvent.click(header!);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('shows path when result has path', () => {
    const result: ToolResult = { success: true, path: '/tmp/output.txt' };
    render(<ToolResultCard toolCall={toolCall} toolResult={result} />);

    const header = screen.getByText('calculator').closest('button');
    fireEvent.click(header!);

    expect(screen.getByText(/output.txt/)).toBeInTheDocument();
  });

  it('shows no output fallback', () => {
    const result: ToolResult = {};
    render(<ToolResultCard toolCall={toolCall} toolResult={result} />);

    const header = screen.getByText('calculator').closest('button');
    fireEvent.click(header!);

    expect(screen.getByText('No output')).toBeInTheDocument();
  });
});
