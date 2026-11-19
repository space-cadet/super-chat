# Session Export and Import

## Round-Trip Flow

```text
ChatEngine session
      |
      v
versioned serializer
      |
      +--> Markdown export
      +--> JSON export
      |
      v
validated import envelope
      |
      +--> migrate schema
      +--> validate messages/tools/evidence
      +--> reject executable tool actions
      |
      v
host persistence adapter
```

## Dependency Graph

```text
session/turn schema --> serializer --> import validator --> migration
       |                  |                  |
       v                  v                  v
tool history        evidence/citations   host storage
```

Import must never execute tools as a side effect. Hosts control file sharing,
download, conflict resolution, and final storage.

## Implemented Standalone Slice — 2026-11-19

Standalone Settings export/import omits credentials and restores supported
sync selections and WebDAV preferences. Saved chats exchange as JSON or JSONL;
clearing history first saves a recovery copy. The host chooses file access:
Android uses its document plugin, while web and desktop use their selected
browser/desktop services. Import remains data-only and must never execute saved
tool calls.

Settings and chat round trips, schema migration, conflict handling, tool and
evidence fidelity, and recovery after restart remain unverified. Obsidian
file-format migration and rolling `data.json` backups do not apply to
IndexedDB. See [`T30`](../tasks/T30.md) and the
[`Settings port inventory`](settings-port-inventory.md).
