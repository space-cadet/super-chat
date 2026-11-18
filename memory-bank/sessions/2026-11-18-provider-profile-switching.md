# T28/T22/T32: Provider Profiles and Per-chat Model Switching

*Date: 2026-11-18 02:13:37 IST*
*Source branch: `main`*
*Source commit at Memory Bank update: `878941dc969052431243e742d128a692765ce57a`*

## Source work

- Used Obsidian-AI's provider profile picker and per-session selection behavior
  as the reference for the standalone single-assistant chat.
- Added an optional `provider-profiles` host capability containing only
  non-secret profile summaries and the default profile ID.
- Added profile/model request options to the LLM adapter contract. The engine
  stores profile ID, provider, and model on each chat and passes them to text
  and tool-capable calls. `SuperChatApp` loads defaults before creating a new
  session and refreshes profile choices when host settings change.
- Added the active-chat provider/model picker. Each tab restores its own
  selection; changing it affects that session and is blocked while a reply is
  streaming.
- Replaced the standalone single-provider settings form with multiple named
  profiles, default selection, add/edit/duplicate/remove, model suggestions and
  manual entry, connection checks, and migration from the old setting.
- Kept API keys profile-specific in the host credential capability. Session
  records and provider-profile snapshots contain no key values.

## Source checks

- `pnpm typecheck` passed for the shared library.
- `pnpm build` passed for the shared package.
- `pnpm --filter @super-chat/standalone typecheck` passed.
- `pnpm --filter @super-chat/standalone build:android:debug` passed.
- No test suites were run. No device visual check, credential save, live
  provider request, or process-restart check was performed for this update.

## Follow-up

T28 remains in progress for cross-host tests and device acceptance. T32 remains
open for credential verification, persistence/recovery, file/document access,
signing, and broader Android acceptance. The Android build is compile/package
evidence, not installed-device acceptance.

## Later implementation and device evidence

- The toolbar was changed to keep unfinished actions visible/disabled; the
  green setup banner and title row were removed, with Settings accessible in
  the action row. Builds and ADB `install -r` updates on `.108` succeeded.
- The provider connection test previously allowed five output tokens and
  consumed only text. It now reads full stream error/finish events, recognises
  reasoning/output, disables retries, and times out after 30 seconds. The
  corrected Android build and installation succeeded.
- User screenshots `142484.jpg` and `142490.jpg`, supplied in this conversation,
  show actual OpenRouter chat replies. They also show clipped model/provider
  identity and the composer placeholder. Exact effective model, independent
  profile switching across chats, restart recovery and live tools are open.
- The user's no-hidden-UI rule applies throughout; unavailable controls must
  remain visible and explained. This overrides earlier UI-plan suggestions.

## Master-plan consolidation — 2026-11-18 10:51:45 IST

The user requested a coherent overall plan after the read-only Memory Bank
scan located scattered owners. Added `memory-bank/master-plan.md` with ordered
stages, reference-section coverage, row IDs, owner assignments, known evidence
and completion checks. Linked every existing delivery owner and the registry;
kept implementation details in existing documents. Updated INFRA-1 sequencing,
retired Arxivite criteria, T6 status consistency, UI visibility guidance and
current context. No new task IDs were created.

This is a text-primary Memory Bank. No local canonical rules/templates,
history generator or memory-update validator were found during this session's
bounded discovery. The edit chunk and links are checked directly; older text
is retained rather than regenerated from the database directory. This planning
change runs no application build, install or tests.

## Checklist format correction — 2026-11-18 10:59:33 IST

Converted the master plan to actual Markdown task checkboxes: eight stages,
sixty feature entries and five immediate actions. Preserved each feature ID,
owner, reference and current state. Full acceptance is still open, so items
remain unchecked. Documentation formatting only; no application changes.

## Shared Feature Reuse, Memory, Settings, and Final Install — 2026-11-18 14:25:11 IST

*Source branch: `main`*
*Source commit at Memory Bank update: `4222fc5ce7bfaa6bffe052fe03cd0f65741d7770`*

### Source work

- Reused Obsidian-AI feature source directly in shared Super Chat: saved-chat
  search, tabs and drafts, message selection/edit/resend/replay, thinking
  controls, provider message conversion, attachment handling, and archive
  import/export. Reuse includes components/hooks/helpers/styles where suitable;
  imports and host-specific storage/document calls are adapted at boundaries.
- Added the shared three-tier memory store/service and tools, standalone
  IndexedDB storage, memory Settings, activity review, and snapshot restore.
  Memory injection starts disabled; newly captured memories remain staged until
  promoted to core.
- Added Settings sections for Providers, Chat, Tools, and Memory. Current
  options include Enter-to-send, message timestamps/token estimates, assistant
  instructions, tool access and round limits, request budget, and memory
  controls.
- Added Android native document output for chat export through
  `ChatDocumentsPlugin`; attachment selection and provider-specific media
  behavior still need broader host acceptance.

### Verification and installation

- Shared and standalone TypeScript checks, `pnpm build`, and the Android debug
  build passed.
- Before the final memory/Settings changes, 23 test files / 187 tests passed;
  13 copied memory-store tests passed in an earlier intermediate run. No full
  test suite was run after the final memory/Settings changes.
- Final APK:
  `apps/standalone/android/app/build/outputs/apk/debug/app-debug.apk`
- SHA-256:
  `409f35e938ad3373969dc16bec1c7de4aaee454e236b5e41d9b27c0e83590005`
- `adb install --no-streaming -r` succeeded and the app launched on the OPPO
  CPH2661IN. No live memory/tool call, credential save, restart recovery, or
  final-build visual review was performed. Earlier user screenshots confirm
  basic OpenRouter replies, but not the latest memory/tool behavior.

### Remaining work

T8/T15/T22/T25/T26/T27/T28/T30/T32 remain active. Implement the remaining Settings
options next, especially tab restoration, naming/tags/retention, and outstanding
thinking/usage behavior. Search, draft persistence, provider-specific file
handling, archive round trips, live memory/tool calls, and broader Android
recovery still need their feature behavior completed or accepted. Layout issues
are handled when the user reports them. No new task IDs were created.
