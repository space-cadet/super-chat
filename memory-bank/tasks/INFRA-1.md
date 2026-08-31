# INFRA-1: Unified super-chat Application Platform Program

*Created: 2026-08-31 22:44:08 IST*
*Last Updated: 2026-08-31 23:02:51 IST*

**Status**: 🔄 **IN PROGRESS**
**Priority**: CRITICAL
**Scope**: `super-chat`, `obsidian-ai`, `arxivite`, standalone desktop, mobile

## Program Objective

Make `super-chat` the complete, embeddable chat application used by all
products in this family.

Product repositories become hosts. They supply identity, data, storage,
retrieval, tools, navigation, credentials, and platform services through
neutral capabilities. They do not implement their own chat streaming,
sessions, tool workflow, approval state, model history, context budgeting, or
shared chat UI.

Target product integration:

```tsx
const host = useProductSuperChatHost();
return <SuperChatApp host={host} />;
```

## Authoritative References

- Architecture, ownership, contracts, and migration method:
  [`implementation-details/embeddable-super-chat-platform.md`](../implementation-details/embeddable-super-chat-platform.md)
- Shared-core execution workstream: [T22](T22.md)
- Global task registry: [`tasks.md`](../tasks.md)

When older documents conflict with this program, INFRA-1 and the embeddable
platform document take precedence.

## Global Execution Order and Progress

### Phase 1: Shared safety and state foundation

**Owner**: T22  
**Status**: ✅ Complete (2026-08-31)

- [x] Make tool execution fail closed.
- [x] Implement a real asynchronous approval state machine.
- [x] Connect approval UI to engine execution.
- [x] Cover approval, rejection, cancellation, disposal, and duplicate
      resolution.
- [x] Replace React polling with observable engine state/events.
- [x] Stabilize tool-call and approval state exposed to consumers.

**Exit criterion**: no mutating tool can run because approval infrastructure
is absent or incomplete.

**Evidence**:

- `AgentLoop` now treats approval as consent and invokes the real executor only
  after consent.
- Missing approval returns a failed tool result and never executes the handler.
- `ChatEngine` owns pending requests and exposes snapshots, subscriptions,
  approve/reject/cancel, stream cancellation, and disposal.
- React consumes engine snapshots; its disconnected resolver map and 100 ms
  polling loop are removed.
- Verification: TypeScript passed; 9 test files / 105 tests passed; ESM, CJS,
  and declaration builds passed.

### Phase 2: Capability-based host contracts

**Owner**: T22  
**Status**: 🔄 Next

- [ ] Define the root `SuperChatHost` contract.
- [ ] Define identity, persistence, credentials, tools, retrieval, documents,
      navigation, notifications, and lifecycle capabilities.
- [ ] Keep capabilities optional and explicitly discoverable.
- [ ] Add contract-test helpers.
- [ ] Ensure no Obsidian, Supabase, Electron, or Capacitor types leak into
      shared contracts.

**Exit criterion**: a host can describe available platform services without
passing raw product objects to `super-chat`.

### Phase 3: Canonical session and persistence lifecycle

**Owner**: T22  
**Status**: ⬜ Pending

- [ ] Define internal and typed external session identities.
- [ ] Establish exactly one persistence write owner.
- [ ] Define saves for user input, partial output, completed turns, tools,
      cancellation, and failures.
- [ ] Define reload, migration, versioning, and recovery behavior.

**Exit criterion**: a persisted session reloads into a valid visible transcript
and model continuation without parallel session synchronization.

### Phase 4: Fixture-host vertical slice

**Owner**: T22  
**Status**: ⬜ Pending

- [ ] Mount `SuperChatApp` with `FixtureSuperChatHost`.
- [ ] Create, persist, reload, switch, archive, and delete a session.
- [ ] Stream and cancel a response.
- [ ] Run one policy-approved read-only tool.
- [ ] Pause one write tool for explicit approval.
- [ ] Exercise approve, reject, and cancel paths.
- [ ] Render one retrieved source with provenance and citation.
- [ ] Complete the flow without engine polling.

**Exit criterion**: the complete architecture works in an ordinary browser
without Obsidian or Arxivite.

### Phase 5: Shared host-backed RAG

**Owner**: T16  
**Status**: ⬜ Pending

- [ ] Put retrieval decision and orchestration in `super-chat`.
- [ ] Normalize host retrieval results, source IDs, and provenance.
- [ ] Apply shared context budgeting, progress, citations, and replay.
- [ ] Keep domain retrieval algorithms in their host repositories.

**Exit criterion**: `enableRAG` affects the actual turn path, and provenance
survives persistence and reload.

### Phase 6: Package and compatibility discipline

**Owner**: T21  
**Status**: 🔄 In progress; may overlap Phases 2–5

- [ ] Correct pnpm 11 configuration.
- [ ] Choose one supported package-consumption model.
- [ ] Publish versioned prereleases while contracts evolve.
- [ ] Record React, AI SDK, and host compatibility ranges.
- [ ] Add clean-install/build checks for all three repositories.
- [ ] Remove stale source-versus-`dist` ambiguity.

**Exit criterion**: each host consumes a traceable artifact and passes a clean
install/build compatibility check.

### Phase 7: First obsidian-ai extraction slice

**Owner**: T15  
**Status**: ⬜ Pending; blocked by Phase 4

- [ ] Characterize one read-only and one mutating Obsidian tool.
- [ ] Extract reusable descriptors, policy, approval, execution, audit,
      persistence, and UI behavior.
