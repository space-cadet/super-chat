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

Phase 3 is pushed as `a07a18e`. Phase 4 is ready for its own commit/push after
this Memory Bank closeout. The next shared-core dependency is T16 Phase 5:
shared host-backed RAG hardening. Obsidian and Arxivite migrations remain
deferred until their hosts pass equivalent acceptance.
