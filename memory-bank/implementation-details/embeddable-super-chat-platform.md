# Embeddable super-chat Application Platform

*Created: 2026-08-31 22:25:18 IST*
*Last Updated: 2026-09-01 11:11:59 IST*
*Program Owner: INFRA-1*
*Shared-Core Workstream: T22*

## 1. Decision

`super-chat` will be the complete, embeddable chat application and reusable
chat runtime for all products in this family.

`arxivite`, `obsidian-ai`, and future standalone shells are hosts. A host
provides product data and platform capabilities; it does not implement chat
mechanics around `ChatEngine`.

The current Arxivite direction—constructing `ChatEngine`, iterating stream
events, accumulating assistant text, and separately saving messages—is an
intermediate integration and is not the target architecture.

## 2. Target Shape

```text
super-chat
  complete chat UI
  sessions, tabs, drafts, search, and replay
  providers, models, streaming, retry, and cancellation
  agent and multi-agent orchestration
  tools, risk descriptors, approval, and results
  context assembly, budgeting, compaction, and memory
  RAG coordination, citations, and progress
  persistence workflow and migration contracts
  diagnostics, usage, and reusable settings UI
        |
        +-- Obsidian host: vault, editor, workspace, plugin services
        +-- Arxivite host: papers, Supabase, research retrieval, navigation
        +-- Standalone host: files, database, keychain, operating-system shell
```

The intended product integration is:

```tsx
function ProductChat() {
  const host = useProductSuperChatHost();
  return <SuperChatApp host={host} />;
}
```

## 3. Ownership Rules

### super-chat owns

- The canonical session, message, turn, tool-call, and approval state models.
- The complete chat UI and its loading, error, retry, cancellation, tool,
  citation, usage, and approval states.
- Provider/model interaction and SDK insulation.
- Streaming and multi-step agent loops.
- Agent and multi-agent routing/orchestration.
- Context construction, replay policy, budgeting, compaction, and memory.
- Tool discovery, descriptors, risk policy framework, execution workflow, and
  result formatting.
- RAG orchestration: deciding when retrieval runs, incorporating returned
  context, emitting progress/citations, and recording provenance.
- When sessions and messages are loaded, saved, archived, or deleted.
- Reusable settings and diagnostics that do not depend on a product shell.

### A host owns

- Authenticated identity and product authorization facts.
- Physical persistence operations for its environment.
- Product data sources and mutations.
- Retrieval implementations and domain-specific ranking.
- Product-specific tool implementations and risk metadata.
- Navigation into product screens/documents.
- Secure credential storage and platform lifecycle primitives.
- Notifications, file pickers, platform dialogs, and shell integration.

The host supplies operations. It does not decide the chat workflow around
those operations.

## 4. Capability-Based Host Contract

Do not create one oversized mandatory adapter. Use a small root object whose
features are optional capabilities.

```ts
interface SuperChatHost {
  id: string;
  identity: IdentityCapability;
  persistence: ChatPersistenceCapability;
  credentials: CredentialCapability;

  tools?: ToolCapability;
  retrieval?: RetrievalCapability;
  documents?: DocumentCapability;
  navigation?: NavigationCapability;
  notifications?: NotificationCapability;
  lifecycle?: LifecycleCapability;
}
```

The exact method signatures must be designed from real vertical slices and
contract tests. The following rules are mandatory:

1. No imports from Obsidian, Supabase, Electron, or Capacitor in core types.
2. No raw product service containers in the host interface.
3. Capabilities report stable IDs and explicit availability.
4. Every mutation declares risk and approval requirements.
5. Unsupported capabilities are absent, not dummy implementations that throw.
6. Host errors are normalized at the boundary while preserving diagnostic
   causes for logs.
7. Cancellation and idempotency are part of mutation contracts where needed.

### Implemented Phase 2 Surface

The public `super-chat/contracts` entry point now contains optional host
services and simple checks. A plain-language guide is available at
`implementation-details/host-services.md`.

This phase only defines the shapes and checks them. It does not yet make
`ChatEngine` use a host. That requires the session saving and fixture-host work
in later phases.

### Implemented Phase 3 Surface

The engine now owns the shared session persistence workflow. Sessions have a
stable internal ID, an optional typed external identity, schema metadata, a
provider-neutral model history, and durable turn records. The engine writes
user input before provider work, saves partial output and tool lifecycle
events, records completion/cancellation/failure, and restores the most recent
session as active after reload. A serialized write queue makes the engine the
single write owner while adapters receive cloned snapshots.

