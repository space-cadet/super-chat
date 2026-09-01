# T22 Phase 4 Fixture Host — 2026-09-01

## Objective

Continue from the pushed Phase 3 persistence checkpoint and prove the shared
architecture through a neutral fixture host before product migrations.

## Delivered

- Added host-to-engine bridges for persistence, tools, and retrieval.
- Added `FixtureSuperChatHost` with identity, in-memory session storage,
  deterministic streaming, a policy-approved read tool, and an
  approval-required write tool.
- Added `SuperChatApp`, which accepts a `SuperChatHost`, creates the shared
  engine, loads sessions, initializes an identity-linked first session, and
  disposes the engine with the component lifecycle.
- Added host retrieval source normalization into the turn and assistant
  message, including capability/source provenance and a retrieved-context
  model message.
- Added source/provenance rendering to `MessageBubble`.
- Added acceptance tests for host validation, read execution, pending write
  approval, retrieval provenance, persistence reload/model history,
  archive/delete, and React mounting.

## Verification

- `tsc --noEmit`: passed.
- Vitest: 13 test files, 122 tests passed.
- Pinned local tsup build: ESM, CJS, and declaration outputs passed.
- Vite demo production build: passed; only the existing large-chunk warning
  was reported.
- `git diff --check`: passed.
- The `pnpm build` wrapper attempted a non-interactive `node_modules` purge and
  stopped before running the build; the direct pinned tsup build passed.

## State and next step

Phase 3 is pushed as `a07a18e` and Phase 4 is pushed as `42c3b75`. The next
shared-core dependency is T16 Phase 5: shared host-backed RAG hardening.
Obsidian and Arxivite migrations remain deferred until their hosts pass
equivalent acceptance.

## Phase 5 Plan Verification Follow-up — 2026-09-01

The Sol-medium read-only review confirmed the Phase 5 direction and refined its
implementation order. The current Phase 4 retrieval path is useful but thin:
retrieval must move inside the engine lock and user-turn persistence,
cancellation, and failure lifecycle before budgeting and broader orchestration
are added.

The recorded plan now calls for one neutral retrieval contract, a small pure
validation/budgeting/context module, normalized partial and authorization
errors, replay-safe bounded persistence, and shared React progress/error state.
It explicitly avoids `AgentLoop` changes, a large RAG manager, and moving
Arxivite or Obsidian retrieval algorithms into `super-chat`.

The review also found a timing-sensitive `SuperChatApp` test under parallel
full-suite load: 121/122 passed in the review run while the isolated test
passed. This is recorded as a verification caveat to stabilize before the
Phase 5 all-green acceptance gate.

## T16 Phase 5 Shared Host Conformance Closeout — 2026-09-01

- Completed the lifecycle, bounded-context, normalized-outcome, React-state,
  replay, and shared retrieval-response conformance slices in `super-chat`.
- Added reusable conformance checks for legacy arrays and rich outcomes,
  including source shape, provenance ownership, duplicate identities, optional
  metadata, status/error consistency, and host exceptions.
- Added fixture-host acceptance through the shared conformance runner.
- Verified TypeScript, 16 Vitest files / 142 tests, pinned tsup ESM/CJS/
  declaration builds, and `git diff --check`.
- Pushed checkpoint `4015d8b` to `main`; `origin/main` matches and the working
  tree is clean.

Next: apply the shared retrieval conformance suite to the Arxivite and Obsidian
product hosts. Keep their ranking, vault search, storage, and platform behavior
host-owned; do not begin a default switch or legacy-mechanics removal until
product acceptance is recorded.

## T19 External Arxivite Integration Readiness — 2026-09-01

### Delivered

- Pulled Arxivite to `2822a6b5` before testing; its working tree remained clean.
- Created `super-chat/integrations/arxivite/` without changing Arxivite or
  `obsidian-ai`.
- Added a test-only external adapter that translates Arxivite's existing tool
  registry shape into the current `super-chat` host service shape.
- Loaded Arxivite's real `ToolRegistry` and chatbot tool registrations.
- Ran a real registered Arxivite bookmarks tool through the current
  `ChatEngine`.
- Verified retrieval provenance and session reload using deterministic test
  storage.
- Recorded the package facts: Arxivite pins `super-chat` at `7ccf5609`, the
  current checkout is `919e2db`, and Arxivite's root app uses AI SDK `5.0.52`
  while the shared package uses AI SDK 6.

### Verification

- Integration-folder TypeScript check: passed.
- Integration-folder Vitest: 2 files, 6 tests passed.
- Arxivite remained clean at `2822a6b5`.
- No product-repository source, submodule pointer, commit, or push was made.

### Remaining work

The test uses deterministic replacements for database-backed calls. It does
not yet prove live Supabase persistence, provider calls, Arxivite's real
PocketFlow/PDF retrieval, or UI behavior. Those remain T19/T21 work after the
package-consumption plan is approved.
