# Consolidation Implementation Plan

*Created: 2026-06-20 00:22:00 IST*
*Last Updated: 2026-06-20 01:00:00 IST*
*Related Tasks: T14, T15, T16, T17, T18, T19, T20, T21, T22, T23, T24*

---

## 1. The Adapter Pattern (The Foundation)

This is the core abstraction that makes everything work. All three apps implement these interfaces:

```typescript
// super-chat/src/core/types.ts (already exists)

interface LLMAdapter {
  streamChat(params: ChatParams): AsyncGenerator<StreamEvent>;
  supportsTools: boolean;
}

interface ToolAdapter {
  getToolDefinitions(): ToolDefinition[];
  executeTool(toolCall: ToolCall): Promise<ToolResult>;
  requiresApproval?(toolName: string): boolean; // NEW for approval flow
}

interface RAGAdapter {
  retrieveContext(query: string): Promise<ContextItem[]>;
}

interface ContextAdapter {
  getContext(): Promise<ContextItem[]>;
}

interface PersistenceAdapter {
  saveSession(session: Session): Promise<void>;
  loadSession(id: string): Promise<Session>;
  listSessions(): Promise<SessionSummary[]>;
}
```

---

## 1.5 Comprehensive Survey Findings (2026-06-20)

Seven critical issues discovered during code audit of all four codebases:

### Finding 1: Broken Real-Time Streaming for Tools [CRITICAL]
**File**: `super-chat/src/core/ChatEngine.ts` — `runWithTools()`
**Problem**: `AgentLoop.run()` runs to completion, THEN yields final text as single chunk. No real-time streaming during multi-step tool execution.
**Impact**: Users see NOTHING during tool execution; assistant appears to hang then dumps response.
**Fix**: Make `AgentLoop.run()` return `AsyncGenerator<StreamEvent, AgentLoopResult>`.
**Task**: T20

### Finding 2: Missing Tool Result Formatting [HIGH]
**File**: `super-chat/src/core/ChatEngine.ts`
**Problem**: Default formatter is `JSON.stringify(result, null, 2)`. Tool results are unreadable JSON blobs.
**Fix**: Port `formatToolResult()` from obsidian-ai as pluggable formatter.
**Task**: T21

### Finding 3: Type Mismatch in ChatMessage.content [MEDIUM]
**File**: `super-chat/src/core/types.ts`
**Problem**: `ChatMessage.content` typed as `string`, but stores `JSON.stringify([{type:"text"}, {type:"tool-call"}])`.
**Fix**: Add proper `parts` array alongside `content` field.
**Task**: T22

### Finding 4: chimera-chat ChatEngine is Obsolete [LOW]
**File**: `chimera-chat/src/core/ChatEngine.ts`
**Problem**: Direct fetch-based adapter, completely different from super-chat's Vercel SDK-based engine.
**Implication**: Only port React UI components, NOT engine logic.

### Finding 5: Missing Token Tracking [LOW]
**File**: `super-chat/src/core/AgentLoop.ts`
**Problem**: `AgentLoopResult` only has `text` and `stepsTaken`. No per-step token estimates.
**Fix**: Add `stepTokenEstimates` to `AgentLoopResult`.
**Task**: T23

### Finding 6: No Multi-Agent Orchestration [MEDIUM]
**File**: N/A in super-chat
**Problem**: `Orchestrator`, `MentionParser`, debate mode — only exist in obsidian-ai.
**Fix**: Port from obsidian-ai.
**Task**: T6/T7

### Finding 7: No Web Search Tools [MEDIUM]
**File**: N/A in super-chat
**Problem**: obsidian-ai has 4-provider web search. super-chat has none.
**Fix**: Create generic `WebSearchToolAdapter`.
**Task**: T24

---

## 2. The Unified Stack (Updated Post-Survey)

