# Active Context

*Last Updated: 2026-09-01 02:55:00 IST*

## Current Program: INFRA-1 Unified super-chat Application Platform

INFRA-1 is the global progress owner for the shared core, Obsidian extraction,
Obsidian host migration, Arxivite harness migration, package compatibility,
standalone desktop, and later mobile work. T22 is its current shared-core and
host-platform workstream.

Global tracker: `tasks/INFRA-1.md`.

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
slice is now implemented locally: retrieval is inside the engine turn lock,
initial user-turn persistence, cancellation, host abort signaling, retrieval
status events, and durable retrieval failure/cancellation handling. The bounded
retrieval/context slice is also implemented: source validation, deduplication,
ordering, result/context limits, untrusted-evidence formatting, and durable
assembled context. Normalized retrieval outcomes, partial/warning handling,
and observable React retrieval state are also implemented. The next Phase 5
slice is replay behavior and host conformance. Product migrations remain
deferred until the fixture evidence is carried into their hosts.

T16 now owns the verified Phase 5 host-backed RAG plan; T15 owns
behavior-preserving extraction from `obsidian-ai`; T18 owns the
Obsidian host migration; T19 makes Arxivite a `SuperChatApp` harness; T16 owns
host-backed RAG; T21 owns release and compatibility discipline. T17's former
"flip the Arxivite toggle" plan is retired because it would entrench
Arxivite-owned chat mechanics.

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
