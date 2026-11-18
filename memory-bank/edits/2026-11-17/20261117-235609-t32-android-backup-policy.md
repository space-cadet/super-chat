---
kind: edit_chunk
id: 20261117-235609-t32-android-backup-policy
created_at: 2026-11-17 23:56:09 IST
task_ids: [T32]
source_branch: main
source_commit: 878941dc969052431243e742d128a692765ce57a
---

#### 23:56:09 IST - T32: Exclude Android Keystore credentials from backups
- Modified `apps/standalone/android/app/src/main/AndroidManifest.xml`; created `apps/standalone/android/app/src/main/res/xml/backup_rules.xml` and `apps/standalone/android/app/src/main/res/xml/data_extraction_rules.xml` - Excluded encrypted credential preferences from Android 12+ cloud/device-transfer backups and legacy full backups.
- Updated `memory-bank/tasks/T32.md` and `memory-bank/implementation-details/standalone-android.md` - Recorded the device-local Keystore rationale and kept IndexedDB backup/recovery acceptance open.
- Updated `memory-bank/activeContext.md`, `memory-bank/session_cache.md`, and `memory-bank/sessions/2026-11-17-standalone-platform-hosts.md` - Recorded the backup policy and noted that this change was not built or device-checked.
