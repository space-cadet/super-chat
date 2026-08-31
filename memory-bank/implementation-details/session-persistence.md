# Shared session persistence

Phase 3 makes the `ChatEngine` the owner of session and turn state. A product
or host supplies storage operations through `PersistenceAdapter`; it does not
append messages or maintain a second copy of the conversation.

## Identity

Every session has a stable `ChatSession.id` owned by `super-chat`. A host may
also provide `externalIdentity` with a namespace, product ID, and optional
version. The external value is a mapping only; it is never used as the primary
session key.

New sessions are written immediately. The engine also writes before provider
work begins, so the submitted user message survives a reload even if the
provider or host retrieval later fails or the user cancels the turn.

## Durable record

The current record is schema version `1` and contains:

- visible `messages`, including a partial assistant message while a turn is
  streaming;
- `modelHistory`, a provider-neutral role/content history used for the next
  request;
- `turns`, with status, tool calls, tool results, errors, and the model
  messages produced by that turn;
- `persistence` metadata, including the schema version and migration ID.

The visible transcript and model history are deliberately separate. Tool
protocol messages can remain out of the ordinary transcript while still being
available for a valid continuation after reload.

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
