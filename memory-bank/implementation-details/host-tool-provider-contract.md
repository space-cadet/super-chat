# Host Tool Provider Contract

## Provider Composition

```text
                         +------------------+
                         | ToolRegistry     |
                         | shared resolver  |
                         +--------+---------+
                                  |
             +--------------------+--------------------+
             |                    |                    |
      +------v------+      +------v------+      +------v------+
      | built-ins   |      | Arxivite    |      | Obsidian    |
      | memory/etc. |      | papers/PDFs |      | vault/files |
      +-------------+      +-------------+      +-------------+
```

## Request Flow

```text
model tool call
  -> resolve descriptor
  -> check availability and risk
  -> request approval when required
  -> execute provider handler with signal/requestId
  -> normalize result
  -> record evidence and diagnostics
  -> return a tool result with the same call ID
```

## Dependency Rules

```text
shared core  --> neutral descriptor/result contracts
host provider --> product APIs and data
UI            --> shared snapshots and events
host shell    --> navigation, notifications, credentials, lifecycle
```

Hosts must not pass raw Obsidian, Supabase, Electron, or Capacitor objects into
shared public contracts.

The call ID check is only a small history-validity check. It does not create a
second tool workflow or coordination system.
