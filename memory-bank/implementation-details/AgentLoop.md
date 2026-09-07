# Implementation Details: AgentLoop

*Created: 2026-05-19 12:10:00 IST*
*Last Updated: 2026-09-07 01:29:34 IST*

## Overview

The `AgentLoop` is the core orchestration engine for multi-step LLM tool
calling. It implements the behavior extracted from `obsidian-ai`, including
streaming continuation, approval, cancellation, size-limited tool results, and
evidence-producing retrieval tools. Hosts provide handlers; the loop remains
host-agnostic.

The overall agentic tool/RAG architecture is documented in
`agentic-tool-runtime.md` and `agentic-rag-evidence.md`.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         AgentLoop.run()                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 0: Initialize                                            │
│  ─────────────────                                             │
│  fullText = ""                                                 │
│  currentMessages = [...messages]  // system + history + user   │
│  maxSteps = opts.maxSteps ?? 5                                  │
│  autoApply = opts.autoApply ?? false                            │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
        ┌─────────┐    ┌─────────┐    ┌─────────┐
        │ Step 0  │    │ Step 1  │    │ Step N  │
        │(initial)│    │(tools)  │    │(final)  │
        └────┬────┘    └────┬────┘    └────┬────┘
             │              │              │
             ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: Stream LLM (single step)                              │
│  ────────────────────────────────                              │
│  stream = llmAdapter.streamChatWithTools(                      │
│    toAdapterMessages(currentMessages),                         │
│    tools,                                                      │
│    signal                                                      │
│  )                                                             │
│                                                                │
│  for await (event of stream):                                  │
│    ├─ "text-delta"  → fullText += text                         │
│    │                    onTextDelta?.(fullText)                 │
│    ├─ "tool-call"   → pendingCalls.push(call)                  │
│    │                    onToolCall?.(call)                      │
│    ├─ "tool-error"  → console.warn                              │
│    ├─ "error"       → throw Error                              │
│    └─ "finish"      → (bookkeeping)                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ pendingCalls    │
                    │   .length > 0 ? │
                    └────────┬────────┘
                             │
                    ┌────────┴────────┐
                    │ YES              │ NO
                    ▼                  ▼
        ┌───────────────────┐  ┌───────────────────┐
        │ STEP 2: Execute   │  │ RETURN            │
        │         Tools     │  │ { text, stepsTaken }│
        └───────────────────┘  └───────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: Execute Tools (per call)                            │
│  ─────────────────────────────────                             │
│  for each call in pendingCalls:                                  │
│    ┌─────────────────────────────────────────────────────┐    │
│    │ autoApply || !requestApproval ?                     │    │
│    │   result = await toolExecutor.execute(call)          │    │
│    │ else:                                               │    │
│    │   result = await requestApproval(call)             │    │
│    │   ?? { error: "User rejected" }                     │    │
│    └─────────────────────────────────────────────────────┘    │
│                                                                │
│    onToolResult?.(call, result)                                │
│    results.push({ call, result })                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: Rebuild Messages                                      │
│  ─────────────────────────                                     │
│  assistantMsg = {                                              │
│    role: "assistant",                                          │
│    content: JSON.stringify([                                   │
│      { type: "text", text: stepText },        // if any       │
│      { type: "tool-call", toolCallId, toolName, input },      │
│      ... // one per tool call                                  │
│    ])                                                          │
│  }                                                             │
│                                                                │
│  toolMessages = results.map(({ call, result }) => ({         │
│    role: "assistant",                                          │
│    content: JSON.stringify([                                   │
│      { type: "tool-result", toolCallId, toolName,             │
│        output: { type: "text", value: formattedResult } }       │
│    ])                                                          │
│  }))                                                           │
│                                                                │
│  currentMessages = [                                           │
│    ...currentMessages,                                         │
│    assistantMsg,                                               │
│    ...toolMessages                                             │
│  ]                                                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              └────────────────┐
                                               │
                              ┌────────────────┘
                              ▼
                    ┌─────────────────┐
                    │ step < maxSteps │
                    └────────┬────────┘
                             │
                    ┌────────┴────────┐
                    │ YES              │ NO
                    ▼                  ▼
        ┌───────────────────┐  ┌───────────────────┐
        │ LOOP to Step 1    │  │ RETURN            │
        │ (next LLM call)   │  │ { text, stepsTaken }│
        └───────────────────┘  └───────────────────┘
```

## Data Flow Diagram

```
User Input
    │
    ▼
