# Agentic Runtime and Provider Plan — 2026-09-06

## Decision

PocketFlow and the host-owned chatbot RAG pipeline are obsolete for forward
work. The mature agentic tool-calling behavior in `obsidian-ai` is the
behavioral source for shared `super-chat`.

```text
user turn
  -> super-chat AgentLoop
  -> composed tool provider
  -> host data/tool handler
  -> structured result and evidence
  -> shared context/citation logic
  -> grounded response and replay record
```

Arxivite and Obsidian are pluggable providers. They supply product data,
search/fetch handlers, product actions, identity, persistence, credentials,
and navigation. They do not own intent routing, a completed RAG answer, or a
parallel chat workflow.

## Memory-Bank Changes

- Updated T15 for obsidian-ai agentic capability extraction.
- Reframed T16 as shared agentic RAG and evidence runtime.
- Updated T18 and T19 for Obsidian and Arxivite provider migrations.
- Added T25-T30 for the approved priority capability groups.
- Updated T2, T5, T13, T21, T22, INFRA-1, and the task registry.
- Added implementation details for agentic runtime, RAG/evidence, provider
  composition, capability extraction, memory, attachments, providers,
  diagnostics, and export/import.

## Historical Record

Existing session and edit records containing the former PocketFlow plan remain
unchanged. The updated authoritative documents supersede them for forward
implementation.
