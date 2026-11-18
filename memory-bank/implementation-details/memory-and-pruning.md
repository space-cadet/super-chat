# Shared Memory and AI Pruning

## Memory Flow

```text
turn/session facts
       |
       v
   staged memory
       |
       +--> promote --> core memory --> prompt context
       |
       +--> reject/archive
                              |
                              v
                         searchable archive
```

## Components

```text
AgentLoop --> memory tools --> MemoryService --> host MemoryStore
    |                              |
    v                              v
context assembler <--------- tier policy
    |
    v
model prompt and persisted turn
```

## Pruning Dependencies

```text
MemoryStore --> candidate selection --> AI optimizer
     |                                      |
     +--> snapshot/audit <------------------+
     |
     +--> restore on failed or rejected prune
```

AI pruning must be explicit, auditable, bounded, and reversible.

## Implemented Standalone Slice — 2026-11-18

`src/memory/` now contains the shared three-tier store, service, tool provider,
handlers, and tool definitions. `apps/standalone/src/memory.ts` persists the
store in IndexedDB and connects it to the host. Memory Settings expose the
controls; prompt injection starts disabled, and newly captured items stay
staged until explicitly promoted to core. Activity review and snapshot restore
are available in the current source. AI pruning/deduplication and a live
provider tool round trip remain unaccepted.
