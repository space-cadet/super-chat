# App identity priority

*Recorded: 2026-11-20 14:19:01 IST*

The user kept the master plan as the execution checklist and prioritised app
icons and consistent Android app identity. Added OP08 and a priority next-work
item, assigned Android work to T32h and matching desktop icon packaging to
T31h. No separate app-completion plan or task was created.

Checked `apps/standalone/capacitor.config.ts` and Android `values/strings.xml`:
both use Super Chat and `com.spacecadet.superchat`. Preserve that application
ID and check replacement-install data continuity, icon variants, launcher,
splash, recent apps and system app information. Artwork and runtime acceptance
remain open. No source, icon, build or installation changes were made.

## T15 source mapping and dedicated icon chat — 14:34:26 IST

Created dedicated icon-concept chat `01a1f831-92db-7192-aa47-bd8a82e8d2aa`
for several designs/palettes, with deliverables under
`memory-bank/assets/icon-concepts/2026-11-20/`. It must not change application
source or shared planning records. Creation confirms the chat started, not
that artwork has finished.

Mapped 24 source groups and all 45 exported built-in tools at reference commit
`7b7e73560281e11e4a9a68faafc0b2f692c75b4d`. Recorded the matching standalone
composition and corrected overly pessimistic history, tags, search navigation
and follow-scroll statuses. Expanded existing TL04/TL05 wording for complete
session management and agent-prompt tools. All work remains with existing
owners. The screenshot supplied by the user establishes the Settings index
appearance only. No application source edits, tests, builds or device checks
were performed. Full source/test/runtime parity remains open.

## Individual Settings control mapping — 14:45:32 IST

The user requested continued mapping without assumptions about features to keep
or leave. Added 249 acceptance entries for all 15 reference sections, page
controls/readouts and nested prompt/tag/prune/repair/Codex/build/sync dialogs.
Expanded dynamic integration, sync-category, debug-telemetry, command and metric
controls. Both conditional tag-profile rendering branches remain represented.

Compared reference source at `7b7e73560281e11e4a9a68faafc0b2f692c75b4d`
with Super Chat base `056457ab1225e4625e9d5df565e6e883fb926a62`.
No reference src files have uncommitted changes at this check. Documented
separate context/request budgets, fixed recent-history/reserve values, prompt
preview/reset gaps, source/target credential differences, archive-vs-persistent
storage format, narrower telemetry/data health and missing sync review actions.
Source statuses: 53 wired, 65 different, 114 missing, 14 disabled here,
1 disabled in source and 2 source placeholders. These are entry counts including
readouts and nested actions, not a claim of 249 distinct product features.

Updated the inventory, master plan, T15/T22 and current context. The registry
status fields did not change, so the registry was left untouched.
Every feature stays represented; no keep/drop decision, new deferral or host
exclusion was introduced. All acceptance checkboxes remain unchecked. No app
source changed and no functional tests, builds, installation or device checks
ran. Documentation checks cover literal-label completeness, stable unique IDs,
source/destination file links and Memory Bank chunk formatting.

The generic validator initially rejected the pre-existing six-column active-task
registry and its legacy status symbols. Removed the unnecessary registry summary
edit rather than reformat unrelated tasks. The focused edit chunk and unchanged
registry status rows are validated separately.

## Side-by-side Settings status table — 15:20:01 IST

The user requested saving the section list with separate Obsidian-AI and Super
Chat icon columns, dates and useful metadata. Created
`implementation-details/settings-status-comparison.md` from the existing 249
checklist entries, preserving every ID, section, difference and source status.
Included an explicit icon legend, status/section counts, source-check time,
creation/update timestamps, timezone, commits, checklist digest and maintenance
links. Obsidian-AI source-presence icons do not assert runtime acceptance.

Linked the table from the detailed checklist, inventory, master plan, T15 and
current context. No source code, tests, builds, device checks or feature-scope
changes; this is a documentation presentation update.

## Authorised implementation plan — 2026-11-20 15:40:56 IST

Updated the master plan, T15f–T15h, T22, architecture/public compatibility rules,
Settings records and current context before implementation. Created the source
compatibility record. Existing feature/platform owners remain unchanged. Resolved
the architecture's contradictory prohibition on wholesale source reuse. Begin
PG01 with source field/default/classification comparison; report progress to user.

## Icon mockup selection — 2026-11-20 15:46:29 IST

The dedicated icon chat produced and selected 16 retained mockups. The primary
is 13 (Fresh), with 14 as the reverse-colour companion and 16 as an accepted
alternate; 15 remains saved as the earlier ring treatment. See
[`SELECTION.md`](../assets/icon-concepts/2026-11-20/SELECTION.md) and gallery
README. The mockup selection is committed as `88f7ef2`; production icon source,
Android/desktop exports, package wiring, and installed/device checks remain open.
The app source and `com.spacecadet.superchat` identity were not changed.

## PG01 implementation — 2026-11-20 15:54:30 IST

Implemented the Settings display preference using the reference
`showAdvancedSettings` field name, `false` default and Boolean normalization.
Copied the source advanced section/control classification blocks unchanged
(1,166 characters). React context, IndexedDB key `standalone.settings-presentation`,
and optional settings-export `presentation` field are documented host adapters.
Current advanced controls are tagged; distinct memory/context and request-budget
semantics remain called out rather than described as equivalent. PG09 continues
to own nested advanced-group collapse.

Verification: 13 Vitest tests across four files, standalone typecheck and web
production build passed. At 390 x 844, the browser hid Debug Mode/Diagnostics by
default, showed both after enabling the preference, and retained the setting
after reload. The classification blocks matched byte-for-byte, and
`git diff --check` passed. One preview favicon request returned 404; no browser
warnings occurred. Android device acceptance is still open, so PG01's
acceptance box remains unchecked. The table advances to PG02, search setting
names and descriptions. Nothing was committed or pushed.

## Android icon build and install — 2026-11-20 16:44:12 IST

Copied selected concept 13 into `apps/standalone/resources/icon.png`; its
SHA-256 matches the selected gallery image:
`2a6bc1588efc9b6d4118e03434c903b76cd5a0e987ea778bc79a237e4d0fa7ba`.
Generated Android legacy, round and adaptive-foreground PNGs for all five
existing densities, set the adaptive background to `#1D3358`, and removed the
unused default foreground vector. The Android app ID and label remain
`com.spacecadet.superchat` and `Super Chat`.

`pnpm --filter @super-chat/standalone build:android:debug` passed through the
library build, standalone TypeScript check, Android renderer build, Capacitor
sync and Gradle debug assembly. `aapt dump badging` reports package
`com.spacecadet.superchat`, version `0.1.0` / versionCode `1`, label `Super
Chat`. The APK is
`apps/standalone/android/app/build/outputs/apk/debug/app-debug.apk`, 6,747,703
bytes, SHA-256
`5a509a054f289276ce2289bb7b99bf78a576d3d37a97c2e4a69b2d287e560799`.

An initial install attempt was rejected by Android verification. On retry,
`adb install -r` returned `Success` for the OPPO CPH2661IN at `192.168.1.108`
(`.108`); the user confirmed installation. ADB disconnected before
post-install package inspection or launch verification. The on-device icon
appearance and app-data continuity were not checked. T32h remains open for
those checks, monochrome/themed icons, splash/recent-app alignment and the
matching desktop exports. No source commit was made.