Details and lifecycle reasons are documented in
`implementation-details/session-persistence.md`.

## 5. Tool Safety Contract

Current behavior executes tools when no approval callback exists. This must
be reversed before any Obsidian write tool is connected.

```text
requested -> policy check -> pending approval -> approved -> executing
                                  |                |
                                  v                v
                               rejected         result/error
```

Rules:

- Missing approval infrastructure means reject/suspend, never execute.
- `autoApply` is an explicit, visible policy choice, not a fallback.
- Tool definitions include risk, mutation/read-only classification, human
  title, preview data, source capability, and idempotency expectations.
- Approval can be cancelled when the turn, session, or host is disposed.
- The same resolved descriptor drives model schema, approval UI, policy,
  execution, audit record, and displayed result.
- Contract tests cover approve, reject, cancel, timeout/disposal, execution
  error, retry, and duplicate resolution.

## 6. Session and Persistence Contract

`super-chat` owns session lifecycle. A host persistence capability performs
storage operations but does not separately append the same messages.

Required design points:

- Stable internal session ID plus optional typed external/product identity.
- No `(session as any).productSessionId` annotations.
- One write owner per integration path.
- Save semantics for user messages, partial assistant output, completed turns,
  tool calls/results, cancellation, and failure.
- Reload reproduces the visible transcript and valid model-facing history.
- Migration/version metadata is explicit.
- Host adapters may batch or transact writes, but engine behavior cannot
  depend on a specific database.

## 7. RAG and Context Contract

`super-chat` owns orchestration; the host owns retrieval data and algorithms.

```text
user turn
  -> shared retrieval decision/policy
  -> host retrieval capability
  -> normalized results with stable source IDs and provenance
  -> shared context budgeting and prompt assembly
  -> shared citation and progress events
  -> persisted retrieval record needed for replay
```

Arxivite may retain its intent classifier, PocketFlow pipeline, Supabase data,
and paper ranking inside its retrieval capability. Obsidian may retrieve vault
notes. The standalone host may retrieve local files. UI and conversation
mechanics remain shared.

Phase 4 proved a thin `enableRAG` path through the fixture host. The first
Phase 5 lifecycle slice now establishes the engine turn lock and abort signal
before retrieval, persists the user turn first, passes cancellation through
the host adapter, emits retrieval status events, and durably records retrieval
success, failure, or cancellation. Phase 5 now also has bounded source
validation, deduplication, deterministic ordering, result/context limits,
untrusted-evidence formatting, durable assembled context, normalized outcomes,
and shared React retrieval state. Latest-turn replay now reuses persisted
bounded retrieval context by default and supports explicit host refresh.
Richer product-host conformance remains before product hosts depend on it. The
generic response conformance runner and fixture acceptance are implemented and
pushed as `4015d8b`.

## 8. Capability Extraction from obsidian-ai

`obsidian-ai` is the behavioral reference, not a source tree to copy wholesale.

### Candidate reusable capabilities

- Provider/model profiles and switching behavior.
- Session tabs, drafts, saved-session search, and replay.
- Agent and multi-agent behavior, mentions, participant identity, and routing.
- Tool registry/descriptors, approval, audit, and result presentation.
- Model-ready history construction, tool pairing, compaction, and token budget.
- Provider usage, local estimates, and diagnostics.
- Persistent memory and explicit past-session retrieval.
- Markdown, LaTeX, citations, message actions, and context presentation.
- Retry, cancellation, recovery, and error behavior.

### Must remain behind the Obsidian host

- Vault and file APIs.
- Active editor, selection, workspace leaves, and note navigation.
- Obsidian markdown renderer, notices, menus, commands, and modals.
- Plugin lifecycle, manifest, settings storage, updater, and release channel.
- Obsidian-specific sync behavior and plugin-data migration.
- Vault-writing tool implementations.

### Extraction method

For every vertical slice:

1. Trace current source and call sites in `obsidian-ai`.
2. Add characterization tests for user-visible behavior and safety.
3. Define or extend a neutral capability contract.
4. Move the reusable mechanism into `super-chat`.
5. Implement the Obsidian adapter using the existing behavior.
6. Run shared contract tests and Obsidian-focused tests.
7. Perform manual Obsidian acceptance when platform behavior is involved.
8. Only then remove the superseded Obsidian implementation.

## 9. Arxivite End State

Arxivite supplies identity, authorization, papers, bookmarks, collections,
notes, reading history, Supabase storage, research retrieval, tools, risk
metadata, navigation, and product-specific provider policy.

