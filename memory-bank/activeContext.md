# Active Context

*Last Updated: 2026-11-18 14:25:11 IST*

## Current Delivery: Feature Build and Settings — 2026-11-18

Use [Super Chat Master Delivery Plan](master-plan.md) for current delivery
order, feature coverage, task ownership, evidence and next work. INFRA-1 owns
the program, T22 the application, T15 the reference comparison. Existing tasks
remain implementation owners; no new task tree was created.

The shared worktree now includes direct reuse of Obsidian-AI feature code for
saved-chat search, tabs/drafts, message selection/edit/resend/replay, thinking
controls, attachments, archive exchange, and provider conversion. The standalone
Settings screen now has Providers, Chat, Tools, and Memory sections. Memory uses
three tiers; prompt injection is opt-in and new memories require promotion to
core.

Shared and standalone typechecks, the shared package build, and Android debug
build passed. The final APK installed and launched on the OPPO CPH2661IN; its
SHA-256 and remaining acceptance are recorded in T32 and the session log. No
full suite ran after the final memory/Settings changes, and live memory/tool
round trips remain open.

Continue building the remaining Settings options from the master plan, including
tab restoration, naming/tags/retention, and outstanding thinking/usage behavior.
Layout issues are handled when the user reports them. Existing incomplete
acceptance remains open; no new task IDs were created.


## Per-chat Provider and Model Switching — 2026-11-18

T28 now has a source implementation for multi-profile provider settings and
per-chat model choice, based on Obsidian-AI's profile picker and session
selection behavior. The host exposes only non-secret profile summaries;
credentials stay in the host store. New chats inherit the configured default,
and each saved chat restores its own profile/model when reopened or selected.

Shared library and standalone TypeScript checks, the package build, and the
Android debug build passed. No tests, device visual check, credential save, or
live provider request were performed. T28 remains in progress for cross-host
tests and device acceptance; Android persistence/recovery and broader T32
acceptance remain open.

See `tasks/T28.md`, `implementation-details/provider-profiles-and-switching.md`,
and `sessions/2026-11-18-provider-profile-switching.md`.

## Android Credential Backup Handling — 2026-11-17

T32 adds Android backup exclusions for the encrypted API-key preferences on
Android 12+ cloud backup/device transfer and through legacy backup rules on
older Android. Other eligible app data remains under Android's default backup
behavior; IndexedDB session backup and restore are still unverified. This
closes only the credential-backup policy gap, not T32e/T32f acceptance.

## Standalone UI and Host Wiring — 2026-11-17

The shared standalone UI plan is in `apps/standalone/UI-STRUCTURE.md`; saved
concept images are indexed in
`implementation-details/standalone-ui-mockups.md` and stored under
`assets/ui-mockups/standalone/`. The plan keeps one React interface across
browser, Android, and desktop, with platform-specific visual styling.

Commit `f97c608` routes the renderer through `SuperChatApp` and a standalone
host, with provider settings, IndexedDB sessions/settings, lifecycle
callbacks, local tools, and Android Keystore credentials. Shared changes also
cover structured tool-call replay and interrupted-turn recovery. The Android
debug build passed; it was installed on the OPPO CPH2661 and the first-run
Chat and provider Settings screens were visually checked. No live provider
request or credential save was tested. Protected API-key storage is exposed
for Android; desktop/browser credential support remains open. T22 owns shared
UI/runtime changes; T31 and T32 retain desktop and broader Android acceptance.

## Standalone Desktop and Android Hosts — 2026-11-17

INFRA-1 now tracks standalone platforms with dedicated feature tasks: T31 owns
the Electron desktop host, and T32 owns the Android host. Their implementation
details are documented separately in
`implementation-details/standalone-desktop.md` and
`implementation-details/standalone-android.md`. T22 remains the shared app and
host-contract owner; neither platform task creates children for individual
fixes.

The Android app works on mobile and was installed and launched on the OPPO
CPH2661IN. Debug APK, unsigned release APK, and release AAB builds were
verified; the GitHub Actions jobs are configured but were not run remotely.
The Apple Silicon desktop DMG passed `hdiutil verify`; Windows/Linux package
builds and remote Actions results were not verified. TypeScript checking,
frozen-lockfile installation, workflow YAML parsing, and `git diff --check`
passed.

