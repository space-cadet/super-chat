# T15/T22/T32 Settings Port Android Build and Install — 2026-11-18

*Date: 2026-11-18 19:10:41 IST*
*Branch: `main`*
*Source commit: `c006a6a245918b772e35859a794378cfe4f99d84`*
*Device: OPPO CPH2661IN at `192.168.1.108`*

## Build

Command: `pnpm --filter @super-chat/standalone build:android:debug`

The shared library build, standalone TypeScript check, web build, Capacitor
sync, and Gradle Android debug APK assembly all passed.

- APK: `apps/standalone/android/app/build/outputs/apk/debug/app-debug.apk`
- Size: 6,238,542 bytes
- SHA-256: `69ff407cce8ccaefacf8435b3ffd4a00ceb97ac82faf54faec8bebf0c8362d49`

## Install

Installed with `adb install --no-streaming -r`; ADB reported `Success`.
Package inspection confirmed `com.spacecadet.superchat`, version `0.1.0`,
`versionCode=1`, and the installed APK path on the target device.

The app was not launched or visually checked after this install. No unit tests
were run; runtime and device UI acceptance remain open.
