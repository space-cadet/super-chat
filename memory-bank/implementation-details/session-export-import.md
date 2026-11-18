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

## Implemented Standalone Slice — 2026-11-18

The shared source now includes archive serialization/import utilities and an
export interface. Android document output is provided by the standalone host's
Capacitor document plugin. The shared package, standalone app, and Android
debug artifact built successfully; the artifact was installed and launched.
Import/export round-trip, schema migration, conflict handling, and preservation
of tool/evidence history still need acceptance. Import remains data-only and
must not execute saved tool calls.
