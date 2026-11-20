# obsidian-ai Capability Extraction Matrix

The [Master Delivery Plan](../master-plan.md#feature-checklist) is the canonical
feature comparison and execution checklist. This document retains the extraction
ownership model and dependency diagrams; do not maintain a second backlog here.

The [current-source mapping](obsidian-ai-source-mapping.md), checked on
2026-11-20, supplies source pointers and the 45-tool inventory. It supports the
master plan without maintaining a separate execution backlog.

## Migration Shape

```text
obsidian-ai source + tests
          |
          v
characterization tests
          |
          v
neutral super-chat mechanism
          |
          +--> Obsidian host adapter
          +--> historical Arxivite host adapter experiment
          +--> fixture provider
```

## Capability Ownership

| Capability | Shared super-chat | Host-specific remainder |
|---|---|---|
| Agent loop | loop, continuation, cancellation, retry | provider credentials |
| Tools | schema, registry, approval, execution lifecycle | vault/paper handlers |
| RAG | agentic retrieval, evidence, citation, replay | indexes and document access |
| Memory | tiers, search policy, pruning workflow | durable storage |
| Attachments | normalization, budgeting, model parts | file/provider access |
| Providers | profile model and switching | secrets and provider availability |
| Diagnostics | event schema and redaction | platform logs/sinks |
| Export/import | schema and migration | download/share/storage APIs |

## Dependency Graph

```text
agent runtime
  +--> tool providers
  +--> retrieval/evidence
  +--> memory/context
  +--> attachments
  +--> provider switching
  +--> diagnostics
  +--> persistence/export
```

Every extraction requires source characterization, shared tests, host tests,
and manual platform acceptance before old behavior is removed.
