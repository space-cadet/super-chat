---
kind: edit_chunk
id: 20261118-185649-t15-t22-full-request-token-estimate
created_at: 2026-11-18 18:56:49 IST
task_ids: [T15, T22, INFRA-1]
source_branch: main
source_commit: c006a6a245918b772e35859a794378cfe4f99d84
---

#### 18:56:49 IST - T15/T22: Port full request token estimates
- Modified `src/core/types.ts` - Added the source-backed full-request estimate preference and a neutral estimate event.
- Modified `src/core/AgentLoop.ts` - Forwarded request-estimate events from tool-assisted provider streams.
- Modified `src/core/ChatEngine.ts` - Added the preference default and forwarded estimates from text-only provider streams.
- Modified `src/index.ts` - Exported the existing structured token estimator for the standalone host.
- Modified `src/react/hooks/useChat.ts` - Captured estimate events for sends, retries and replays, scoped to their chat.
- Modified `src/react/components/ChatInput.tsx` - Allowed the host-provided total to replace the draft-only display.
- Modified `src/react/components/ChatApp.tsx` - Displayed the prepared request estimate plus generated assistant text during streaming.
- Modified `apps/standalone/src/llm.ts` - Estimated prepared messages after adding system instructions and memory for both text and tool requests.
- Modified `apps/standalone/src/appSettings.ts` - Persisted the full-request estimate preference with the source default enabled.
- Modified `apps/standalone/src/screens/SettingsScreen.tsx` - Added the full-request estimate toggle and clarified that provider usage may differ.
- Updated `memory-bank/implementation-details/settings-port-inventory.md` - Recorded the new estimate control and remaining usage gap.
- Updated `memory-bank/master-plan.md` - Refined UI03 and OP01 states and remaining provider-usage work.
- Updated `memory-bank/tasks/T15.md` - Recorded the source-setting port and host adapter boundary.
- Updated `memory-bank/tasks/T22.md` - Recorded the new stream event and standalone display.
- Updated `memory-bank/activeContext.md` - Added the current estimate behavior and next Settings gaps.
- Updated `memory-bank/session_cache.md` - Added the current code slice and its limits.
- Created `memory-bank/sessions/2026-11-18-full-request-token-estimate.md` - Recorded scope, distinction from provider usage, and checks.
