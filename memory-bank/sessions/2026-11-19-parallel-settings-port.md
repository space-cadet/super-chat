# T15/T22 Parallel Settings Port

*Date: 2026-11-19 01:38:26 IST*
*Source branch: main*
*Source commit: c006a6a245918b772e35859a794378cfe4f99d84*

## Parallel Settings Port — 2026-11-19

The standalone registry now contains all 15 reference sections on one scrolling
page, with a searchable section index, navigation that opens the selected
accordion, and persistent individual/expand-all/collapse-all choices.
This adds functional implementations as well as visible support boundaries:

- Web Search: copied provider service for DuckDuckGo, Brave, Tavily, Exa and
  SearXNG; standalone tool uses host HTTP. Android keys use Keystore; web and
  desktop keys remain in memory for the session.
- PDF Extraction: copied buffer/URL extractor, PDF.js 4.10.38, method/server/page
  controls, `read_pdf` tool, and injected composer PDF attachment extraction.
- Backup & Restore: settings export with secrets omitted, settings import,
  JSON/JSONL chat exchange, recovery copy before clear, reload after mutations.
- Sync Components / Remote Storage: copied source sync engine, file manager,
  cache, index, retry, identity, encryption, and WebDAV adapter; selected settings,
  memory/audit/persona and sessions are wired. Credential sync is disabled;
  usage exports session/message counts only. Auto-sync stays disabled and
  S3/custom backends remain source placeholders.
- Chat Commands: source reference copied; local dispatcher handles help,
  history, token estimates and context. Manual compaction remains unavailable.
- Debug / Diagnostics: persisted telemetry choices, selected telemetry export,
  structured log retention, periodic snapshots, metrics, data-health check and
  diagnostics export. Automatic repair remains unavailable.
- Integrations: injectable provider discovery/toggle bridge; standalone has no
  Obsidian plugin discovery implementation.
- Relay: persisted defaults and source-protocol connection/room-list test.
  Joining/broadcasting is deferred at the user's request, along with similar
  auxiliary integrations. Updates shows the missing native updater explicitly.

Existing Provider/Chat/Tools/Memory controls remain partial. Section count does
not establish full parity. Settings-wide control search, advanced grouping,
manual/bulk tags, remaining context/compaction behavior, source-wide T15 audit,
remote endpoint acceptance and device UI acceptance remain open.

## Validation

Standalone web build passed, including library build and standalone TypeScript.
Focused copied-service tests passed; final counts are recorded after integration.
No Android build/install or device visual check was performed for this pass.

Service integration validation: shared TypeScript passed; standalone web build passed
(including standalone TypeScript). Focused service regressions: 50 tests passed;
attachment integration: 4 tests passed; standalone diagnostics: 4 tests passed.
`git diff --check` passed. No live search/PDF/WebDAV endpoint or device UI check.

## Parallel Settings Android Install — 2026-11-19 01:41:47 IST

Android debug build passed, including library, standalone TypeScript, web,
Capacitor sync and Gradle assembly. Installed successfully with non-streaming
ADB replacement on verified OPPO CPH2661IN at 192.168.1.108. Package metadata
confirms com.spacecadet.superchat version 0.1.0 / versionCode 1, updated at
2026-11-19 01:41:43. APK size: 6,747,899 bytes. SHA-256:
`d78be274ac09981b26c0b329c151599e84e7435b89a37d389563db3137e51ebb`.
No post-install launch or visual acceptance performed. Relay room joining and
similar auxiliary work remain deferred by the user.

## Settings layout and availability follow-up — 2026-11-19 01:59:52 IST

Reworked Sync Components, Remote Storage, Backup & Restore, Web Search, PDF,
Integrations, Commands, Debug/Diagnostics, Relay and Updates controls into
responsive fields, option rows and wrapping action groups. Unsupported choices
are disabled, greyed out and marked with a small red ×. Added the same marker
to unavailable provider credentials, missing tag-provider setup and unavailable
runtime metrics. Settings import now restores sync-component selections and
WebDAV preferences; it keeps credential sync off and rejects S3/custom imports.

Standalone TypeScript, web build, Android debug build and `git diff --check`
passed. Installed and launched package `com.spacecadet.superchat`
version 0.1.0 / code 1 on the OPPO CPH2661IN at `.108`. APK size is 7,186,974
bytes; SHA-256 is `2a948e40840dc1b5ff56634677f911ee19bb2e32b0fd248208758d73b4ca2353`.
The Settings layout was visually checked and the user approved its appearance.
No test suite or live WebDAV/backup round trip was run; broader Android and
source-wide T15 acceptance remain open.
