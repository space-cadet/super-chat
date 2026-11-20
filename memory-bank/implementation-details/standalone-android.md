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
│   ├── host.ts                              TypeScript fallback host entry
│   ├── hosts/                               Shared composer, host entries, diagnostics adapters
│   ├── llm.ts                               Profile credentials and provider adapter
│   ├── providerSettings.ts                  Local profiles and legacy migration
│   ├── persistence.ts                       IndexedDB sessions and settings
│   ├── lifecycle.ts                         Android Capacitor lifecycle callbacks
│   ├── tools.ts                             Local calculator and time tools
│   ├── androidCredentials.ts                Android secure credential bridge
│   ├── androidDocuments.ts                  Android document export bridge
│   ├── diagnostics.ts                       Neutral diagnostics types
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
                 │    ├── Android host composition
                 │    │    ├── IndexedDB sessions/provider profiles/default
                 │    │    ├── Android Keystore credentials
                 │    │    ├── Android lifecycle and document export
                 │    │    ├── native HTTP for web search and WebDAV
                 │    │    └── calculator/time tools
                 │    └── StandaloneLLMAdapter
                 │         └── VercelLLMAdapter and configured provider
                 ├── ProviderSettingsScreen
                 │    └── profile CRUD, default, model entry, connection check
                 └── DiagnosticsScreen
                      └── Android host diagnostics service
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

## Android App Icon Assets — 2026-11-20 16:44 IST

The reusable square master is `apps/standalone/resources/icon.png`, byte-for-
byte copied from selected mockup 13 in
[`SELECTION.md`](../assets/icon-concepts/2026-11-20/SELECTION.md). Android
legacy `ic_launcher`/`ic_launcher_round` images and adaptive foreground PNGs
are resized from this master into the existing `mipmap-mdpi`, `hdpi`, `xhdpi`,
`xxhdpi`, and `xxxhdpi` folders. The adaptive-icon XML uses the same foreground
resource and a dusk-blue (`#1D3358`) background. The Capacitor app ID and
Android label remain `com.spacecadet.superchat` and `Super Chat`.

The 2026-11-20 debug build passed and installed on `.108` with `adb install -r`.
Artifact: `apps/standalone/android/app/build/outputs/apk/debug/app-debug.apk`,
6,747,703 bytes, SHA-256
`5a509a054f289276ce2289bb7b99bf78a576d3d37a97c2e4a69b2d287e560799`.
The ADB install returned `Success` and the user confirmed installation, but
ADB disconnected before post-install package or launch inspection. The new
icon's on-device appearance and replacement-install data continuity were not
checked. Monochrome/themed icons and splash/recent-app appearance remain open
under [T32](../tasks/T32.md); desktop exports remain under T31.

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

## Explicit Platform Host Composition — 2026-11-19

The renderer build now aliases `@standalone-host` to a dedicated Android
composition. `createStandaloneHost` combines shared provider profiles,
IndexedDB persistence, and tools with Android Keystore credentials, Android
lifecycle, native document export, diagnostics, and Capacitor HTTP. Web and
desktop use separate host entries and do not import the Android credential/
document plugins. `DiagnosticsScreen` uses a neutral host service; Android and
Electron select the native diagnostics adapter, while web uses browser
online/offline events. Separate web, desktop, and Android builds passed. Android
credential and document plugin markers appear only in Android; the native
`SystemDiagnostics` marker appears in Android and desktop, not web. The current
debug APK was installed on `.108`, and the user confirmed that the app works.
That confirmation did not list specific screens or flows. Credential saving,
restart recovery, live remote calls, and broader T32 acceptance remain open.

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

## Memory, Settings, Documents, and Final Install — 2026-11-18

The standalone app now includes `appSettings.ts`, an expanded
`SettingsScreen.tsx`, and an IndexedDB-backed `memory.ts` adapter. Settings has
Providers, Chat, Tools, and Memory sections. Android `ChatDocumentsPlugin`
provides native document output for exported chats. The final debug APK at
`apps/standalone/android/app/build/outputs/apk/debug/app-debug.apk` has SHA-256
`409f35e938ad3373969dc16bec1c7de4aaee454e236b5e41d9b27c0e83590005`; it
installed with non-streaming ADB install and launched on the OPPO CPH2661IN.
No live memory/tool round trip, credential save, restart recovery, or
provider-specific file acceptance was performed.
