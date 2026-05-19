# Architecture Design — super-chat

*Created: 2026-05-19 11:15:00 IST*

## Overview

super-chat is a standalone, reusable chat component library that provides LLM-native tool calling, multi-agent orchestration, and a robust approval flow. It extracts the battle-tested patterns from obsidian-ai into a framework-agnostic package.

## Goals

1. **Framework-agnostic core** — Pure TypeScript, no React/Vue/Angular dependencies
2. **LLM-native tool calling** — Model sees tool schemas, decides when to call
3. **Approval-first safety** — Tools execute only after user approval (unless auto-approve)
4. **Multi-agent orchestration** — Multiple agents in one conversation, mention-based routing
5. **SDK insulation** — StreamEvent union protects consumers from Vercel AI SDK changes
6. **Pluggable adapters** — Swap LLM providers, persistence layers, RAG systems

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│  UI Layer (React components — optional, swappable)           │
│  PendingToolCard, ToolResultCard, MessageBubble, ChatApp    │
├─────────────────────────────────────────────────────────────┤
│  Framework Bindings (React hooks, Vue composables, etc.)   │
│  useChat, useSettings, useAgentOrchestrator                 │
├─────────────────────────────────────────────────────────────┤
│  Core Engine (framework-agnostic)                            │
│  ChatEngine, AgentLoop, Orchestrator, ToolExecutor          │
├─────────────────────────────────────────────────────────────┤
│  Adapter Layer (pluggable implementations)                  │
│  LLMAdapter, ToolAdapter, RAGAdapter, PersistenceAdapter    │
├─────────────────────────────────────────────────────────────┤
│  Provider SDKs (Vercel AI SDK, direct API calls, etc.)    │
│  streamText, generateText, fetch                            │
└─────────────────────────────────────────────────────────────┘
```

## Core Design Patterns

### 1. Manual Tool Calling Loop (AgentLoop)

Instead of relying on SDK abstractions like `ToolLoopAgent`, we own the loop:

```
for step in 1..maxSteps:
  result = streamText({ tools, stopWhen: stepCountIs(1) })
  
  for event in result.fullStream:
    if event.type == 'text-delta':
      yield { type: 'text-delta', text: event.text }
    
    if event.type == 'tool-call':
      yield { type: 'tool-call', call: event.call }
      
      # Approval check
      if !autoApply:
        yield { type: 'pending-approval', call: event.call }
        await waitForApproval(event.call.id)
      
      # Execute
      result = await toolExecutor.execute(event.call)
      yield { type: 'tool-result', callId: event.call.id, result }
  
  if no tool calls: break
```

**Why manual?**
- Full control over approval flow
- Can pause between steps for user input
- Can inspect/modify tool results before feeding back
- Insulated from SDK changes

### 2. StreamEvent Union (SDK Insulation)

```typescript
type StreamEvent =
  | { type: 'text-delta'; text: string }
  | { type: 'tool-call'; call: ToolCall }
  | { type: 'tool-result'; callId: string; result: ToolResult }
  | { type: 'tool-error'; callId: string; error: string }
  | { type: 'pending-approval'; call: ToolCall }
  | { type: 'citation'; papers: RetrievedPaper[] }
  | { type: 'rag-status'; status: string; progress?: number }
  | { type: 'step-finish'; step: number }
  | { type: 'finish'; reason: string }
  | { type: 'error'; message: string };
```

**Why?**
- UI only knows StreamEvent, not Vercel SDK types
- Can swap SDKs without touching UI code
- Easy to test (mock events)

### 3. Adapter Pattern

All external dependencies are behind interfaces:

- **LLMAdapter** — wraps any LLM provider (OpenAI, Anthropic, Google, etc.)
- **ToolAdapter** — defines available tools and executes them
- **RAGAdapter** — retrieves and formats context
- **PersistenceAdapter** — saves/loads sessions
- **ContextAdapter** — resolves @mentions to content

**Why?**
- Test with mocks
- Swap implementations without touching core
- Framework-agnostic (same core in browser, Node, Obsidian)

### 4. Approval Queue

```typescript
class ApprovalQueue {
  private pending: Map<string, ToolCall>;
  private resolvers: Map<string, { resolve, reject }>;
  
