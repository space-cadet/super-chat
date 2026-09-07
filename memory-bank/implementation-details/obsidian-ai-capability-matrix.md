# obsidian-ai Capability Extraction Matrix

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
          +--> Arxivite host adapter
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