At the 16:19 platform-task snapshot, the app still used `ChatApp`,
`MockTextLLMAdapter`, and in-memory persistence. Commit `f97c608` supersedes
that implementation snapshot. Android provider connectivity, credential-save
behavior, persistence/recovery acceptance, signing, and broader platform
acceptance remain open; this does not close INFRA-1 Phase 12 or the full
Android/iOS Phase 13 criteria.

The current worktree also removes the unused `loadSessions` binding from the
shared `ChatApp` hook result; `loadSessionsOnMount` remains. T22 owns this small
UI cleanup, so it has no separate task.

## Arxivite Direction Change — 2026-09-08

Arxivite has decided not to continue the `super-chat` host migration. Its
experience with the external integration was not good: the second runtime,
adapter layers, package pin, nested build, and split persistence/session
ownership added too much coordination cost. Arxivite will bring its existing
native chatbot up to selected Obsidian AI capabilities directly, including
agentic tool calling, multi-user and multi-agent behavior, and tabbed chats.

Arxivite's T95/T101 integration work is historical and superseded. The
`integrations/arxivite/` harness remains useful as historical compatibility
evidence, but it is no longer a product adoption target. Super-chat should
keep its shared runtime generic and continue with the fixture, Obsidian, and
standalone workstreams. Arxivite-specific source, task, and acceptance records
belong in the Arxivite repository.

## Final shared-package merge closeout — 2026-09-07

The shared work was preserved and completed in task-scoped commits:
`b46731a` (agent/context/session behavior), `f9822cc` (session tabs, sender UI,
and tests), `6054c69` (Memory Bank/interface boundary), `81226f8` (pnpm 10 CI),
and `1eee16a` (review fixes for ordered inbound context). The pull request was
merged into `main` as `a4ded8d` using the Memory Bank commit format.

Final verification passed: TypeScript, 18 Vitest files / 156 tests, package
ESM/CJS/declaration build, demo build, `git diff --check`, and GitHub Build &
Test. ESLint 9 remains unavailable because the repository has no
`eslint.config.*`. `main` matches `origin/main` at `a4ded8d` and the worktree is
clean. These are package-level results only; no Arxivite source, submodule
pointer, browser acceptance, or device acceptance was changed or claimed.

## Prior synchronization checkpoint — 2026-09-07

The remote synchronization work is complete. `fix/arxivite-package-build`
contains local merge commit `1ce53d5`, with `origin/main` at `98fbfa2` as an
ancestor. TypeScript, 18 Vitest files / 152 tests, the package build, and diff
checks passed after the merge.

Arxivite `main` is clean at `c3af4ad`, and its `packages/super-chat` submodule
is clean and pinned to `98fbfa2`. The standalone tabbed-session,
participant/message, and public-interface changes were preserved for the
reconciliation session recorded above.

## Public Interface and Arxivite Adoption Boundary (2026-09-07)

T22 now owns the canonical public interface-component catalog, including
React entry points, host capabilities, lifecycle ownership, stability labels,
and cross-repository delivery rules. T19 tracks the shared package's Arxivite
compatibility and conformance view.

Arxivite T101 is the product-side adoption owner. A shared change is not
accepted in Arxivite until its exact commit is pinned through the submodule and
verified in the product. Package, integration, browser, and device evidence
remain separate. The package commits above are not claimed as Arxivite
adoption.

## Current Program: INFRA-1 Unified super-chat Application Platform

INFRA-1 is the global progress owner for the shared core, Obsidian extraction,
Obsidian host migration, package compatibility, standalone desktop, and later
mobile work. The Arxivite harness migration is superseded. T22 is its current
shared-core and host-platform workstream.

Global tracker: `tasks/INFRA-1.md`.

## 2026-09-07 Harness-Neutral Inter-user Messaging Plan — Historical

The planned first product harness was Arxivite. Its Memory Bank showed that T95
owned the merged `SuperChatApp`/`ArxiviteSuperChatHost` integration, while T78
provides participant and collaborative-session storage but explicitly leaves
direct messaging out of scope. The shared package therefore needs only an
optional messaging capability and generic inbound-message lifecycle; Arxivite
must own membership, authorization, routing, transport, and Supabase storage.
Arxivite has since retired this host migration.

This work is documented under T22/T19 in super-chat and T101/T32/T78/T95 in
Arxivite. The public interface catalog and Arxivite consumer mapping now make
the package boundary and paired delivery workflow explicit. The first
acceptance target is two authenticated Arxivite instances exchanging messages
with stable IDs, sender attribution, reconnect replay, duplicate suppression,
and membership rejection. Tabs, presence, typing indicators, read receipts,
and multi-agent routing remain separate follow-ups.

