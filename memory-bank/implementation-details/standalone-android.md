# Standalone Android Host

## Scope and Current State

The Android host runs the standalone React renderer in a Capacitor WebView and
adds Android-specific system diagnostics through a registered Java plugin. The
chat currently uses `MockTextLLMAdapter` and `MemoryPersistenceAdapter`; a
production provider, durable local storage, secure credential handling, and
host-OS tool calling are not connected. `App.tsx` mounts the lower-level
`ChatApp` directly; integrating through `SuperChatApp` and neutral host
contracts remains open under T32.

As of 2026-11-17, the app was installed and launched on the OPPO CPH2661IN, and
the user confirms it works on mobile. Debug APK, unsigned release APK, and
release AAB builds were verified. Release signing and remote Actions execution
remain open.

## Code Structure

```text
apps/standalone/
├── src/
│   ├── main.tsx                            React entry point
│   ├── App.tsx                              Chat and diagnostics navigation
│   ├── MockTextLLMAdapter.ts                 Local preview replies
│   ├── diagnostics.ts                        Capacitor diagnostics facade
│   └── screens/DiagnosticsScreen.tsx         Diagnostics UI
├── scripts/build.mjs                        Build/sync/Gradle orchestration
├── capacitor.config.ts                      Android application identity
└── android/
    └── app/src/main/
        ├── AndroidManifest.xml               App declaration and permissions
        └── java/com/spacecadet/superchat/
            ├── MainActivity.java              Registers the native plugin
            └── SystemDiagnosticsPlugin.java   Read-only Android snapshot
```

## Runtime Structure

```text
Android launcher
  └── MainActivity extends BridgeActivity
       ├── register SystemDiagnosticsPlugin
       └── Capacitor WebView loads the Vite renderer
            └── React App
                 ├── ChatApp
                 │    └── ChatEngine
                 │         ├── MockTextLLMAdapter
                 │         └── MemoryPersistenceAdapter
                 └── DiagnosticsScreen
                      └── loadDiagnostics()
                           ├── Capacitor Device / App / Network plugins
                           └── SystemDiagnostics.getSnapshot()
                                └── Java SystemDiagnosticsPlugin
                                     ├── Build: OS, ABI, processor
                                     ├── ConnectivityManager: transport and
                                     │   OS-validated internet access
                                     ├── ActivityManager: total/free memory
                                     └── PackageManager: declared permission
                                         status and category
```

The diagnostics screen refreshes on mount and on network status changes. The
native plugin reads system state and declared permission status; it does not
request runtime permissions. `AndroidManifest.xml` declares Internet and
network-state access.

## Build and Artifact Flow

```text
pnpm standalone:build:android:<variant>
  └── apps/standalone/scripts/build.mjs
       ├── build the shared super-chat library
       ├── typecheck and build the Vite renderer
       ├── cap sync android
       │    └── copy web assets and sync Capacitor plugins
       └── apps/standalone/android/gradlew
            ├── assembleDebug   ──> app-debug.apk
            ├── assembleRelease ─> app-release-unsigned.apk
            └── bundleRelease  ──> app-release.aab
```

The GitHub Actions Android matrix uses Ubuntu, Node 22, pnpm 10.27.0, Java 21,
Android platform 35, and build-tools 35.0.0. It uploads debug APK, release APK,
and AAB artifacts. The workflow was parsed locally but no remote Actions run
was performed in the handoff. Release artifacts are unsigned.

## Device Evidence and Remaining Work

The OPPO CPH2661IN installation and launch worked. The Diagnostics screen
showed Wi-Fi/VPN transport, OS-validated internet, Android SDK and WebView,
processor, memory, and battery readings. This is Android device acceptance for
the current baseline; it does not establish signed distribution or iOS support.

The remaining Android work is tracked by [T32](../tasks/T32.md): durable
sessions/settings, interruption and offline recovery, protected credentials,
file/document access with deliberate permission handling, signing, and broader
device/distribution acceptance. The Android task is separate from any future
iOS host task under INFRA-1.
