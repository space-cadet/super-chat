---
kind: edit_chunk
id: 20261119-015952-t15-t22-t32-settings-layout-support
created_at: 2026-11-19 01:59:52 IST
task_ids: [T15, T22, T32]
source_branch: main
source_commit: c006a6a245918b772e35859a794378cfe4f99d84
---

#### 01:59:52 IST - T15/T22/T32: Settings layout and support states
- Modified `apps/standalone/src/screens/DataManagementSections.tsx`, `ToolsDiagnosticsSections.tsx`, `HostSettingsSections.tsx`, `sections/SearchDocumentSettingsSection.tsx`, `ProviderSettingsScreen.tsx`, `SettingsScreen.tsx`, `SettingsSectionSupport.tsx`, and `styles.css` - Added responsive settings fields and action groups; marked unavailable controls with disabled styling and a red cross.
- Modified `apps/standalone/src/dataManagement.ts` - Restored sync-component selections and WebDAV preferences during settings import while excluding credentials and rejecting unsupported backends.
- Updated `memory-bank/implementation-details/settings-port-inventory.md`, `memory-bank/master-plan.md`, `memory-bank/tasks/T15.md`, `T22.md`, `T32.md`, `memory-bank/activeContext.md`, `memory-bank/session_cache.md`, and `memory-bank/sessions/2026-11-19-parallel-settings-port.md` - Recorded current support boundaries, build/install evidence, visual review, and remaining acceptance.
- Built and installed Android debug APK `2a948e40840dc1b5ff56634677f911ee19bb2e32b0fd248208758d73b4ca2353` on `.108`; the user approved the Settings layout.
