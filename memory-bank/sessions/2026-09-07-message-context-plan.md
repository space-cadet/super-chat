# T15, T16, T22, T25: Turn Output and Message Context — 2026-09-07

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

This is a planning record only. No source code or product repository was
changed in this session.

## Session Closeout — 2026-09-07 01:45:10 IST

- The message-context plan is recorded and linked from the owning task files.
- The task, implementation, session, and edit-history records are updated.
- `git diff --check` passed.
- No commit was created. The earlier source changes and these Memory Bank
  changes remain in the working tree for deliberate staging later.

Proposed commit title for this documentation work:

`(docs)T15/T25: Record message context plan`

Status: 100% complete for the planning record; implementation and the
required `obsidian-ai` fix remain open.
