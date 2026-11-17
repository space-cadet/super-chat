# T31/T32: Standalone Desktop and Android Hosts

*Date: 2026-11-17*
*Source branch: `main`*
*Source commit at Memory Bank update: `bf439d293775ce1b5ef85a8de57221ddc07c591f`*

## Workstream Ownership

- T31 owns the standalone desktop application and Electron host.
- T32 owns the standalone Android application and Capacitor host.
- INFRA-1 remains the program-level owner; T22 owns shared Super Chat UI and
  host contracts.
- The new tasks group work by platform capability and release acceptance, not
  by individual bugs or fixes.

## Current App Structure

The standalone renderer is shared by web, Electron, and Android. Its current
preview entry mounts `ChatApp` directly and constructs `ChatEngine` with
`MockTextLLMAdapter` and `MemoryPersistenceAdapter`. It does not yet use the
full `SuperChatApp` and neutral host-contract path. Model providers and
host-OS tool calling are not connected.

The diagnostics screen uses Capacitor Device, App, and Network plugins plus a
registered `SystemDiagnostics` plugin. Android implements that plugin in Java;
desktop uses Electron and Node APIs in the workspace package
`apps/desktop-diagnostics`. Both adapters are read-only.

## Android Evidence

- The app was installed and launched on the OPPO CPH2661IN; the user confirms
  that it works on mobile.
- The diagnostics screen showed Wi-Fi/VPN, OS-validated internet, Android SDK
  and WebView, processor, memory, and battery readings.
- Debug APK, unsigned release APK, and release AAB builds were verified.
- Android release signing is not configured. The GitHub Actions Android jobs
  are defined but were not run remotely.
- Android baseline and device acceptance are recorded as complete subtasks in
  T32; the task remains in progress for host integration, persistence,
  recovery, credentials, file/document access, signing, and broader release
  acceptance. iOS is not claimed by T32.

## Desktop Evidence

- The Capacitor Electron host and read-only desktop diagnostics plugin are
  implemented.
- An Apple Silicon DMG was built and passed `hdiutil verify`.
- Windows/Linux package commands and matching-runner CI jobs are defined, but
  those platform artifacts and remote Actions runs were not verified.
- The desktop task remains in progress for full host-contract integration,
  persistence/recovery, protected credentials, OS file/document access,
  signing, updates, and platform acceptance.

## Shared Verification and State

The implementation handoff reports successful TypeScript checking,
frozen-lockfile installation, workflow YAML parsing, and `git diff --check`.
Unit tests and remote GitHub Actions runs were not performed. Android release
artifacts are unsigned.

At Memory Bank update time, the repository was on `main` at
`bf439d293775ce1b5ef85a8de57221ddc07c591f`. The app implementation was
uncommitted before this documentation update; no source files were changed by
this task. New Memory Bank records remain uncommitted as well.

## Remaining Work

1. Integrate the standalone app through `SuperChatApp` and neutral host
   contracts rather than direct preview wiring.
2. Add durable local sessions/settings, protected credential storage, and
   lifecycle/interruption recovery.
3. Add approved platform file/document capabilities and define offline,
   backup, and recovery behavior.
4. Configure signing and updates where applicable; run matching-runner CI and
   manual desktop/mobile acceptance.
5. Decide separately whether iOS remains in the mobile program scope.

## Shared Chat UI Cleanup — 2026-11-17

- The current worktree removes the unused `loadSessions` binding from the
  `useChat` result destructured in `src/react/components/ChatApp.tsx`;
  `loadSessionsOnMount` remains in use.
- T22 owns this shared UI cleanup. It does not need a separate task and is
  separate from the platform-specific T31/T32 acceptance work.