## Current Workstream: T22 Embeddable Application Platform

`super-chat` is now defined as the complete, embeddable chat application, not
only a low-level engine. It owns reusable chat mechanics and complete chat UI.
`obsidian-ai`, `arxivite`, and future standalone shells provide data and
platform capabilities through neutral host contracts.

Authoritative plan:
`implementation-details/embeddable-super-chat-platform.md`.

INFRA-1 Phases 1 and 2 are complete. Tool approval is fail-closed and engine-
owned; React uses observable snapshots instead of polling. `super-chat/contracts`
now provides optional host services without importing product platform types.
TypeScript, 111 tests, and ESM/CJS/declaration builds pass.

Phase 3 is complete and committed/pushed as `a07a18e`: sessions have stable
internal and typed external identities, versioned migration metadata, durable
turn/model history, serialized engine-owned writes, and reload recovery.

Phase 4 is complete and pushed in the follow-up checkpoint: a neutral
fixture host now mounts through `SuperChatApp`, bridges host persistence/tools/
retrieval capabilities, proves read and approval-required write flows, and
renders retrieved-source provenance. TypeScript, 122 tests, package ESM/CJS/
declaration builds, and the Vite demo build pass. The first Phase 5 lifecycle
work is now implemented and pushed in `4015d8b`: retrieval is inside the engine turn lock,
initial user-turn persistence, cancellation, host abort signaling, retrieval
status events, and durable retrieval failure/cancellation handling. The size-limited
retrieval/context work is also implemented: source validation, deduplication,
ordering, result/context limits, untrusted-evidence formatting, and durable
assembled context. Normalized retrieval outcomes, partial/warning handling,
observable React retrieval state, and latest-turn replay behavior are also
implemented. Replay reuses the persisted size-limited retrieval record by default
and supports explicit host refresh. The richer host conformance utilities and
fixture acceptance are also implemented and included in `4015d8b`.

An external Arxivite test area now loads Arxivite's real chatbot tool registry,
maps it into the current host service shape, runs a registered tool through
`ChatEngine`, and verifies retrieval provenance plus session reload with
deterministic test storage. TypeScript and 6 focused Vitest tests pass. This
does not yet test Arxivite's live Supabase/RAG/provider path or UI. Product
migrations remain deferred until their real host adapters pass acceptance.

T15 owns behavior-preserving extraction from `obsidian-ai`; T16 owns shared
agentic RAG and evidence; T18 owns the Obsidian host migration; T19 makes
Arxivite a `SuperChatApp` tool-provider harness; T21 owns release and
compatibility discipline. T17's former
"flip the Arxivite toggle" plan is retired because it would entrench
Arxivite-owned chat mechanics.

## 2026-09-06 Architecture Decision

The former PocketFlow and host-owned RAG direction is superseded. The
agentic tool-calling behavior in `obsidian-ai` is the behavioral source for
shared `super-chat`. `super-chat` owns the agent loop, composed tool providers,
agent-mediated retrieval, evidence, citations, context, memory, and replay.
Arxivite and Obsidian provide pluggable tool/data providers and platform
capabilities; neither owns a completed RAG answer or a parallel chat loop.

T25-T30 were created for the approved priority capabilities: shared agentic
tools, memory/pruning, attachments, provider switching, diagnostics, and
export/import. T15, T16, T18, T19, T21, T22, and INFRA-1 were updated to match.

## 2026-09-06 Provider Integration Implementation

Completed the first small implementation slice after a read-only survey of
`obsidian-ai`'s canonical tool registry, executor, turn coordinator, and
model-history behavior. `super-chat` now supports composed host tool
capabilities with one route per tool name, duplicate-name rejection, and
abort-signal propagation through the shared agent loop. Existing single-host
adapters remain compatible.

Verification passed: TypeScript, 16 Vitest files / 145 tests, package
ESM/CJS/declaration build, Arxivite engine harness (3 tests), and
`git diff --check`. The full 31-tool extraction, structured evidence, and live
Obsidian host acceptance remains open. Arxivite host acceptance is superseded;
the external checkout's prior readiness result remains historical evidence.

## 2026-09-07 Message Context Plan

The next `obsidian-ai` extraction follows
`implementation-details/model-history-and-context.md`. The first step keeps
every tool call and result, checks their call IDs, follows the provider
conversion already used by `obsidian-ai`, and reuses its token estimate.
Complete results remain available for storage and display; the copy sent in a
provider request may be shortened when necessary.

