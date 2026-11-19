# Super Chat standalone app

The standalone app uses the same Super Chat React interface and chat runtime in a browser, a Capacitor Android app, and a Capacitor Electron desktop app. It has configurable model providers and host tools. Each build selects a platform host composition while keeping common chat, persistence, and tool behavior shared.

## Host composition

Vite aliases `@standalone-host` to the host entry for the selected build mode:

| Target | Host services |
| --- | --- |
| Web | IndexedDB, browser visibility, browser diagnostics, browser file downloads, browser `fetch` |
| Android | Shared IndexedDB, Android lifecycle and diagnostics, Keystore credentials, native document export, Capacitor HTTP |
| Desktop | IndexedDB, window visibility, Electron diagnostics, browser file downloads, browser `fetch` |

Provider API-key profiles require protected credential storage, so they are
available on Android only until browser-session and desktop keychain behavior
are deliberately supported. Web and desktop web-search keys remain in memory
for the current app session. Browser and desktop network requests also remain
subject to the server's CORS policy.

## Build commands

Run these from the repository root:

| Target | Command | Output |
| --- | --- | --- |
| Web | `pnpm standalone:build:web` | `apps/standalone/dist/` |
| Android debug APK | `pnpm standalone:build:android:debug` | `apps/standalone/android/app/build/outputs/apk/debug/` |
| Android release APK | `pnpm standalone:build:android:release-apk` | `apps/standalone/android/app/build/outputs/apk/release/` |
| Android release AAB | `pnpm standalone:build:android:release-aab` | `apps/standalone/android/app/build/outputs/bundle/release/` |
| macOS DMG | `pnpm standalone:build:desktop:mac:dmg` | `apps/standalone/electron/dist/` |
| macOS ZIP | `pnpm standalone:build:desktop:mac:zip` | `apps/standalone/electron/dist/` |
| macOS Intel DMG | `pnpm standalone:build:desktop:mac:dmg:x64` | `apps/standalone/electron/dist/` |
| Windows NSIS installer | `pnpm standalone:build:desktop:windows:nsis` | `apps/standalone/electron/dist/` |
| Windows portable app | `pnpm standalone:build:desktop:windows:portable` | `apps/standalone/electron/dist/` |
| Linux AppImage | `pnpm standalone:build:desktop:linux:appimage` | `apps/standalone/electron/dist/` |
| Linux Debian package | `pnpm standalone:build:desktop:linux:deb` | `apps/standalone/electron/dist/` |

Each desktop target must be built on its matching OS. The GitHub Actions workflow runs each target on a matching runner and uploads its artifact. Android release artifacts are currently unsigned; signing is not configured.

## Development

- `pnpm dev` or `pnpm standalone:dev` starts the standalone browser app.
- `pnpm demo:dev` starts the separate legacy component demo.
- `pnpm standalone:run:android` builds, syncs, and launches the Android app.
- `pnpm standalone:run:desktop` builds, syncs, and launches the Electron desktop app.
- `pnpm --filter @super-chat/standalone add:android` creates the Android platform folder once.
- `pnpm --filter @super-chat/standalone add:desktop` creates the Electron platform folder and its lockfile once.

The Diagnostics screen reads device/app information, network state, and permissions. Android reports the app’s declared permission states, OS-validated internet access, processor, and memory through a read-only native plugin. Desktop reports OS, architecture, processor, memory, network reachability, and camera/microphone/screen permission status exposed by the host OS through a read-only Electron plugin. The browser preview shows the data its web APIs provide. Nothing requests permissions or sends diagnostics off-device.
