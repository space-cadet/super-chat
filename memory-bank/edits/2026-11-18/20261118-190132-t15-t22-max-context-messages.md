---
kind: edit_chunk
id: 20261118-190132-t15-t22-max-context-messages
created_at: 2026-11-18 19:01:32 IST
task_ids: [T15, T22]
source_branch: main
source_commit: c006a6a245918b772e35859a794378cfe4f99d84
---

#### 19:01:32 IST - T15/T22: Port maximum previous-message setting
- Modified `src/core/types.ts` - Added the optional maximum previous-message setting to shared chat and request options.
- Modified `src/core/ChatEngine.ts` - Forwarded the limit in text-only and tool-assisted turns, defaulting to 10.
- Modified `src/core/AgentLoop.ts` - Forwarded the message limit to tool-capable adapter requests.
- Modified `src/adapters/VercelLLMAdapter.ts` - Applied the previous-message count plus current user message through `buildBudgetedHistory`.
- Modified `apps/standalone/src/appSettings.ts` - Persisted and validated the source-backed setting and mapped it into shared settings.
- Modified `apps/standalone/src/screens/SettingsScreen.tsx` - Added the maximum previous messages control beside the model request budget.
- Updated `memory-bank/implementation-details/settings-port-inventory.md` - Recorded the control and remaining context/compaction gaps.
- Updated `memory-bank/master-plan.md` - Recorded the port and remaining early Settings work.
- Updated `memory-bank/tasks/T15.md` and `memory-bank/tasks/T22.md` - Added implementation notes and verification limits.
- Updated `memory-bank/activeContext.md` and `memory-bank/session_cache.md` - Recorded current state and next work.
- Created `memory-bank/sessions/2026-11-18-max-context-messages.md` - Recorded scope, semantics, and checks.
