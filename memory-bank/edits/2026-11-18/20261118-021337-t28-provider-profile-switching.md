---
kind: edit_chunk
id: 20261118-021337-t28-provider-profile-switching
created_at: 2026-11-18 02:13:37 IST
task_ids: [T28, T22, T32]
source_branch: main
source_commit: 878941dc969052431243e742d128a692765ce57a
---

#### 02:13:37 IST - T28/T22/T32: Add provider profiles and per-chat model switching
- Modified `src/contracts/host.ts`, `src/contracts/validation.ts`, and public exports - Added the optional non-secret provider-profile capability.
- Modified `src/core/types.ts`, `src/core/ChatEngine.ts`, `src/core/AgentLoop.ts`, and `src/core/sessionPersistence.ts` - Persisted each chat's provider profile/model choice and passed it to every request.
- Modified `src/react/components/SuperChatApp.tsx` and `src/react/components/ChatApp.tsx` - Loaded host defaults and added an active-chat picker that restores selections across tabs and locks during streaming.
- Created `apps/standalone/src/providerSettings.ts`; modified `apps/standalone/src/llm.ts`, `host.ts`, `App.tsx`, `screens/ProviderSettingsScreen.tsx`, and `styles.css` - Added multiple profile management, secure profile-key references, legacy single-setting migration, defaults, manual model entry, and connection checks.
- Updated `apps/standalone/UI-STRUCTURE.md` and T28/T22/T32 implementation notes - Recorded current controls, source behavior, and open acceptance work.
- Updated `memory-bank/tasks.md`, `activeContext.md`, and `session_cache.md`; created `sessions/2026-11-18-provider-profile-switching.md` - Reconciled T28 ownership with shared UI and Android host acceptance.
