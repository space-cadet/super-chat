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
