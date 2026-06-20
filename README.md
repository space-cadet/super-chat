# super-chat

A standalone, reusable chat component library with LLM-native tool calling, multi-agent orchestration, and a robust approval flow.

## Features

- **LLM-native tool calling** — Models see tool schemas and decide when to call them
- **Real-time streaming** — Word-by-word streaming even during multi-step tool execution
- **Approval-first safety** — Tools execute only after user approval (unless auto-approve enabled)
- **Multi-agent orchestration** — Multiple agents in one conversation, mention-based routing (`@AgentName`)
- **SDK insulation** — `StreamEvent` union protects from Vercel AI SDK changes
- **Pluggable adapters** — Swap LLM providers, persistence layers, RAG systems
- **Framework-agnostic core** — Pure TypeScript, optional React layer
- **Dual-format builds** — ESM + CJS with TypeScript declarations

## Installation

```bash
npm install super-chat
# or
pnpm add super-chat
# or
yarn add super-chat
```

### Peer Dependencies (optional, for React components)

```bash
npm install react react-dom
```

## Quick Start

### Core (Framework-Agnostic)

```typescript
import { ChatEngine, VercelLLMAdapter, createProviderProfile } from 'super-chat';

const profile = createProviderProfile('openai', 'gpt-4o', process.env.OPENAI_API_KEY);
const engine = new ChatEngine({
  llmAdapter: new VercelLLMAdapter({ profile }),
});

// Create a session
const session = engine.createSession('My Chat');

// Send a message
for await (const event of engine.sendMessage('What is 2+2?')) {
  if (event.type === 'text-delta') {
    process.stdout.write(event.text);
  }
  if (event.type === 'tool-call') {
    console.log(`Tool called: ${event.call.name}`);
  }
  if (event.type === 'tool-result') {
    console.log(`Result: ${event.result.content}`);
  }
}
```

### With Tools

```typescript
import { ChatEngine, VercelLLMAdapter, DemoToolAdapter, createProviderProfile } from 'super-chat';

const profile = createProviderProfile('openai', 'gpt-4o', apiKey);
const engine = new ChatEngine({
  llmAdapter: new VercelLLMAdapter({ profile }),
  toolAdapter: new DemoToolAdapter(), // calculate, search_web, get_weather, fetch_arxiv
});

const session = engine.createSession('Tool Demo');

for await (const event of engine.sendMessage('What is 12345 * 67890?', session)) {
  if (event.type === 'text-delta') process.stdout.write(event.text);
  if (event.type === 'tool-call') console.log('\n🔧 Tool:', event.call.name, event.call.args);
  if (event.type === 'tool-result') console.log('✅ Result:', event.result.content);
}
```

### React

```tsx
import { ChatEngine, VercelLLMAdapter, createProviderProfile } from 'super-chat';
import { ChatApp } from 'super-chat/react';
import 'super-chat/react/styles.css';

function App() {
  const engine = useMemo(() => {
    const profile = createProviderProfile('openrouter', 'google/gemma-4-26b-a4b-it', apiKey);
    return new ChatEngine({
      llmAdapter: new VercelLLMAdapter({ profile }),
      toolAdapter: new DemoToolAdapter(),
    });
  }, []);

  return <ChatApp engine={engine} />;
}
```

### React with `useChat` Hook

```tsx
import { useChat } from 'super-chat/react';

function ChatComponent() {
  const { messages, sendMessage, isStreaming, createSession } = useChat(engine);

  return (
    <div>
      {messages.map(m => (
        <div key={m.id} className={m.role}>
          {m.content}
        </div>
      ))}
      <button onClick={() => sendMessage('Hello!')} disabled={isStreaming}>
        Send
      </button>
    </div>
  );
}
```

## Architecture

```
super-chat/
├── src/
│   ├── core/               # Framework-agnostic engine
│   │   ├── ChatEngine.ts      # High-level API
│   │   ├── AgentLoop.ts       # Multi-step tool calling (AsyncGenerator)
│   │   ├── ToolExecutor.ts    # Tool execution framework
│   │   └── types.ts           # Type definitions
│   ├── adapters/           # Reference implementations
│   │   ├── VercelLLMAdapter.ts    # Vercel AI SDK v6 wrapper
│   │   ├── DemoToolAdapter.ts     # Mock tools for testing
│   │   ├── LocalStoragePersistence.ts
│   │   └── MemoryPersistence.ts
│   └── react/              # React layer
│       ├── hooks/
│       │   ├── useChat.ts      # Chat state management
│       │   └── useAgent.ts     # Agent state management
│       └── components/
│           ├── ChatApp.tsx          # Full chat application
│           ├── MessageBubble.tsx    # Message display
│           ├── ChatInput.tsx        # Input with @mention
│           ├── PendingToolCard.tsx  # Approval UI
│           ├── SessionSidebar.tsx   # Session management
│           └── ToolResultCard.tsx   # Tool result display
├── demo/                   # Runnable demo app
└── memory-bank/            # Project documentation
```

