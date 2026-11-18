# Standalone Android Host

## Scope and Current State

The Android host runs the standalone React renderer in a Capacitor WebView and
adds Android-specific system diagnostics through a registered Java plugin.
The earlier baseline mounted `ChatApp` with a local response adapter and
in-memory persistence. Commit `f97c608` now mounts `SuperChatApp` through
`standaloneHost`, with IndexedDB session/settings storage, lifecycle callbacks,
a provider adapter, local tools, and an Android secure-credential capability.
`ProviderSettingsScreen` exposes provider setup; API keys use Android Keystore
storage. The final Android debug build passed and was installed on the OPPO
CPH2661IN. Chat's first-run route and the provider Settings layout were visually
checked; no credential save or live provider request was tested. Full T32 host,
recovery, and credential acceptance remains open.

As of 2026-11-17, the app was installed and launched on the OPPO CPH2661IN, and
the user confirms it works on mobile. Debug APK, unsigned release APK, and
release AAB builds were verified. Release signing and remote Actions execution
remain open.

The 2026-11-18 source update adds multiple provider profiles, a default for new
chats, and per-chat provider/model selection. Profile details remain in local
settings; API keys use profile-specific credential IDs in Android Keystore,
while sessions persist only the chosen profile ID, provider, and model. The
chat picker restores a session's choice when switching tabs. The Android debug
build and TypeScript checks passed for this source update, but no device visual
check, credential save, or live provider request was performed.

## Code Structure

```text
apps/standalone/
├── src/
│   ├── main.tsx                            React entry point
│   ├── App.tsx                              Chat, diagnostics, and settings navigation
│   ├── host.ts                              Neutral standalone host capabilities
│   ├── llm.ts                               Profile credentials and provider adapter
│   ├── providerSettings.ts                  Local profiles and legacy migration
│   ├── persistence.ts                       IndexedDB sessions and settings
│   ├── lifecycle.ts                         Capacitor visibility callbacks
│   ├── tools.ts                             Local calculator and time tools
│   ├── androidCredentials.ts                Android secure credential bridge
│   ├── diagnostics.ts                       Capacitor diagnostics facade
│   └── screens/
│       ├── DiagnosticsScreen.tsx             Diagnostics UI
│       └── ProviderSettingsScreen.tsx        Provider setup UI
├── scripts/build.mjs                        Build/sync/Gradle orchestration
├── capacitor.config.ts                      Android application identity
└── android/
    └── app/src/main/
        ├── AndroidManifest.xml               App declaration and permissions
        └── java/com/spacecadet/superchat/
            ├── MainActivity.java              Registers native plugins
            ├── SystemDiagnosticsPlugin.java   Read-only Android snapshot
            └── SecureCredentialsPlugin.java   Android Keystore credentials
```

## Runtime Structure

```text
Android launcher
  └── MainActivity extends BridgeActivity
       ├── register SystemDiagnosticsPlugin
       └── Capacitor WebView loads the Vite renderer
            └── React App
                 ├── SuperChatApp
                 │    ├── standaloneHost
                 │    │    ├── IndexedDB sessions/provider profiles/default
                 │    │    ├── Android Keystore credentials
                 │    │    ├── lifecycle callbacks
                 │    │    └── calculator/time tools
                 │    └── StandaloneLLMAdapter
                 │         └── VercelLLMAdapter and configured provider
                 ├── ProviderSettingsScreen
                 │    └── profile CRUD, default, model entry, connection check
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
native diagnostics plugin reads system state and declared permission status;
it does not request runtime permissions. `SecureCredentialsPlugin` stores
provider secrets encrypted with an Android Keystore key. Android cloud backups
and device-to-device transfers exclude the plugin's encrypted credential
preferences because the Keystore key is device-local; older Android versions
use the matching legacy backup exclusion. Other eligible app data follows the
platform's default backup behavior, which has not yet been qualified as a
session-recovery policy. The provider and lifecycle integration is in commit
`f97c608`; the build and screen check do not verify credential storage,
persistence/recovery, or a live provider connection. `AndroidManifest.xml`
declares Internet and network-state access and points to both backup-rule
files.

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

## Later Android evidence — 2026-11-18

The toolbar and connection-test fixes were built and installed on the OPPO
CPH2661IN at `.108` during this session. User screenshots `142484.jpg` and
`142490.jpg` show OpenRouter selected and live assistant replies to Hello and
supersymmetry questions. This establishes basic live chat; the exact effective
model is not established by the clipped field. Independent chat/model switching,
credential survival after restart, and tool execution still need checks.

The screenshots also show truncated provider/model controls and a clipped
composer placeholder. Remaining improvements and all reference feature groups
are tracked in the [master plan](../master-plan.md).
