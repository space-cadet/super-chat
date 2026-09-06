# Agentic RAG and Evidence Runtime

## Decision

RAG is implemented through the shared agentic tool runtime. There is no
PocketFlow dependency, host-owned chatbot intent router, or opaque host method
that returns a completed answer.

## Overall Flow

```text
question
  |
  v
shared AgentLoop
  |
  +--> search tool call ------------------+
  |                                       |
  |                              host search provider
  |                                       |
  |                                       v
  |                              search result + sources
  |                                       |
  +<-- formatted tool result <------------+
  |
  +--> optional fetch/detail/PDF tool call
  |          |
  |          v
  |   host document provider
  |          |
  |          v
  |   evidence ledger + provenance
  |
  v
grounded answer with citations
```

## Components

```text
+-------------------+       +----------------------+
| AgentLoop         |------>| Retrieval tools      |
| planning/steps    |       | search/fetch/resolve |
+---------+---------+       +----------+-----------+
          |                            |
          v                            v
+---------+---------+       +----------+-----------+
| ContextAssembler  |<------| Host provider         |
| budget/compaction |       | Arxivite/Obsidian/etc. |
+---------+---------+       +-----------------------+
          |
          v
+---------+---------+       +-----------------------+
| EvidenceLedger     |------>| Citation/source UI    |
| IDs/provenance     |       | persistence/replay    |
+--------------------+       +-----------------------+
```

## Evidence Lifecycle

```text
tool call
  -> validate source identity
  -> attach capability and provider provenance
  -> deduplicate and rank
  -> apply context budget
  -> persist bounded evidence
  -> expose citations to UI and model
  -> replay saved evidence or explicitly refresh
```

## Host Boundary

```text
super-chat owns:     planning, tool loop, budgets, evidence, citations
host owns:           search index, document store, domain metadata, handlers
```

Arxivite supplies paper/PDF tools. Obsidian supplies note/document tools. The
same shared agent can combine both providers when a host makes them available.