- [ ] Preserve Obsidian-specific operations behind host capabilities.
- [ ] Verify shared tests and existing plugin behavior.

**Exit criterion**: the same shared read/write workflow works through the
fixture and Obsidian hosts.

### Phase 8: Obsidian host and incremental migration

**Owners**: T18 and T15  
**Status**: ⬜ Pending

- [ ] Implement `ObsidianSuperChatHost`.
- [ ] Mount `SuperChatApp` behind a reversible development path.
- [ ] Migrate provider/model behavior.
- [ ] Migrate sessions, tabs, drafts, search, and replay.
- [ ] Migrate tool, approval, audit, and result behavior.
- [ ] Migrate model history, pairing, budgets, and compaction.
- [ ] Migrate retry, cancellation, agents, mentions, usage, memory, rendering,
      and reusable settings in dependency order.
- [ ] Perform automated and manual Obsidian acceptance for every slice.

**Exit criterion**: the active plugin path uses shared chat mechanics while
vault, editor, workspace, plugin, sync, and updater behavior remain host-owned.

### Phase 9: Arxivite host harness

**Owner**: T19  
**Status**: ⬜ Pending; blocked by Phases 4–6

- [ ] Implement `ArxiviteSuperChatHost`.
- [ ] Supply identity, Supabase persistence, papers, library data, retrieval,
      tools, navigation, and authorization.
- [ ] Remove the untyped parallel-session mapping.
- [ ] Make `super-chat` the sole message/session workflow owner.
- [ ] Mount `SuperChatApp` behind the existing feature toggle.

**Exit criterion**: Arxivite's new path contains no product-owned stream loop,
assistant accumulation, tool workflow, or duplicate message persistence.

### Phase 10: Arxivite acceptance and default switch

**Owner**: T19  
**Status**: ⬜ Pending

- [ ] Verify sessions, reload, switching, streaming, and cancellation.
- [ ] Verify tools, approval, RAG, citations, and failure handling.
- [ ] Verify auth changes and responsive browser behavior.
- [ ] Verify Electron, Android, and iOS as applicable.
- [ ] Make the host path default only after acceptance.

**Exit criterion**: recorded acceptance supports changing the default without
relying on the intermediate engine path.

### Phase 11: Legacy-mechanics removal

**Owners**: T18 and T19  
**Status**: ⬜ Pending

- [ ] Remove superseded Obsidian chat mechanics after parity.
- [ ] Remove Arxivite's legacy stream, session, persistence, and shared UI
      mechanics after acceptance.
- [ ] Keep removals reversible and separate from initial integrations.

**Exit criterion**: each product has one active chat implementation.

### Phase 12: Standalone desktop host

**Owner**: To be created when Phase 8 or 10 reaches acceptance  
**Status**: ⬜ Pending

- [ ] Add local persistence, operating-system keychain, file/document access,
      lifecycle, backup/recovery, signing, and updates.
- [ ] Reuse the same `SuperChatApp` and contracts.

**Exit criterion**: a signed desktop application works without Obsidian or
Arxivite-specific dependencies.

### Phase 13: Mobile hosts

**Owner**: To be created after desktop acceptance  
**Status**: ⬜ Pending

- [ ] Add mobile credential storage, background/interruption recovery,
      file-provider access, offline behavior, sync/conflict policy, platform
      permissions, packaging, and store acceptance.

**Exit criterion**: credible Android and iOS support with platform-specific
acceptance evidence.

## Global Dependency Chain

```text
INFRA-1
  -> T22 safety, contracts, persistence, fixture host
  -> T16 shared RAG
  -> T21 versioning and compatibility
  -> T15 first Obsidian extraction
  -> T18 Obsidian host migration
  -> T19 Arxivite host and acceptance
  -> legacy removal
  -> standalone desktop
  -> mobile hosts
```

T21 may proceed in parallel with early T22 work, but product-default changes
must wait for traceable package compatibility.

## Program-Wide Rules

- `super-chat` owns reusable chat mechanics and complete chat UI.
- Hosts supply capabilities; they do not coordinate the chat workflow.
- Missing approval must never cause tool execution.
- Exactly one component owns message/session persistence per active path.
- Extract from `obsidian-ai` through characterized vertical slices, not bulk
  copying.
- Keep product-specific adapters in their product repositories.
- Keep old paths until the replacement passes recorded acceptance.
- Separate unit, contract, product, clean-build, platform, and manual evidence.
- Do not claim a phase complete because code exists; its exit criterion and
  required acceptance evidence must be satisfied.

## Program Completion Criteria

- [ ] `SuperChatApp` is the active chat application in fixture, Obsidian,
      Arxivite, and standalone desktop environments.
- [ ] Hosts are limited to data and platform capabilities.
- [ ] Tool approval is fail-closed and accepted across hosts.
- [ ] Sessions, persistence, RAG, context, tools, agents, memory, and shared UI
      have one reusable implementation.
- [ ] Obsidian and Arxivite duplicate chat mechanics are removed.
- [ ] Versioned artifacts and compatibility matrices are maintained.
- [ ] Desktop acceptance is complete; mobile completion is recorded separately
      if mobile remains outside the first program release.

## Progress Update Procedure

At the end of every related implementation session:

1. Update the owning task's checklist and evidence.
2. Update the matching INFRA-1 phase status and exit criterion.
3. Record exact commits, tests, builds, and manual/platform checks separately.
4. Update `activeContext.md`, `session_cache.md`, the session record, and
   `edit_history.md`.
5. Record remaining blockers and the next smallest executable slice.
