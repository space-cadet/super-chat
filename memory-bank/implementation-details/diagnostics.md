# Shared Diagnostics

## Event Flow

```text
turn request
  -> requestId/correlation context
  -> provider event
  -> agent/tool event
  -> retrieval/evidence event
  -> persistence event
  -> redaction
  -> snapshot, log, or export
```

## Component Diagram

```text
AgentLoop ----+
ToolExecutor -+--> DiagnosticRecorder --> Redactor --> Host sink/UI
RAG tools ----+
Persistence --+
Provider -----+
```

Diagnostics must preserve failure category and timing while excluding secrets,
credential values, and unapproved private content.
