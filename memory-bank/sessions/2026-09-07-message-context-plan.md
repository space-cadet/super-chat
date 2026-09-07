# T19, T22, T32, T78, T95: Correct Arxivite Harness Source and Document Inter-user Messaging Boundaries — 2026-09-07

*Last Updated: 2026-09-07 17:32:30 IST*

## Decision

Apply the principle “keep things as simple as possible, but no simpler” to
the next `obsidian-ai` extraction work.

The first shared message-context work will:

- preserve every tool call in a provider response;
- keep each tool result tied to its call ID;
- follow `obsidian-ai`'s existing provider conversion;
- keep its existing token estimator;
- retain complete tool results while shortening only the copy sent in the
  next provider request when necessary; and
- start with chronological context selection.

Advanced relevance selection, new tokenizers, and a new compaction system are
deferred until a real problem justifies them.

The single-tool-call retention problem found in `obsidian-ai` is recorded as a
fix required in that repository. Super-chat must not inherit it.

Arxivite remains the owner of provider/model selection and credentials. The
shared runtime owns message history and prepares messages for the selected
provider.

## Memory Bank Records

- Added `implementation-details/model-history-and-context.md` as the focused
  decision record.
- Updated T15, T16, T18, T19, T22, T25, T28, and INFRA-1 wording and
  subtasks where this plan affects ownership or acceptance.
- Updated the related implementation documents and current trackers.

## Scope

This section was a planning record at the time it was written. The later
reconciliation session implemented the bounded participant/message and tabbed
session slice in the shared package; no product repository was changed.

## Session Closeout — 2026-09-07 01:45:10 IST

- The message-context plan is recorded and linked from the owning task files.
- The task, implementation, session, and edit-history records are updated.
- `git diff --check` passed.
- No commit was created for that planning session. The later implementation
  was committed as `b46731a` and `f9822cc`.

Proposed commit title for this documentation work:

`(docs)T15/T25: Record message context plan`

Status: 100% complete for the planning record; implementation and the
required `obsidian-ai` fix remain open.

## Harness Correction and Messaging Boundary — 2026-09-07

The earlier harness analysis referenced the wrong Memory Bank. The first
product harness is Arxivite, so the relevant product records are Arxivite T95
for the merged shared-host integration and T78/T32 for participant and social
chat work.

The corrected boundary is now recorded in T22/T19 and the shared host,
persistence, model-context, and embeddable-platform implementation notes:
super-chat owns generic message lifecycle, sender attribution, persistence
integration, ordering, deduplication, and reconnect replay; Arxivite owns
identity, membership, authorization, transport, routing, and Supabase storage.
At that planning stage no new shared task was needed. The later approved
continuation added a focused interface catalog under the existing T22/T19
ownership and an Arxivite T101 adoption record.

## Public Interface and Adoption Continuation — 15:45:36 IST

- Added the canonical public interface-component catalog under T22.
- Defined the paired delivery workflow from a shared source commit to an exact
  Arxivite submodule-pin update and product verification.
- Assigned continuing Arxivite adoption to T101 while T19 retains shared
  compatibility and conformance tracking.
- Preserved all existing feature-branch source work; no commit or push was
  performed.

## Prior Session Closeout — 2026-09-07 16:56:00 IST

- Refreshed the remotes and merged `origin/main` into
  `fix/arxivite-package-build` as local commit `1ce53d5`; `origin/main` is at
  `98fbfa2` and is now an ancestor of the feature branch.
- Resolved the overlapping Memory Bank records and the `useChat` merge while
  restoring the saved worktree.
- Verification passed after the merge: TypeScript, 18 Vitest files / 152
  tests, package ESM/CJS/declaration build, and diff checks.
- Arxivite `main` remains clean at `c3af4ad`; its `packages/super-chat`
  submodule remains clean and exactly pinned to `98fbfa2`.
- Tabbed-session, participant/message, and public-interface work was preserved
  for the later reconciliation session.
- A temporary safety stash remains as `stash@{0}` until the restored work is
  reviewed in a later session.

That synchronization checkpoint ended with the standalone work intentionally
unpublished; the later reconciliation session completed the two package
commits and the documentation closeout.
