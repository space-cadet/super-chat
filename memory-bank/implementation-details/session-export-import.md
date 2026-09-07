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