┌─────────────┐
│  ChatEngine │ ──(messages)──▶
│  (T9)       │                │
└─────────────┘                ▼
                    ┌─────────────────────┐
                    │   AgentLoop.run()    │
                    │   ┌─────────────┐    │
                    │   │  Step 1-5   │    │
                    │   │  (maxSteps) │    │
                    │   └─────────────┘    │
                    └─────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │onTextDelta│   │onToolCall│   │onToolResult│
        │  (UI)     │   │  (UI)    │   │  (UI)     │
        └──────────┘   └──────────┘   └──────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │   LLMAdapter        │
                    │   (Vercel SDK)      │
                    │   stopWhen:         │
                    │   stepCountIs(1)    │
                    └─────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │text-delta│   │tool-call │   │  finish  │
        └──────────┘   └────┬─────┘   └──────────┘
                            │
                            ▼
                    ┌─────────────────────┐
                    │   ToolExecutor      │
                    │   (T4)              │
                    │   execute()         │
                    │   executeBatch()    │
                    └─────────────────────┘
                            │
                            ▼
                    ┌─────────────────────┐
                    │   ToolAdapter       │
                    │   (user-provided)   │
                    │   DemoToolAdapter   │
                    │   ObsidianTools     │
                    └─────────────────────┘
```

## Message Format (Vercel AI SDK v6)

The AgentLoop reconstructs messages in the format expected by the Vercel AI SDK:

### Assistant Message (after tool calls)
```json
{
  "role": "assistant",
  "content": [
    { "type": "text", "text": "Let me search for that..." },
    {
      "type": "tool-call",
      "toolCallId": "call_abc123",
      "toolName": "search_web",
      "input": { "query": "quantum gravity" }
    }
  ]
}
```

### Tool Result Message
```json
{
  "role": "tool",
  "content": [
    {
      "type": "tool-result",
      "toolCallId": "call_abc123",
      "toolName": "search_web",
      "output": {
        "type": "text",
        "value": "1. **Quantum Gravity**\n   URL: https://..."
      }
    }
  ]
}
```

## Approval Flow States

```
┌─────────────┐     autoApply=true      ┌─────────────┐
│  Tool Call  │ ──────────────────────▶ │  Auto Exec  │
│  Detected   │                        │  (no pause) │
└──────┬──────┘                        └─────────────┘
       │
       │ autoApply=false
       │ requestApproval provided
       ▼
┌─────────────┐
│  Pending    │
│  Approval   │ ◀── User sees PendingToolCard in UI
└──────┬──────┘
       │
       ├────────── Approve ──────▶ ┌─────────────┐
       │                            │  Execute    │
       │                            │  Tool       │
       │                            └─────────────┘
       │
       └────────── Reject ───────▶ ┌─────────────┐
                                    │  Return     │
                                    │  Error      │
                                    │  "User      │
                                    │  rejected"  │
                                    └─────────────┘
```

## Error Handling

| Error Source | Handling | Result |
|--------------|----------|--------|
| LLM stream error | Throw immediately | Caller catches, shows error |
| Tool execution error | Catch in ToolExecutor | ToolResult with `error` field |
| User rejection | requestApproval returns null | ToolResult with `error: "User rejected"` |
| Max steps reached | Return with stepsTaken=maxSteps | Caller shows partial result |
| AbortSignal | Break loop, return current text | Graceful cancellation |

## Comparison with obsidian-ai AgentLoop

| Aspect | obsidian-ai | super-chat |
|--------|-------------|------------|
| API | Callbacks (`onTextDelta`, `requestApproval`) | Same callbacks |
| Tool formatting | Hardcoded `formatToolResult()` with 13 tools | Pluggable `ToolResultFormatter` |
| LLM adapter | `ChatApiManager` (Obsidian-specific) | Generic `LLMAdapter` interface |
| Message format | Vercel SDK v6 parts | Same Vercel SDK v6 parts |
| Token estimation | `estimateTokens()` from context module | Reuse the existing estimator first |
| Coupling | Tied to Obsidian settings/profile | Framework-agnostic |

## Message Context Rules

- `pendingCalls` is a list. Every tool call in one provider response is kept
  and processed.
- The assistant message keeps the text and all tool calls in their original
  order. Each result keeps the ID of the call that produced it.
- A small history check confirms that every result refers to a real call.
- The provider adapter follows the conversion already used by `obsidian-ai`.
  Hosts do not build provider-specific messages.
- A complete tool result may be saved and shown while a shorter copy is used
  in the next provider request when the result is too large.

The full first-step policy is in
[`model-history-and-context.md`](model-history-and-context.md).

## Files
- `src/core/AgentLoop.ts` — Implementation
- `src/core/types.ts` — Type definitions

## Related
- T4: ToolExecutor — Provides tool execution for AgentLoop
- T5: Adapter Interfaces — LLMAdapter.streamChatWithTools is consumed here
- T9: ChatEngine — Will orchestrate AgentLoop instances