  add(call: ToolCall): Promise<ToolResult> {
    // Returns a promise that resolves when approved/rejected
  }
  
  approve(callId: string): void {
    // Resolve the pending promise with execution result
  }
  
  reject(callId: string, reason?: string): void {
    // Resolve with error result
  }
}
```

**Why?**
- Decouples "tool requested" from "tool executed"
- UI can show pending state while waiting for user
- Supports both auto-approve and manual modes

### 5. Multi-Agent Orchestrator

```typescript
class Orchestrator {
  private engines: Map<string, AgentEngine>;
  
  dispatch(text: string, thread: ChatMessage[]): AsyncGenerator<AgentResponse> {
    const { targets, cleanText } = this.parseAndRoute(text);
    
    for (const agent of targets) {
      const context = this.buildContext(agent.id, thread, cleanText);
      const response = await agent.adapter.streamChat(context);
      yield { agentId: agent.id, message: response };
    }
  }
}
```

**Why?**
- Sequential by default (agents build on each other)
- Parallel mode for independent queries
- Mention-based routing (@Cloudy)
- Context strategies (full transparency vs isolated)

## Data Flow

### Single-Agent Tool Calling

```
User types: "What's the weather in Mangalore?"
        │
        ▼
ChatEngine.sendMessage()
        │
        ├── Add user message to session
        ├── Build messages for LLM (with tool context)
        └── Call AgentLoop.run()
                │
                ▼
        streamText({ tools, stopWhen: stepCountIs(1) })
                │
                ├── text-delta: "I'll check..."
                ├── tool-call: get_weather({ location: "Mangalore" })
                └── finish
                │
                ▼
        ApprovalQueue.add(toolCall)
                │
                ├── autoApply=true: execute immediately
                └── autoApply=false: yield pending-approval, wait
                │
                ▼
        ToolExecutor.execute(toolCall)
                │
                └── tool-result: "☀️ Sunny, 32°C..."
                │
                ▼
        Rebuild messages with tool result
        Loop back to streamText (step 2)
                │
                └── text-delta: "It's sunny and 32°C..."
                └── finish (no more tools)
                │
                ▼
        Save session
        Yield finish event
```

### Multi-Agent Dispatch

```
User types: "@Cloudy fetch arxiv papers on LQG"
        │
        ▼
MentionParser.parse()
        │
        └── mentions: [{ type: 'agent', name: 'Cloudy' }]
        └── cleanText: "fetch arxiv papers on LQG"
        │
        ▼
Orchestrator.dispatch()
        │
        ├── targets: [CloudyEngine]
        └── (not Gemini, not Ember)
        │
        ▼
For each target:
        ├── Build context (full or isolated)
        ├── Call AgentLoop.run()
        └── Yield AgentResponse
        │
        ▼
UI renders with agent identity badge
```

## File Structure

```
super-chat/
├── src/
│   ├── core/
│   │   ├── types.ts              # All core types and interfaces
│   │   ├── ChatEngine.ts         # Main orchestration class
│   │   ├── ChatEngine.test.ts    # Unit tests
│   │   ├── AgentLoop.ts          # Manual tool calling loop
│   │   ├── AgentLoop.test.ts     # Unit tests
│   │   ├── ToolExecutor.ts       # Tool execution framework
│   │   ├── ApprovalQueue.ts      # Approval management
│   │   ├── Orchestrator.ts       # Multi-agent coordination
│   │   ├── MentionParser.ts      # @mention parsing
│   │   ├── MentionResolver.ts    # Mention resolution
│   │   ├── formatters.ts         # Result formatting utilities
│   │   └── settings.ts           # Settings types and defaults
│   │
│   ├── adapters/
│   │   ├── VercelLLMAdapter.ts   # Vercel AI SDK wrapper (9 providers)
│   │   ├── LocalStoragePersistence.ts
│   │   ├── MemoryPersistence.ts
│   │   └── DemoToolAdapter.ts    # Mock tools for testing
│   │
│   ├── react/
│   │   ├── hooks/
│   │   │   ├── useChat.ts
│   │   │   ├── useSettings.ts
│   │   │   └── useAgentOrchestrator.ts
│   │   └── components/
│   │       ├── ChatApp.tsx
│   │       ├── ChatMessages.tsx
│   │       ├── ChatInput.tsx
│   │       ├── MessageBubble.tsx
│   │       ├── AgentIdentityBadge.tsx
│   │       ├── PendingToolCard.tsx
│   │       ├── ToolResultCard.tsx
│   │       ├── CitationBlock.tsx
│   │       ├── SessionSidebar.tsx
│   │       ├── ActionBar.tsx
│   │       └── SettingsPanel.tsx
│   │
│   └── index.ts                  # Public API exports
│
├── demo/
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.html
│   └── vite.config.ts
│
├── memory-bank/                  # Project documentation
│   ├── tasks.md
│   ├── session_cache.md
│   ├── activeContext.md
│   ├── edit_history.md
│   ├── tasks/
│   ├── sessions/
│   ├── edits/
│   └── implementation-details/
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Package Design