The first context policy is chronological history. More elaborate context
selection, exact tokenizers, and compaction are deferred until a real problem
justifies them. The single-tool-call retention defect is a required fix in
`obsidian-ai`, not behavior for super-chat to copy.

## Historical June 2026 Snapshot

The remaining content below records the June implementation session. Its
priority list is historical; T22 and the section above are current.

## Completed Tasks (This Session)
- **T20**: Fix ChatEngine Real-Time Streaming — ✅ COMPLETED (2026-06-20 11:30)
- **T14**: Port chimera-chat React UI into super-chat — ✅ COMPLETED (2026-06-20 11:40)
- **T10**: Demo App & Real-World Tests — ✅ COMPLETED (2026-06-20 11:50)
- **T6**: Multi-Agent Orchestrator Phase A — ✅ COMPLETED (2026-06-20 14:15)
- **T21 Phase 1**: GitHub Actions CI Fix — ✅ COMPLETED (2026-06-20 15:30)
  - Fixed `pnpm-workspace.yaml` invalid content (ERROR: packages field missing)
  - Removed `demo/**/*` from `tsconfig.json` (TS6059 outside rootDir)
  - Fixed unused `USER_ID` import in `Orchestrator.test.ts`
  - Added `.npmrc` with `auto-install-peers=true`
  - Added `pnpm.onlyBuiltDependencies: ["esbuild"]`
  - Build & Test passes (run ID 27867800049, 27s)
- **T21 Phase 2**: Full-Featured Demo — ✅ COMPLETED (2026-06-20 16:15)
  - Provider selector (DeepSeek, Kimi, OpenRouter, Gemini)
  - Mock mode for UI testing without API keys
  - Connection test for each provider
  - Demo scenarios (Calculate, Weather, arXiv, Web Search)
  - Visual tool flow (pending → approve → result)
  - API keys loaded from secure MacBook storage
  - Vite aliases fixed (root cause of blank page: React Refresh in dist bundles)

## Current State
- **Phase 1 (Unified Core)**: COMPLETE ✅
- **Phase 2 (Publishing Infrastructure)**: IN PROGRESS 🔄 (T21)
  - CI/CD passes ✅
  - Demo fully functional ✅
  - Pending: NPM_TOKEN secret, version tag push
- **Phase 3 (Many-Body Agent Runtime)**: PHASE A COMPLETE ✅
- **Phase 4 (Integration)**: Not started

## Next Priority Tasks
1. **T21 (finish)**: Configure `NPM_TOKEN` secret in GitHub, push version tag
2. **T6 Phase B**: Independent agent lifecycles
3. **T17**: Make super-chat default in arxivite — FASTEST WIN
4. **T15**: Port obsidian-ai mature agent logic

## System Status
- **Memory Bank**: ✅ Updated for T20, T14, T10, T21, T6 (2026-06-20)
- **Build**: ✅ tsup builds cleanly
- **Tests**: ✅ 99/99 passing
- **Git**: ✅ All committed and pushed
- **npm**: ✅ Dry-run passed, CI passes, ready to publish

## Files Created (This Session)
- `LICENSE` — MIT License
- `.github/workflows/build-release.yml` — CI/CD pipeline
- `memory-bank/tasks/T21.md` — Task specification
- `memory-bank/implementation-details/npm-ci-cd.md` — Implementation docs
- `src/core/Topology.ts` — Topology system
- `src/core/AgentInbox.ts` — Per-agent message routing
- `src/core/Orchestrator.ts` — Many-body orchestrator
- `src/core/Orchestrator.test.ts` — 18 orchestrator tests

## Implementation Docs Available
- `implementation-details/AgentLoop.md` — Architecture, data flow, message format, approval states
- `implementation-details/ToolExecutor.md` — Execution flow, registration pattern, error handling
- `implementation-details/npm-ci-cd.md` — CI/CD workflow design, secrets, versioning
- `implementation-details/Orchestrator.md` — ManyBodyOrchestrator: topology, modes, error isolation
- `implementation-details/Topology.md` — Graph theory, routing algorithms, topology implementations
- `implementation-details/EmergentBehavior.md` — Phase B/C: independent agents, emergent dynamics
- `implementation-details/architecture-design.md` — High-level architecture, goals, layers
- `implementation-details/consolidation-plan.md` — 8-step plan to unify all apps under super-chat