Arxivite must not own in the final path:

- The response streaming loop.
- Assistant-text accumulation.
- Tool event and approval state.
- Separate user/assistant message orchestration around the engine.
- A parallel chat session model synchronized by annotations.
- Duplicate chat UI mechanics.

Migration sequence:

1. Pin a known compatible `super-chat` version.
2. Implement `ArxiviteSuperChatHost` capabilities.
3. Validate session identity and one persistence owner.
4. Mount `SuperChatApp` behind the existing feature toggle.
5. Test real streaming, reload, tools, approval, RAG, citations, cancellation,
   errors, auth changes, and mobile/desktop layouts.
6. Make the host path the default only after acceptance.
7. Remove legacy mechanics in a separate reversible change.

## 10. Package Boundaries

```text
super-chat/core       shared runtime and state machines
super-chat/contracts  host capability types and contract-test helpers
super-chat/react      complete SuperChatApp plus reusable components
super-chat/adapters   generic fixture/browser/provider implementations
```

Product adapters live with their products unless genuinely generic. The
Arxivite adapter belongs in Arxivite; the Obsidian adapter belongs in
`obsidian-ai`.

## 11. Verification Layers

1. Unit tests for shared state machines and helpers.
2. Contract tests applied to every host capability implementation.
3. Fixture-host browser integration tests for complete flows.
4. Product tests in `obsidian-ai` and `arxivite`.
5. Clean-install/build tests for each dependency environment.
6. Manual Obsidian acceptance for vault/editor/workspace behavior.
7. Arxivite browser, Electron, Android, and iOS acceptance as applicable.
8. Standalone signing, updating, credential, storage, and recovery tests.

## 12. First Implementation Steps

- Fixture host and `SuperChatApp` mounting contract.
- One persisted session that survives reload.
- Streaming text and cancellation.
- One read-only tool that policy allows.
- One write tool that pauses for explicit approval.
- Approve, reject, and cancel paths.
- One retrieval result with provenance and citation rendering.
- No polling for engine state.

Do not begin the broad Obsidian migration until these steps are green.

## 13. Known Current Gaps

- Phase 1 approval and observable engine state are complete. Missing approval
  now fails closed, engine-owned decisions drive real execution, cancellation
  and disposal resolve pending requests, and React subscribes to snapshots.
- Tool risk classification and per-capability policy remain Phase 2 host-
  policy follow-up; `autoApply` is still the only explicit bypass.
- Phase 2 host service shapes and checks are complete. Session identity, one
  save owner, migration, and reload are implemented in Phase 3. Host-to-engine
  wiring and the fixture browser flow were added in Phase 4.
- Host-backed retrieval is consumed through the optional `retrieveSources`
  path. The engine now protects that path with its turn lock, initial user-turn
  persistence, cancellation signal, status events, and durable failure
  handling. A pure retrieval/context module now validates, deduplicates, orders,
  bounds, and formats host sources, and its assembled context is persisted on
  the turn. Partial results continue provider work with warnings; unavailable,
  unauthorized, malformed, and cancelled outcomes stop the turn with typed
  errors. The legacy paper-oriented RAG methods remain split from the neutral
  host contract; richer progress and product-host conformance remain open.
  `contextAdapter` remains declared but unused.
- Arxivite creates a second in-memory session, adds an untyped mapping, owns
  the stream loop, and writes messages separately.
- Arxivite's persistence and RAG adapters exist but are not wired into its
  active `ChatEngine` construction.
- Arxivite pins an older `super-chat` submodule at `7ccf5609` and relies on
  prebuilt output; the current `super-chat` checkout is `919e2db`.
- Arxivite's root application declares AI SDK `5.0.52`, while the shared
  package declares AI SDK 6. The pinned SuperChat submodule itself also
  declares AI SDK 6, so the application and shared package do not yet have one
  verified dependency environment.
- `super-chat/integrations/arxivite/` now contains a test-only external adapter
  and six passing focused tests. They load Arxivite's real chatbot registry and
  run a registered tool through the current engine, while using deterministic
  replacements for database-backed retrieval. Live product-host conformance,
  Supabase persistence, provider calls, and UI acceptance remain open.
- Package publication and cross-host compatibility checks are unfinished.

## 14. Completion Definition

T22 is complete only when `super-chat` is demonstrably the chat application in
the fixture, Obsidian, and Arxivite environments, with hosts restricted to
data/platform capabilities and no duplicate chat mechanics in active product
paths.