## Adapters

### LLM Adapters

| Adapter | Providers | Streaming | Tools |
|---------|-----------|-----------|-------|
| `VercelLLMAdapter` | OpenAI, Anthropic, Google, Azure, DeepSeek, OpenRouter, Ollama, Kimi, Custom | ✅ Native | ✅ Native |

```typescript
// Create a provider profile
const profile = createProviderProfile('openai', 'gpt-4o', apiKey);

// Or with OpenRouter
const profile = createProviderProfile('openrouter', 'anthropic/claude-sonnet-4-20250514', apiKey);

// Or with Ollama (local)
const profile = createProviderProfile('ollama', 'llama3', '');
```

### Tool Adapters

| Adapter | Tools |
|---------|-------|
| `DemoToolAdapter` | `calculate`, `search_web`, `get_weather`, `fetch_arxiv` |

Build your own:

```typescript
class MyToolAdapter implements ToolAdapter {
  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'my_tool',
        description: 'Does something useful',
        parameters: z.object({ input: z.string() }),
      },
    ];
  }

  async executeTool(toolCall: ToolCall): Promise<ToolResult> {
    // Execute and return result
    return { content: 'result', type: 'text' };
  }
}
```

### Persistence Adapters

| Adapter | Storage |
|---------|---------|
| `LocalStoragePersistenceAdapter` | Browser localStorage |
| `MemoryPersistenceAdapter` | In-memory (testing) |

### RAG Adapters

| Adapter | Retrieval |
|---------|-----------|
| `ArxiviteRAGAdapter` | PDF chunks via PocketFlow pipeline |
| `ObsidianRAGAdapter` | Vault notes via context system |

## Multi-Agent Orchestration

```typescript
import { Orchestrator } from 'super-chat';

const orchestrator = new Orchestrator(engine, {
  agents: [
    { id: 'coder', name: 'Code Expert', model: 'gpt-4o', systemPrompt: 'You are a coding expert...' },
    { id: 'researcher', name: 'Researcher', model: 'claude-sonnet', systemPrompt: 'You are a researcher...' },
  ],
});

// Route by mention
const response = await orchestrator.route('@coder How do I use async generators?');

// Or dispatch to all agents
const responses = await orchestrator.dispatchAll('Explain quantum entanglement');
```

## Stream Events

The `StreamEvent` union provides a clean, SDK-insulated event stream:

```typescript
type StreamEvent =
  | { type: 'text-delta'; text: string }           // Streaming text chunk
  | { type: 'tool-call'; call: ToolCall }          // Tool invocation
  | { type: 'tool-result'; call: ToolCall; result: ToolResult }  // Tool result
  | { type: 'error'; error: Error }                // Error occurred
  | { type: 'finish'; reason: string };            // Stream complete
```

## Tool Approval Flow

```typescript
// User must approve each tool call
const engine = new ChatEngine({
  llmAdapter: new VercelLLMAdapter({ profile }),
  toolAdapter: new MyToolAdapter(),
});

// In your UI:
// 1. Render PendingToolCard when event.type === 'tool-call'
// 2. User clicks Approve or Reject
// 3. Engine resumes with the decision

// Or auto-approve specific tools
engine.setAutoApprove(['calculate', 'search_web']);
```

## Development

```bash
# Clone and install
git clone https://github.com/space-cadet/super-chat.git
cd super-chat
pnpm install

# Development commands
pnpm typecheck     # TypeScript check
pnpm test          # Run tests in watch mode
pnpm test:run      # Run tests once
pnpm build         # Build library
pnpm demo          # Run demo app
pnpm test:real     # Real-world API test (needs OPENROUTER_API_KEY)
```

### Project Structure

| Directory | Purpose |
|-----------|---------|
| `src/core/` | Framework-agnostic engine (ChatEngine, AgentLoop, ToolExecutor) |
| `src/adapters/` | Reference adapter implementations |
| `src/react/hooks/` | React hooks (useChat, useAgent) |
| `src/react/components/` | React UI components |
| `demo/` | Runnable demo application |
| `scripts/` | CLI test tools |

## Testing

```bash
# Unit tests (81 tests)
pnpm test:run

# Real-world tests (requires OPENROUTER_API_KEY)
OPENROUTER_API_KEY=your_key pnpm test:real

# Test coverage
pnpm vitest run --coverage
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

MIT © [Deepak Vaid](https://github.com/space-cadet)

## Contributing

Contributions welcome! Please read the [memory-bank](memory-bank/) for project context and architecture decisions.

## Related Projects

- [obsidian-ai](https://github.com/space-cadet/obsidian-ai) — Obsidian plugin using super-chat
- [arxivite](https://github.com/space-cadet/arxivite) — arXiv paper explorer using super-chat
- [chimera-chat](https://github.com/space-cadet/chimera-chat) — React chat component (source of UI layer)
