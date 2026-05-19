# super-chat

A standalone, reusable chat component library with LLM-native tool calling, multi-agent orchestration, and a robust approval flow.

## Features

- **LLM-native tool calling** — Model sees tool schemas and decides when to call them
- **Approval-first safety** — Tools execute only after user approval (unless auto-approve)
- **Multi-agent orchestration** — Multiple agents in one conversation, mention-based routing (`@AgentName`)
- **SDK insulation** — StreamEvent union protects from Vercel AI SDK changes
- **Pluggable adapters** — Swap LLM providers, persistence layers, RAG systems
- **Framework-agnostic core** — Pure TypeScript, optional React layer
- **Dual-format builds** — ESM + CJS with TypeScript declarations

## Installation

```bash
npm install super-chat
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

### React

```tsx
import { ChatEngine, VercelLLMAdapter, createProviderProfile } from 'super-chat';
import { useChat } from 'super-chat/react';

function ChatComponent() {
  const engine = useMemo(() => {
    const profile = createProviderProfile('openai', 'gpt-4o', apiKey);
    return new ChatEngine({ llmAdapter: new VercelLLMAdapter({ profile }) });
  }, []);

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
│   ├── core/          # Framework-agnostic engine
│   │   ├── ChatEngine.ts      # High-level API
│   │   ├── AgentLoop.ts       # Multi-step tool calling
│   │   ├── ToolExecutor.ts    # Tool execution framework
│   │   └── types.ts           # Type definitions
│   ├── adapters/      # Reference implementations
│   │   ├── VercelLLMAdapter.ts
│   │   ├── DemoToolAdapter.ts
│   │   ├── LocalStoragePersistence.ts
│   │   └── MemoryPersistence.ts
│   └── react/         # React hooks
│       ├── hooks/useChat.ts
│       └── hooks/useAgent.ts
├── demo/              # Runnable demo app
└── memory-bank/       # Project documentation
```

## Adapters

### LLM Adapters
- **VercelLLMAdapter** — Vercel AI SDK v6 with 9 providers (OpenAI, Anthropic, Google, Azure, DeepSeek, OpenRouter, Ollama, Kimi, Custom)

### Tool Adapters
- **DemoToolAdapter** — Mock tools for testing (calculate, search_web, get_weather, fetch_arxiv)

### Persistence Adapters
- **LocalStoragePersistenceAdapter** — Browser localStorage with quota handling
- **MemoryPersistenceAdapter** — In-memory for testing

## Development

```bash
# Install dependencies
pnpm install

# Run type check
pnpm typecheck

# Build library
pnpm build

# Run demo app
pnpm dev
```

## License

MIT