```
┌─────────────────────────────────────────────────┐
│  super-chat (npm package @space-cadet/super-chat)│
│  ───────────────────────────────────────────────  │
│  Engine:                                          │
│    ChatEngine - orchestrates adapters             │
│    AgentLoop - multi-step tool calling            │
│    ToolExecutor - execution + approval flow       │
│    formatToolResult() - per-tool markdown         │
│    Orchestrator - multi-agent dispatch            │
│    MentionParser - @AgentName routing             │
│  ───────────────────────────────────────────────  │
│  React Layer:                                     │
│    ChatApp - main component                       │
│    MessageBubble - with agent identity dots       │
│    ChatInput - auto-expand textarea               │
│    PendingToolCard - approval UI                  │
│    SessionSidebar - thread management             │
│  ───────────────────────────────────────────────  │
│  Adapters (reference implementations):            │
│    VercelLLMAdapter - 9 providers, lazy load      │
│    LocalStoragePersistenceAdapter                 │
│    WebSearchToolAdapter - DuckDuckGo, etc.        │
│    (ArxiviteRAGAdapter - in arxivite repo)        │
│    (ObsidianToolAdapter - in obsidian-ai repo)    │
└─────────────────────────────────────────────────┘
           ▲                    ▲
           │                    │
           │ consumes           │ consumes
           │                    │
    ┌──────┴──────┐      ┌──────┴──────┐
    │  arxivite   │      │ obsidian-ai │
    │  ─────────  │      │  ─────────  │
    │  Arxivite   │      │  Obsidian   │
    │  ToolAdapter│      │  ToolAdapter│
    │  Arxivite   │      │  Obsidian   │
    │  RAGAdapter │      │  Context    │
    │             │      │  Adapter    │
    │  (custom UI │      │  (custom UI │
    │   chrome)   │      │   chrome)   │
    └─────────────┘      └─────────────┘
```

---

## 3. Phase-by-Phase Implementation (Updated)

### Phase 0: Foundation Fixes (CRITICAL - Do First)

#### Step 0.1: Fix ChatEngine Real-Time Streaming (T20, 1-2 days)

**File**: `super-chat/src/core/ChatEngine.ts` - `runWithTools()`
**Problem**: AgentLoop runs to completion, THEN yields final text as single chunk. Users see nothing during multi-step tool execution.
**Solution**: Make `AgentLoop.run()` return `AsyncGenerator<StreamEvent, AgentLoopResult>` instead of `Promise<AgentLoopResult>`.

**Why critical**: Without this fix, ALL tool-enabled chats appear to "hang" then dump the response. This blocks every other task.

---

#### Step 0.2: Port `formatToolResult()` (T21, 1 day)

**Source:** `obsidian-ai/src/agent/formatToolResult.ts`
**Target:** `super-chat/src/core/formatToolResult.ts`

Makes tool results LLM-readable:

| Tool | Format |
|------|--------|
| `search_notes` | Markdown table |
| `list_notes` / `list_folders` | Bulleted list |
| `get_note_metadata` | Formatted metadata block |
| `read_note` | Markdown with code fence |
| `edit_note` / `patch_note` | Diff format |

**Key insight:** This is the smallest change with the biggest UX impact. Tool results become readable instead of raw JSON.

---

### Phase 1: Enhance super-chat (2-3 weeks)

#### Step 1.1: Enhance AgentLoop (T15, 3-4 days)

