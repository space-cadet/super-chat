# Cross-Platform Host Composition

*Date: 2026-11-19 12:53:54 IST*
*Source branch: main*
*Source commit: c006a6a245918b772e35859a794378cfe4f99d84*

## Scope

The user asked whether the current context was sufficient to make the
standalone platform boundary more explicit. This session created separate web,
Android, and desktop host compositions while keeping the shared chat UI and
runtime common.

## Source changes

- Vite resolves `@standalone-host` to a target-specific entry for web, Android,
  or desktop. The root `pnpm dev` path remains the web host.
- `createStandaloneHost` composes shared IndexedDB, provider profiles, and tools
  with platform lifecycle, document, credential, diagnostics, and HTTP services.
- Web and desktop use browser visibility, downloads, and `fetch`. Android uses
  Capacitor lifecycle, Keystore credentials, native document export, and
  Capacitor HTTP.
- `DiagnosticsScreen` calls a neutral host diagnostics service. Web uses browser
  online/offline events; Android and Electron use Capacitor and their native
  `SystemDiagnostics` plugin implementations.
- Provider and web-search settings consume credentials through the selected
  host. Provider API-key profiles remain unavailable on web/desktop; web-search
  API keys remain session-only there.
- WebDAV and the deferred relay room-list check use the selected host's HTTP
  transport instead of calling Capacitor HTTP from feature screens.

## Validation

- Standalone TypeScript check passed.
- Standalone web build passed.
- Android debug APK build passed, including Vite build, Capacitor sync, and
  Gradle assembly. APK size: 7,186,880 bytes; SHA-256:
  `51c078e7c945fc9727ca4f696edd9d90ad88908845a7f132b6c342563c995ac4`.
- Installed with `adb install --no-streaming -r` on OPPO CPH2661IN at
  `192.168.1.108`. Android reports package `com.spacecadet.superchat`, version
  `0.1.0` / code 1, with install time 2026-11-19 12:50:14 device time. The user
  confirmed the app works; no specific screens or flows were listed.
- Desktop Vite renderer and macOS arm64 DMG builds passed. The 125,014,345-byte
  DMG has SHA-256
  `fc105b4d66cd03bce4816ac216af05d01e6415cf3048c3993207e5bae8026431` and
  passed `hdiutil verify`. It has not been launched or installed.
- Separate web, desktop, and Android bundle builds passed. Android credential
  and document plugin markers appear only in Android assets; the native
  `SystemDiagnostics` adapter appears in Android and desktop assets, not web.
- `git diff --check` was run for the source and Memory Bank updates.
- No tests were added or run.

## Remaining acceptance

Desktop keychain support, browser/desktop provider-secret behavior, desktop
runtime checks, Android credential save and restart recovery, and broader
device acceptance remain open. The user plans to check web and desktop. iOS has
no host implementation.
