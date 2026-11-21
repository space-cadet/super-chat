# Shared session persistence

*Last Updated: 2026-11-21 00:44:54 IST*

Phase 3 makes the `ChatEngine` the owner of session and turn state. A product
or host supplies storage operations through `PersistenceAdapter`; it does not
append messages or maintain a second copy of the conversation.

Loading, hydration, active-session selection, tab/session state, creation,
switching, in-memory unloading, persistence scheduling, archive intent, and
delete intent are shared lifecycle concerns. The host performs physical
storage operations. Unloading an inactive session from client memory is not a
durable delete operation.

## Canonical saved conversation boundary — 2026-11-21

The engine's `ChatSession` remains runtime state. Standalone persistence adapts
it to Obsidian-AI's canonical saved conversation value and stores runtime-only
state separately. No previous-format chat migration was added. See
[data parity](obsidian-ai-data-parity.md) for the schema and round-trip behavior.

## Identity

Every session has a stable `ChatSession.id` owned by `super-chat`. A host may
also provide `externalIdentity` with a namespace, product ID, and optional
version. The external value is a mapping only; it is never used as the primary
session key.

For a shared conversation, the external identity identifies the host-owned
conversation while the engine continues to own the local session lifecycle.
Inbound human messages must enter through the same engine-owned persistence
queue as local user messages. The host must not append a second copy directly.

New sessions are written immediately. The engine also writes before provider
work begins, so the submitted user message survives a reload even if the
provider or host retrieval later fails or the user cancels the turn.

## Durable record

The current record is schema version `1` and contains:

- visible `messages`, including a partial assistant message while a turn is
  streaming;
- `modelHistory`, a provider-neutral role/content history used for the next
  request;
- `turns`, with status, tool calls, tool results, structured evidence, errors,
  and the model messages produced by that turn, plus size-limited retrieval
  context, sources, outcome status, warnings, and typed errors;
- `persistence` metadata, including the schema version and migration ID.

The visible transcript and model history are deliberately separate. Tool
protocol messages can remain out of the ordinary transcript while still being
available for a valid continuation after reload.

The complete tool result may remain in the saved turn even when the copy used
in the next provider request must be shortened to fit the context limit. The
shortened copy must say that content was omitted; the saved result is not
silently replaced.

## Write ownership and lifecycle

All session writes are made by `ChatEngine.persistSession`. Writes are queued
in order and receive `SessionWriteContext.owner === "chat-engine"` plus a
reason:

```text
create -> user-message -> retrieval -> partial-output / tool-call / tool-result
       -> turn-complete, turn-cancelled, or turn-failed
```

When retrieval is enabled, the engine persists the streaming turn before the
host search starts, then saves the retrieval result before provider
work. A retrieval failure or cancellation is recorded as the terminal turn
outcome through the same engine-owned queue.

Loading a version `0` or recovered record also writes the normalized version
back through the same owner with reason `migration`.

The adapter receives a deep clone. This prevents a later in-memory mutation
from changing an earlier queued snapshot. Deletion and archive operations are
also serialized by the same engine queue.

Remote delivery adds only the minimum additional guarantees needed for a
second client: stable message IDs for deduplication, deterministic ordering by
host-provided `createdAt` plus message ID for replay, and sender metadata
preserved in the visible message while its content and role enter chronological
model history. Messages received while a turn is streaming are merged into
the completed model history before it is persisted. Delivery acknowledgements,
presence, and read receipts are deferred until a real host requires them.

## Reload, migration, and recovery

`loadSessions` normalizes every loaded record, restores the most recently
updated session as active when no active session exists, and reports:

- migrated session IDs;
- recovered session IDs where malformed messages were removed;
- skipped IDs for invalid or duplicate records.

Records without persistence metadata are treated as version `0`. Their valid
visible messages become model history and they receive version `1` metadata in
memory. Invalid records are skipped individually so one corrupt session does
not prevent other chats from loading.

## Cancellation and failure

Partial output is saved as it arrives. Cancellation marks the active turn and
partial assistant message as `cancelled`; failure records the error on the
turn and leaves the model history at the last safe user boundary. A completed
tool turn stores the tool protocol history and final assistant message needed
for the next model request.

The fixture-host slice will use these rules to prove browser reload, tool
approval, and recovery before either product migration begins.

## Replay

`ChatEngine.replayTurn` and `replayMessage` replay only the latest turn. They
append a new durable turn using the original user message, preserving the
original turn and response rather than overwriting history. If the original
turn has a persisted retrieval outcome, replay uses that size-limited context or
reproduces the saved terminal retrieval outcome without calling the host again.
`refreshRetrieval: true` explicitly enables a new host search. Older-turn
replay is rejected until a separate branching model can define how later
history should be handled.

## Planned account scope and concurrent conversations — 2026-11-21

T33 scopes private local data to an account; T22g resolves identity before
loading it and disposes the engine on account changes. The existing external
session identity maps a conversation and does not establish data ownership.
The one-write-owner rule describes each engine's local lifecycle. A shared
backend must arbitrate concurrent message writes across clients, preserve stable
IDs/order and prevent stale whole-session snapshots from losing others' input.
T22h/T33 own acknowledgements, idempotency and missed-event recovery. These are
planned requirements, not guarantees of the current snapshot adapter.
See [accounts and collaboration](accounts-and-collaboration.md).

## Local account ownership — 2026-11-21

Standalone session and settings access uses the current local owner's context.
Implementation mechanics and browser evidence are recorded in
[accounts and collaboration](accounts-and-collaboration.md). This is one local
owner, not a multi-account or remote conversation system. Platform interruption
checks remain open.
