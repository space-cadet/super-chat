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

## Standalone Diagnostics — 2026-11-19

The standalone Settings page now exposes persisted telemetry selections and
filtered export, structured log settings/retention, periodic snapshots,
metrics, data-health checks, and diagnostics export. Its screen calls a neutral
host diagnostics service: web reports browser online/offline state, while
Android and Electron use their native `SystemDiagnostics` adapters.

This UI and host-service slice does not yet implement the full shared event
pipeline drawn above. Correlated provider/agent/tool/context/retrieval/storage
events, consistent redaction and failure tracing, and cross-host tests remain
open. Focused standalone diagnostics checks passed; see
[`T29`](../tasks/T29.md) and the
[`cross-platform host session`](../sessions/2026-11-19-cross-platform-host-composition.md).
