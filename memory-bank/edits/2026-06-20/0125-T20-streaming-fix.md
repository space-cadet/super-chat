# Edit Chunk: 2026-06-20 01:25 IST

## Summary
T20 COMPLETED: Fixed ChatEngine real-time streaming for tools. AgentLoop refactored from Promise-based to AsyncGenerator, enabling true real-time event streaming during multi-step tool execution.

## Files Modified
- `src/core/AgentLoop.ts` — Refactored `run()` to `AsyncGenerator<StreamEvent, AgentLoopResult>`
  - Removed callback-based approach (onTextDelta, onToolCall, onToolResult)
  - Events yielded directly as they occur
  - Approval flow yields `pending-approval` event
  - Returns `AgentLoopResult` at completion
- `src/core/ChatEngine.ts` — Updated `runWithTools()` to consume AgentLoop generator
  - Uses `for await` to forward events in real-time
  - Accumulates assistant text for final message
  - Saves message after streaming completes
- `tsconfig.json` — Created for `tsc --noEmit` typechecking

## Files Created
- `src/core/AgentLoop.test.ts` — 11 unit tests
  - basic streaming (text-deltas)
  - tool calling (tool-call, tool-result events)
  - multi-step iteration
  - approval flow (pending-approval)
  - abort signal handling
  - edge cases (no tools, max steps)
- `src/core/ChatEngine.test.ts` — 4 integration tests
  - event forwarding from AgentLoop
  - text-only response
  - abort during streaming
  - session management

## Test Results
- 15/15 tests passing
- Typecheck: ✅ No errors

## Key Design Decisions
1. **AsyncGenerator over callbacks**: Cleaner, more testable, no callback wiring
2. **AgentLoop yields events, ChatEngine forwards**: Preserves single-responsibility
3. **No breaking changes to public API**: ChatEngine.sendMessage() still returns AsyncIterable<StreamEvent>

## Next Actions
- T21: Port formatToolResult() from obsidian-ai