### Exports

```typescript
// Core (framework-agnostic)
export { ChatEngine } from './core/ChatEngine';
export { AgentLoop } from './core/AgentLoop';
export { ToolExecutor } from './core/ToolExecutor';
export { ApprovalQueue } from './core/ApprovalQueue';
export { Orchestrator } from './core/Orchestrator';
export { MentionParser } from './core/MentionParser';
export type * from './core/types';

// Adapters (reference implementations)
export { VercelLLMAdapter } from './adapters/VercelLLMAdapter';
export { LocalStoragePersistenceAdapter } from './adapters/LocalStoragePersistence';
export { MemoryPersistenceAdapter } from './adapters/MemoryPersistence';
export { DemoToolAdapter } from './adapters/DemoToolAdapter';

// React (optional peer dependency)
export { useChat } from './react/hooks/useChat';
export { useSettings } from './react/hooks/useSettings';
export { ChatApp } from './react/components/ChatApp';
// ... other React components
```

### Peer Dependencies

```json
{
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "peerDependenciesMeta": {
    "react": { "optional": true },
    "react-dom": { "optional": true }
  }
}
```

React is optional — core works without it.

## Design Decisions

1. **Manual loop over SDK abstractions** — Full control, testability, approval flow
2. **StreamEvent union over SDK types** — Insulation from breaking changes
3. **Adapter pattern over direct dependencies** — Swappable, mockable
4. **Approval queue over immediate execution** — Safety, user control
5. **Framework-agnostic core with optional React layer** — Usable anywhere
6. **TypeScript-first** — No runtime JS, full type safety
7. **Zod for schema validation** — Industry standard, great DX

## Comparison with Predecessors

| Aspect | super-chat | obsidian-ai | chimera-chat | arxivite |
|--------|-----------|-------------|--------------|----------|
| **Framework** | Agnostic + React | Obsidian-only | React-only | Intent routing |
| **Tool calling** | LLM-native | LLM-native | LLM-native | Pattern matching |
| **Approval flow** | ✅ Full | ✅ Full | ❌ Stubs | ❌ None |
| **Multi-agent** | ✅ Orchestrator | ✅ Orchestrator | ❌ Single | ❌ Single |
| **SDK insulation** | ✅ StreamEvent | ✅ StreamEvent | ✅ StreamEvent | ❌ N/A |
| **Testability** | ✅ Unit tests | ✅ Unit tests | ✅ Unit tests | ❌ Integration only |
| **Reusability** | ✅ Standalone | ❌ Obsidian-only | ⚠️ Demo | ❌ Arxivite-only |

## Next Steps

1. Implement core types (T2)
2. Implement AgentLoop (T3)
3. Implement ToolExecutor + ApprovalQueue (T4)
4. Build adapter interfaces + reference implementations (T5)
5. Build multi-agent Orchestrator (T6)
6. Build MentionParser (T7)
7. Build React UI components (T8)
8. Assemble ChatEngine (T9)
9. Build demo app (T10)