**Source:** `obsidian-ai/src/agent/AgentLoop.ts`
**Target:** `super-chat/src/core/AgentLoop.ts` (extend, don't replace)

What changes:

```typescript
// Current super-chat AgentLoop (simplified)
class AgentLoop {
  async run(params: AgentParams) {
    for (let step = 0; step < maxSteps; step++) {
      const result = await streamText({ tools, stopWhen: stepCountIs(1) });
      // ... basic execution
    }
  }
}

// Enhanced version (from obsidian-ai)
class AgentLoop {
  async *run(params: AgentParams) {
    for (let step = 0; step < maxSteps; step++) {
      const result = await streamText({ tools, stopWhen: stepCountIs(1) });

      // NEW: Real-time streaming (T20)
      yield { type: "text-delta", text: result.text };

      // NEW: Approval check
      if (toolCall && this.requiresApproval(toolCall.name)) {
        yield { type: "tool-approval-requested", toolCall };
        const approved = await this.waitForApproval();
        if (!approved) continue;
      }

      // NEW: Better error handling
      const toolResult = await this.executeWithRetry(toolCall, maxRetries);

      // NEW: Format result for LLM (T21)
      const formattedResult = formatToolResult(toolResult);

      // NEW: Token tracking (T23)
      this.stepTokenEstimates.push({ step, inputTokens, outputTokens });

      // Continue loop
      yield { type: "tool-result", toolCall, result: formattedResult };
    }
  }
}
```

---

#### Step 1.2: Port UI Components (T14, 3-4 days)

**Source:** `chimera-chat/src/components/`
**Target:** `super-chat/react/`

**CRITICAL NOTE**: Only port React UI components. chimera-chat's `ChatEngine` is obsolete (direct fetch-based, not Vercel SDK). Do NOT port engine logic.

Components to port:

| Component | Source | Key Features |
|-----------|--------|-------------|
| `ChatApp.tsx` | chimera-chat | Main container, participant dropdown, zen mode |
| `MessageBubble.tsx` | chimera-chat | Agent identity dots, mobile actions |
| `ChatInput.tsx` | chimera-chat | Auto-expand textarea, compact buttons |
| `PendingToolCard.tsx` | chimera-chat | Compact expandable approval UI |
| `ToolResultCard.tsx` | chimera-chat | Result display |
| `SessionSidebar.tsx` | chimera-chat | Thread management |
| `ActionBar.tsx` | chimera-chat | Participant badge, debate toggle, zen mode |

**Key decision:** Keep super-chat's existing `useChat` and `useAgent` hooks as the state layer. The UI components are thin wrappers that consume these hooks.

---

#### Step 1.3: Port Orchestrator + MentionParser (T6/T7, 2-3 days)

**Source:** `obsidian-ai/src/agent/Orchestrator.ts`, `MentionParser.ts`
**Target:** `super-chat/src/agent/`

Generic version:

```typescript
interface AgentProfile {
  id: string;
  name: string;
  model: string;
  systemPrompt: string;
  color: string; // for UI dot
}

class Orchestrator {
  // Sequential mode: agents respond one after another
  // Debate mode: Round 1 respond, Round 2 discuss
  // Full context vs isolated context
  resolveMention(mention: string): AgentProfile | null;
}
```

**Known limitation**: Group chat with tools does NOT support manual approval - returns error asking to enable auto-approve.

---

#### Step 1.4: Port RAG as RAGAdapter (T16, 2-3 days)

**Source:** `arxivite/src/lib/rag/`
**Target:** `super-chat/src/adapters/RAGAdapter.ts` (interface)
**Reference impl:** `super-chat/src/adapters/ArxiviteRAGAdapter.ts`

The generic adapter accepts any vector store:

```typescript
interface RAGAdapter {
  retrieveContext(query: string): Promise<ContextItem[]>;
}

// arxivite-specific
class ArxiviteRAGAdapter implements RAGAdapter {
  constructor(
    private intentRouter: ChatbotIntentRouter,
    private pocketFlow: PocketFlowPipeline,
    private pdfStore: VectorStore
  ) {}

  async retrieveContext(query: string): Promise<ContextItem[]> {
    const intent = await this.intRouter.classify(query);
    const chunks = await this.pocketFlow.retrieve(intent, query);
    return chunks.map(c => ({ content: c.text, source: c.source }));
  }
}
```

---

#### Step 1.5: Fix ChatMessage Types (T22, 2-3 days)

**Problem**: `ChatMessage.content` is `string`, but stores JSON arrays for assistant/tool roles.
**Solution**: Add `parts` array alongside `content`:

```typescript
interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string; // Human-readable text
  parts?: MessagePart[]; // Structured parts for LLM
  timestamp: Date;
}

type MessagePart =
  | { type: 'text'; text: string }
  | { type: 'tool-call'; toolCallId: string; toolName: string; args: any }
  | { type: 'tool-result'; toolCallId: string; result: ToolResult }
  | { type: 'reasoning'; reasoning: string };
```

---

#### Step 1.6: Add Web Search Tools (T24, 2-3 days)

Create generic `WebSearchToolAdapter` with DuckDuckGo (free, no key), Tavily, SearXNG, Exa providers.

---

### Phase 2: Fix arxivite (T17, 1-2 days) - Fastest Win

#### ❌ Correction from Code Audit (2026-06-20)

**arxivite does NOT have a broken "regex shim" called `ArxiviteLLMAdapter`.** The previous analysis was wrong. What actually exists is a **proper super-chat adapter layer** that wraps super-chat's `VercelLLMAdapter` with native Vercel AI SDK v6 tool calling.

**The actual situation:**
- arxivite has a `useSuperChat` feature flag in `chatbot.tsx` (default: `false`)
- When `useSuperChat=true`: Uses super-chat's `ChatEngine` with proper native tool calling via `ArxiviteLLMAdapter` (wrapper around `VercelLLMAdapter`)
- When `useSuperChat=false`: Uses legacy path with simulated tool calling
- arxivite already has proper adapters: `ArxiviteToolAdapter`, `ArxiviteRAGAdapter`, `ArxivitePersistenceAdapter`

**The real T17 work:**
1. Change `useSuperChat` default from `false` to `true`
2. Remove the legacy path from `ChatbotAssistant.tsx`
3. Test that arxivite's tool calling + RAG works with super-chat
4. Polish the integration (error handling, streaming, etc.)

**Effort:** Much smaller than originally estimated - ~1-2 days instead of "rewrite everything".

---

#### The Legacy Path (to be removed)

`arxivite/src/components/chat/ChatbotAssistant.tsx` contains a legacy path that simulates tool calling:

```tsx
const [useSuperChat, setUseSuperChat] = useState(false); // DEFAULT: legacy

// When useSuperChat=false, uses legacy simulation with no streaming
// When useSuperChat=true, uses super-chat's ChatEngine with native tool calling
```

**What to delete:** The entire legacy path (the `if (!useSuperChat)` branch).

**What to keep:** The super-chat path (the `else` branch) and the adapter layer.

---

#### The Fix (updated)

```typescript
// In chatbot.tsx - change default:
const [useSuperChat, setUseSuperChat] = useState(true); // WAS: false

// Remove the legacy path entirely:
// DELETE: if (!useSuperChat) { ... legacy simulation ... }
// KEEP: else { ... super-chat ChatEngine ... }

// The super-chat path already works:
import { ChatEngine, VercelLLMAdapter } from '@space-cadet/super-chat';
import { ArxiviteToolAdapter } from './ArxiviteToolAdapter';
import { ArxiviteRAGAdapter } from './ArxiviteRAGAdapter';

const chatEngine = new ChatEngine({
  llmAdapter: new VercelLLMAdapter({ ... }),
  toolAdapter: new ArxiviteToolAdapter(tools),
  ragAdapter: new ArxiviteRAGAdapter({ ... }),
  // ...
});
```

---

### Phase 3: Integrate into obsidian-ai (T18, 1-2 weeks)

#### Migration

```typescript
// obsidian-ai/src/adapters/ObsidianToolAdapter.ts
import { ToolAdapter } from '@space-cadet/super-chat';

export class ObsidianToolAdapter implements ToolAdapter {
  constructor(private app: App) {}

  getToolDefinitions() { return tools; }

  async executeTool(toolCall) {
    const tool = tools[toolCall.name];
    return tool.execute(toolCall.args, this.app);
  }

  requiresApproval(toolName: string): boolean {
    return ['edit_note', 'delete_note', 'move_note'].includes(toolName);
  }
}

// obsidian-ai/src/adapters/ObsidianContextAdapter.ts
import { ContextAdapter } from '@space-cadet/super-chat';

export class ObsidianContextAdapter implements ContextAdapter {
  constructor(private app: App) {}

  async getContext(): Promise<ContextItem[]> {
    // Return: active note, recent notes, folder structure, tags
    return this.buildContext();
  }
}
```

#### What to Replace
- `obsidian-ai/src/components/ChatApp.tsx` → `super-chat/react/ChatApp`
- `obsidian-ai/src/agent/AgentLoop.ts` → `super-chat/src/core/AgentLoop`
- `obsidian-ai/src/agent/Orchestrator.ts` → `super-chat/src/agent/Orchestrator`
- `obsidian-ai/src/agent/MentionParser.ts` → `super-chat/src/agent/MentionParser`
- `obsidian-ai/src/components/PendingToolCard.tsx` → `super-chat/react/PendingToolCard`

#### What to Keep
- `obsidian-ai/src/tools/tools.ts` → `ObsidianToolAdapter`
- `obsidian-ai/src/context/contextSystem.ts` → `ObsidianContextAdapter`
- `obsidian-ai/src/settings/ChatApiManager.ts` → provider config
- `obsidian-ai/src/openResponses/OpenResponsesLoop.ts` → keep as extension
- All Obsidian-specific UI chrome (ribbon icons, settings tab, etc.)

---

## 4. Build/Publish Workflow

```bash
# In super-chat:
pnpm build          # tsup ESM + CJS
pnpm version minor  # v0.1.0 → v0.2.0
pnpm publish         # or pnpm publish --access public

# In arxivite:
pnpm add @space-cadet/super-chat@latest

# In obsidian-ai:
pnpm add @space-cadet/super-chat@latest
```

---

## 5. Testing Strategy

1. **Unit tests** in super-chat for each adapter interface
2. **Integration tests** in each app:
   - Tool calling round-trip
   - Approval flow
   - Multi-agent orchestration
   - RAG retrieval
3. **E2E tests** in arxivite (fastest win):
   - Search arXiv → fetch PDF → ask question about it
   - Verify streaming works
   - Verify tool results are formatted

---

## 6. Critical Pitfalls to Avoid

1. **Don't break existing obsidian-ai tools**: The 15 tools are tightly coupled to Obsidian's API. Wrap them in `ObsidianToolAdapter`, don't rewrite them.

2. **Don't lose arxivite's RAG**: arxivite's PocketFlow + intent router is genuinely good. The `ArxiviteRAGAdapter` should preserve all of it.

3. **Keep the `autoApply` toggle**: In obsidian-ai, some users prefer manual approval. The `requiresApproval()` pattern handles this.

4. **Don't merge git repos**: Keep super-chat, arxivite, obsidian-ai as separate repos. super-chat is the shared dependency.

5. **Version pinning**: After initial integration, pin to a specific super-chat version in each app. Don't auto-update until tested.

---

## 7. Recommended Order (Updated after Comprehensive Survey)

| Order | Task | Effort | Why This Order |
|-------|------|--------|----------------|
| **0** | **T20: Fix ChatEngine streaming** | 1-2 days | **CRITICAL** — Without this, ALL tool-enabled chats appear to hang |
| **1** | **T21: Port formatToolResult()** | 1 day | Smallest change, biggest impact — makes tool results readable |
| **2** | T17: Make super-chat default in arxivite | 1-2 days | Fastest win — but MUST happen after T20 |
| **3** | T15: Enhanced AgentLoop | 3-4 days | Core engine improvement — add error handling, retries, token tracking |
| **4** | T14: Port UI components | 3-4 days | Visual layer — chimera-chat has prettier components |
| **5** | T16: RAGAdapter | 1 day | Already done in arxivite! Just verify interface compatibility |
| **6** | T6/T7: Orchestrator + MentionParser | 2-3 days | Multi-agent features |
| **7** | T22: Fix ChatMessage types | 2-3 days | Type safety improvement |
| **8** | T23: Token tracking | 1 day | Nice-to-have metrics |
| **9** | T24: Web search tools | 2-3 days | Optional feature |
| **10** | T19: Polish arxivite integration | 2-3 days | First full app integration |
| **11** | T18: obsidian-ai integration | 1-2 weeks | Largest, most complex |
| **12** | Publish v0.2.0 | 1 day | Release |

This gives you working improvements in arxivite within 3-4 days, while building toward the full consolidation.

---

## 8. Code Audit Findings (2026-06-20)

### What Was Wrong in Initial Analysis

1. **T17 (arxivite)**: The `ArxiviteLLMAdapter` was described as a "broken regex shim". In reality, it's a **proper wrapper** around super-chat's `VercelLLMAdapter` with native Vercel AI SDK v6 tool calling. The problem is that arxivite defaults to `useSuperChat=false`, using a legacy simulation path instead.

2. **T16 (RAGAdapter)**: Described as "needs to be ported from arxivite". In reality, arxivite already has a working `ArxiviteRAGAdapter` that implements the `RAGAdapter` interface. The work is verification and potential interface alignment, not a full port.

### What Was Correct

1. **chimera-chat**: `ChatEngine.streamWithTools()` has no approval flow - tools execute immediately.

2. **obsidian-ai**: Has the most mature `AgentLoop` with `autoApprove`, `requestApproval`, `formatToolResult()`, and `reasoning-delta` support.

3. **super-chat**: Has `autoApply` + `requestApproval` but defaults to `JSON.stringify` for tool results - no per-tool formatting.

### Actual arxivite Architecture

```
arxivite/src/lib/super-chat/
├── ArxiviteLLMAdapter.ts      ← Proper wrapper around VercelLLMAdapter
├── ArxiviteToolAdapter.ts      ← Bridges tool registry to ToolAdapter
├── ArxiviteRAGAdapter.ts     ← Bridges RAG pipeline to RAGAdapter
├── ArxivitePersistenceAdapter.ts
└── index.ts                    ← Exports adapters

arxivite/src/components/chat/
├── ChatbotAssistant.tsx        ← Has useSuperChat toggle (default: false)
└── chatbot.tsx                 ← Main chatbot page
```

### Impact on Effort Estimates

| Task | Original Estimate | Corrected Estimate | Reason |
|------|-------------------|-------------------|--------|
| T17 | "Delete shim, rewrite adapter" | 1-2 days | Just toggle default + remove legacy |
| T16 | "Port RAG from arxivite" | 1 day | Already exists, verify compatibility |
| T15 | "Port agent logic from obsidian-ai" | 3-5 days | Still needed - obsidian-ai is more mature |
| T14 | "Port UI from chimera-chat" | 3-4 days | Still needed - chimera-chat has prettier UI |
| T18 | "Integrate into obsidian-ai" | 1-2 weeks | Still needed - largest integration |

---

## 9. Git Repo Notes

- **chimera-chat**: `https://github.com/space-cadet/chimera-chat` - has history, local copy may need re-clone
- **arxivite**: `https://github.com/space-cadet/arxivite` - fixed, local now tracks origin/main
- **obsidian-ai**: `https://github.com/space-cadet/obsidian-ai` - clean, working
- **super-chat**: `https://github.com/space-cadet/super-chat` - published, canonical

**Rule:** Do NOT run `git init` in folders that already have git history. Always check `git status` and `git remote -v` first.

**Note:** arxivite has a `useSuperChat` toggle. The super-chat path is already implemented but not the default. The legacy path simulates tool calling without streaming.
