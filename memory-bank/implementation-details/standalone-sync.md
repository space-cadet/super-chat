# Standalone Sync and Remote Storage

## Purpose

The standalone app reuses Obsidian-AI's synchronization engine and file-sync
components behind Super Chat's settings, persistence, and host HTTP interfaces.
The feature UI selects which data classes can be included; it does not import
Capacitor or browser-specific networking directly.

## Component Flow

```text
Settings selections
        |
        +--> chat sessions and app settings
        +--> memory, audit, and persona data
        +--> count-only usage summary
        |
        v
standalone data-management adapter
        |
        +--> SyncEngine / PluginFileSyncManager
        +--> identity, manifest/index, cache, retry, encryption
        +--> WebDAVStorageAdapter
                    |
                    v
          selected host HTTP transport
          web / Android / desktop
```

The reusable implementation lives in `src/sync/`. `SyncEngine` and
`PluginFileSyncManager` handle chat and file-backed data plans; identity,
manifest/index, cache, retry, and encryption helpers support those operations.
`WebDAVStorageAdapter` receives a transport callback, so standalone uses the
active web, Android, or desktop host's HTTP service.

## Current Standalone Behavior

- Chat sessions, app settings, memory, memory audit, and persona can be selected
  for sync.
- Usage selection includes session and message counts only.
- Credential/API-key transfer is disabled until a secure credential-transfer
  adapter is available.
- WebDAV is the implemented remote backend. S3 and custom REST remain visible
  but unavailable; automatic sync remains disabled.
- The Settings page exposes the configured WebDAV URL, account, remote path,
  encryption, direction, conflict/deletion options, connection check, and
  manual sync controls.

Settings import restores supported component selections and WebDAV preferences
without restoring credentials. These preferences do not establish that remote
data has been transferred successfully.

## Acceptance Status

Focused copied-service and integration tests passed during the Settings port.
No live WebDAV endpoint, multi-device conflict, interrupted transfer, or full
backup/restore round trip has been accepted. Keep those checks open under
[`T26`](../tasks/T26.md), [`T30`](../tasks/T30.md), and the
[`master plan`](../master-plan.md).

## Local account ownership — 2026-11-21

The current app uses one local owner. Session/settings access, credentials and
sync cache references follow that owner; implementation details are recorded in
[accounts and collaboration](accounts-and-collaboration.md). This does not add
remote account history or turn on sync. Existing WebDAV behavior remains a
separate optional feature, and live transfer/interruption acceptance is open.
