---
kind: edit_chunk
id: super-chat-2026-05-19-1206
created_at: 2026-05-19 12:06:00 IST
task_ids: [T3, T4]
source_branch: main
source_commit: (uncommitted)
---

#### 12:06:00 IST - T3/T4: AgentLoop and ToolExecutor Implementation
- Created `src/core/ToolExecutor.ts` - Generic tool execution wrapper with dynamic registration, batch execution, and result serialization
- Created `src/core/AgentLoop.ts` - Manual multi-step tool calling loop with callback-based approval flow
- Modified `src/index.ts` - Added exports for ToolExecutor, AgentLoop, and related types
- Modified `package.json` - Updated build script to use tsc typecheck (tsup not yet installed in node_modules)

## Design Decisions
- Callback-based API (not pure async generator) to support mid-stream user approval
- Mirrors obsidian-ai's proven AgentLoop pattern but stays framework-agnostic
- ToolExecutor wraps ToolAdapter + supports dynamic handler registration
- Pluggable ToolResultFormatter (default JSON stringify, override per tool)
- LLMAdapter.streamChatWithTools uses stopWhen: stepCountIs(1) internally; AgentLoop handles the outer loop
