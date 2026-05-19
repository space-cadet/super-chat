# Implementation Details: ToolExecutor

*Created: 2026-05-19 12:10:00 IST*
*Last Updated: 2026-05-19 12:10:00 IST*

## Overview

The `ToolExecutor` is a generic tool execution wrapper that bridges between the `ToolAdapter` interface and the `AgentLoop`. It supports both static tools (from an adapter) and dynamically registered handlers.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     ToolExecutor                                 │
│                     ────────────                                 │
│                                                                  │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │   handlers      │    │    adapter?     │                     │
│  │   Map<string,   │    │   ToolAdapter   │                     │
│  │   ToolHandler>  │    │                 │                     │
│  └────────┬────────┘    └────────┬────────┘                     │
│           │                      │                               │
│           └──────────┬───────────┘                               │
│                      │                                           │
│                      ▼                                           │
│           ┌─────────────────────┐                                │
│           │     execute()       │                                │
│           │  1. Check handlers    │                                │
│           │  2. Fall to adapter   │                                │
│           │  3. Catch → error     │                                │
│           └─────────────────────┘                                │
│                      │                                           │
│                      ▼                                           │
│           ┌─────────────────────┐                                │
│           │    executeBatch()   │                                │
│           │  Promise.all(calls) │                                │
│           └─────────────────────┘                                │
└─────────────────────────────────────────────────────────────────┘
```

## Execution Flow

```
ToolCall { name, args }
        │
        ▼
┌─────────────────────────┐
│  handlers.has(name)?    │
└───────────┬─────────────┘
            │
    ┌───────┴───────┐
    │ YES            │ NO
    ▼                ▼
┌──────────┐  ┌─────────────────┐
│  handler │  │ adapter?.execute │
│  (args)  │  │    Tool(call)   │
└────┬─────┘  └────────┬────────┘
     │                 │
     ▼                 ▼
┌─────────────────────────────┐
│  try { await ... }          │
│  catch (err) {              │
│    return {                 │
│      success: false,        │
│      error: err.message     │
│    }                        │
│  }                          │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  Result is string?            │
│    → return as content        │
│  Result is object?            │
│    → JSON.stringify           │
│  Return:                    │
│    { success: true, content } │
│    OR                       │
│    { success: false, error }│
└─────────────────────────────┘
```

## Registration Pattern

```typescript
// Static tools via adapter
const executor = new ToolExecutor({
  adapter: new DemoToolAdapter()  // 4 built-in demo tools
});

// Dynamic registration
executor.register("calculate", async (args: { expr: string }) => {
  return eval(args.expr);  // ⚠️ demo only, not production
});

// Both available to AgentLoop
const tools = executor.getAvailableTools();
// → [{ name: "search_web", ... }, { name: "calculate", ... }]
```

## Error Handling Strategy

| Scenario | Handler Behavior | Result |
|----------|-----------------|--------|
| Handler throws | Catch, return `error` | `{ success: false, error: "..." }` |
| No handler + no adapter | Return not found | `{ success: false, error: "No handler for 'foo'" }` |
| Adapter throws | Catch, return `error` | `{ success: false, error: "..." }` |
| Handler returns object | JSON.stringify | `{ success: true, content: "{...}" }` |
| Handler returns string | Pass through | `{ success: true, content: "..." }` |

## Comparison with obsidian-ai ToolExecutor

```
obsidian-ai ToolExecutor                    super-chat ToolExecutor
────────────────────────                    ───────────────────────
┌─────────────────────┐                    ┌─────────────────────┐
│ constructor(app,     │                    │ constructor(opts?)   │
│   settings)         │                    │   { adapter? }      │
│                     │                    │                     │
│ Obsidian-specific:  │                    │ Framework-agnostic: │
│ - app.vault         │                    │ - ToolAdapter interface│
│ - TFile             │                    │ - Dynamic handlers  │
│ - Notice            │                    │ - No UI dependencies │
│                     │                    │                     │
│ 13 hardcoded tools  │                    │ Delegates to adapter │
│ (switch statement)  │                    │ or registered handlers│
│                     │                    │                     │
│ formatToolResult()  │                    │ Pluggable formatter  │
│ lives in AgentLoop  │                    │ (AgentLoop option)   │
└─────────────────────┘                    └─────────────────────┘
```

## Files
- `src/core/ToolExecutor.ts` — Implementation
- `src/core/types.ts` — Type definitions (ToolCall, ToolResult, ToolDefinition, ToolHandler, ToolAdapter)

## Related
- T3: AgentLoop — Consumes ToolExecutor.execute()
- T5: Adapter Interfaces — ToolAdapter is the interface that ToolExecutor wraps
- T10: Demo App — Will use DemoToolAdapter with ToolExecutor

## API Reference

### Constructor
```typescript
new ToolExecutor(opts?: { adapter?: ToolAdapter })
```

### Methods
```typescript
// Register a dynamic handler
register<T>(name: string, handler: ToolHandler<T>): void

// Get all available tool definitions
getAvailableTools(): ToolDefinition[]

// Execute a single tool call
execute(call: ToolCall): Promise<ToolResult>

// Execute multiple calls in parallel
executeBatch(calls: ToolCall[]): Promise<ToolResult[]>
```

### Types
```typescript
interface ToolCall {
  id: string;           // Unique call ID (generated by LLM)
  name: string;           // Tool name
  args: Record<string, unknown>;  // Parsed arguments
}

interface ToolResult {
  success?: boolean;      // true/false
  content?: string;       // Success payload (stringified)
  error?: string;         // Error message
  path?: string;         // Optional: affected file/path
}

type ToolHandler<T = unknown> = (args: T) => Promise<unknown>;

interface ToolAdapter {
  executeTool(call: ToolCall): Promise<ToolResult>;
  getAvailableTools(): ToolDefinition[];
}
```
