# Standalone Desktop Host

## Scope and Current State

The desktop host reuses the standalone React renderer and packages it with
Capacitor Electron. Platform diagnostics are provided by a small Electron
plugin. The chat currently uses `MockTextLLMAdapter` and
`MemoryPersistenceAdapter`; a production model provider, durable local storage,
and host-OS tool calling are not connected. `App.tsx` mounts the lower-level
`ChatApp` directly; integrating through `SuperChatApp` and neutral host
contracts remains open under T31.

As of 2026-11-17, an Apple Silicon DMG was built and passed `hdiutil verify`.
The Windows/Linux build targets and CI matrix exist, but the handoff contains
no remote Actions result or Windows/Linux runtime acceptance.

## Code Structure

```text
apps/standalone/
├── src/
│   ├── main.tsx                         React entry point
│   ├── App.tsx                           Chat and diagnostics navigation
│   ├── MockTextLLMAdapter.ts              Local preview replies
│   ├── diagnostics.ts                     Capacitor diagnostics facade
│   └── screens/DiagnosticsScreen.tsx      Diagnostics UI
├── scripts/build.mjs                     Build/sync/package orchestration
├── electron/
│   ├── main.ts                           Capacitor Electron startup
│   ├── capacitor.electron.config.ts       Window and plugin configuration
│   └── electron-builder.config.js          Packaged app file layout
└── package.json                          Shared renderer and build targets

apps/desktop-diagnostics/
├── package.json                          Capacitor Electron plugin package
└── electron/dist/plugin.mjs               Read-only OS diagnostics plugin
```

The root workspace makes the desktop diagnostics package available to the
standalone app. The shared Super Chat runtime remains outside the Electron
plugin and receives no Electron types.

## Runtime Structure

```text
Electron main process
  └── createCapacitorElectronApp(config)
       └── Capacitor bridge + packaged Vite renderer
            └── React App
                 ├── ChatApp
                 │    └── ChatEngine
                 │         ├── MockTextLLMAdapter
                 │         └── MemoryPersistenceAdapter
                 └── DiagnosticsScreen
                      └── loadDiagnostics()
                           ├── Capacitor Device / App / Network plugins
                           └── SystemDiagnostics plugin
                                └── Electron net + systemPreferences
                                    + Node os APIs
```

The desktop plugin reads online reachability, host platform and release,
architecture, processor, CPU count, total/free memory, and camera/microphone/
screen permission status exposed by Electron. It does not request permissions
or send diagnostic data elsewhere.

## Build and Package Flow

```text
pnpm standalone:build:desktop:<os>:<target>
  └── apps/standalone/scripts/build.mjs
       ├── build the shared super-chat library
       ├── typecheck and build the Vite renderer
       ├── install the Electron lockfile dependencies
       ├── cap sync @capawesome/capacitor-electron
       │    └── generated renderer, plugin manifest, and runtime bridge
       └── npm run pack
            ├── compile Electron main process
            ├── vendor Capacitor Electron runtime/plugins
            └── electron-builder on the matching operating system
                 └── DMG / ZIP / NSIS / portable EXE / AppImage / DEB
```

The workflow uses macOS runners for DMG/ZIP, Windows runners for NSIS/portable
EXE, and Ubuntu runners for AppImage/DEB. Build commands and artifact paths are
listed in `apps/standalone/README.md`. Each desktop target must run on its
matching OS.

## Acceptance and Remaining Work

Verified in the handoff: the Apple Silicon DMG exists and passes
`hdiutil verify`; TypeScript checking, frozen-lockfile installation, workflow
YAML parsing, and `git diff --check` passed. The remote GitHub Actions workflow
was not run. DMG integrity verification does not establish app signing,
installation, update, or full runtime acceptance.

The remaining work is tracked by [T31](../tasks/T31.md): durable local data,
backup/recovery and lifecycle behavior; OS-protected credentials; approved
document/file access; signing and updates; and runtime acceptance on each
supported desktop OS. Keep package build, CI artifact, and manual OS evidence
separate.
