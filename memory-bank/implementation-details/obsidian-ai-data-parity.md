# Obsidian-AI conversation data parity

*Updated: 2026-11-21 15:31:01 IST*
*Status: implemented; inbound JSON transfer accepted on Android; Markdown import is known unsupported and deferred; reverse/JSONL checks remain open.*
*Owners: T15 / T22 / T30, supporting T25 / T27 / T28 / T33 / T31 / T32.*

## Implementation and evidence — 2026-11-21 13:18:55 IST

Implemented source and browser checks at 2026-11-21 13:18:55 IST. Canonical schemas in
`src/core/conversation.ts` and `conversationTools.ts` follow Obsidian-AI `7b7e735`.
`conversationFormat.ts` converts between these saved records and the existing
engine-facing runtime types. Runtime turns, cancellation, retrieval and ownership
are outside the portable conversation value. Canonical record fields survive
loading through the runtime adapter instead of being dropped by normalization.

Android IndexedDB version 3 writes `conversation-sessions`; previous Super Chat
chat stores are not read or converted. This is a direct format cutover with no
chat migration or device reset. Local account/settings remain independent.
LocalStorage writes canonical conversation JSON and a separate runtime key.
Toolbar and Settings use the same copied reference serializer; the existing
sync upload/download serialization also uses canonical records without enabling sync.

Reference tools/results and provider metadata, context items, compaction, resolved
parts, group/remote fields, profiles/model overrides and usage survive round trips.
Replay rebuilds complete tool pairs, omits debug messages and uses resolved parts;
valid saved compaction is applied only when its source fingerprint matches.
New attachments capture resolvedParts through the stream before provider work.
Model/timing/request estimates and available provider usage use reference fields.
Imported profile IDs remain visible as unavailable when absent locally rather
than silently appearing to use the default profile. Message UI reads imported
agent attribution, usage, error and debug fields through the runtime adapter.

Evidence: 261 shared tests / 36 files and 18 standalone tests / 8 files passed;
shared TypeScript and standalone TypeScript passed; Android debug APK build passed.
Fixtures were generated using the actual reference serializer for JSON, JSONL
and Markdown. Tests cover exact serializer output, empty/multiple chats,
load/save/export preservation, runtime separation, compaction invalidation,
new attachment capture and imported continuation through engine and AI SDK.
A real browser IndexedDB save/load comparison was byte-for-byte equal to the
rich reference fixture. Lock/relogin and full page reload retained fields;
UI agent attribution/profile/usage and Settings canonical export were checked.

APK: `apps/standalone/android/app/build/outputs/apk/debug/app-debug.apk`.
The parity APK was later installed on `.128`, where the user confirmed inbound
JSON transfer. The subsequent toolbar APK is also installed and launched; see
the acceptance record below. Live provider/network behavior, Obsidian host
runtime and vault-only file access remain unverified. Format parity does not
implement group networking or every reference context feature.

## User transfer acceptance — 2026-11-21 15:31 IST

The user confirmed importing an Obsidian-AI JSON archive into Super Chat on
Android. The reverse transfer and JSONL have not yet been checked by the user.
The user reports that an Obsidian-AI Markdown export is not recognised by the
Super Chat importer and asked to defer fixing it. Markdown fixture generation
and export serialization tests do not mean Markdown import is supported.

The toolbar APK was subsequently installed and launched on `.128`; see
[Android install evidence](standalone-android.md). Visual and interaction
acceptance of the new toolbar on the device remains open.


## Decision and scope

Use Obsidian-AI's current conversation records and JSON/JSONL archive formats as
the canonical saved chat format. Reference revision:
`7b7e73560281e11e4a9a68faafc0b2f692c75b4d`.
No migration or preservation work for the previous Super Chat format is required.
This explicitly supersedes earlier migration recommendations for this format change.
The user's setup is one local person/account on Android, with no remote data.
Do not introduce hosted authentication, remote services or remote-data migration.
No destructive device reset is authorized by this plan.

## Source audit findings

| Area | Current difference | Required work |
|---|---|---|
| Session | `llmProfileId`, `llmModel`, `llmProvider`; missing reference fields | Adopt `profileId`, `modelOverrides`, `contextItems`, `compactionMetadata`, group/remote selection fields, thinking fields, hydration/count fields and defaults from reference `ChatSession`. |
| Message | `sender`, `tokenCount`; narrower declared data | Adopt reference agent attribution, remote/debug/error flags, context items, resolved parts, usage, model, timing and telemetry fields. |
| Tools | `id`/`name`, flat calls and separate results | Save reference `toolCallId`/`toolName` and paired `{call,result}` records; preserve detailed tool-result fields and provider metadata. |
| Participants | Same property name, incompatible structures | Use reference group participant fields; keep runtime human identity separately. |
| Loading | `normalizePersistedSession` rebuilds a whitelist of fields | Stop dropping reference fields on load/save/reload; validate the adopted schema. |
| Replay | Fallback history uses text and attachments | Reuse reference history reconstruction for tool pairing, resolved multimodal data and debug exclusions; connect compaction metadata. |
| UI | Reads Super Chat field names and tool arrays | Update message cards, attribution, usage, toolbar/profile selection and exports together. |
| Exchange | Toolbar serializer and Settings exporter differ | Use one reference-compatible serializer for all JSON/JSONL export routes; align Markdown rendering too. |
| Workspace | Separate standalone workspace representation | Align active/open-session state with reference `StoredChatData` where applicable. |

Important correction: successful import parsing currently does not establish
preservation. `src/core/sessionPersistence.ts` reconstructs sessions and can drop
Obsidian-AI session context, compaction, profile and group-chat fields on loading.

## Implementation order

- [x] Adopt reference types and defaults from `src/types.ts` and `src/agent/types.ts`; reuse source with platform/import adaptations only where needed.
- [x] Update session/message creation and all storage validation/read/write paths. Keep local ownership in the IndexedDB envelope, outside the conversation record.
- [x] Keep Super Chat turn/cancellation/retrieval and host bookkeeping in separate internal records rather than altering the canonical conversation schema; update relevant host contracts and adapters.
- [x] Update tool writers, model replay, resolved attachment handling, debug filtering and compaction consumption.
- [x] Update profile/model selection, group attribution, usage displays and remaining UI readers.
- [x] Consolidate toolbar, Settings, copy/export and existing sync serialization callers around the canonical format without enabling remote sync.
- [x] Verify JSON/JSONL in both directions through import, save, reload and export; verify continuation with tools and attachments.
- [x] Build Android APK and record platform checks separately from browser/unit evidence.
- [ ] Install this APK and verify Android local create/reload/import/export/continuation.

## Storage boundary

Reference archives and physical plugin storage are distinct. Obsidian-AI supports
`chatData` inside plugin `data.json`, and indexed per-session JSONL storage with
separate draft attachments. Android may retain IndexedDB as its storage mechanism
while saving reference-shaped records. Reproducing a vault directory is not needed
for conversation format parity. Vault file paths remain references; the file bytes
must exist locally for attachments to open or replay. Preserve those references
without inventing file availability.

## Acceptance

- [x] Plain, empty and multiple-session JSON and JSONL match reference structure.
- [x] Context selections, tags, drafts, draft attachments, thinking, profile/model overrides, group and remote attribution survive save/reload/export.
- [x] Compaction metadata, resolved parts, complete tool results/references, provider metadata and usage/telemetry survive unchanged where present.
- [x] Imported tool/attachment conversations continue with correctly reconstructed model input; debug messages stay excluded.
- [x] Message and tool rendering use the reference fields correctly.
- [x] All export entry points produce the same canonical shapes; local account credentials and ownership wrappers do not enter the reference archive.
- [x] New local chats still support cancellation and restart handling with internal records kept separate.

## Source locations

Reference: `src/types.ts`, `src/agent/types.ts`, `src/utils/importChat.ts`,
`src/utils/exportChat.ts`, `src/storage/ChatStorage.ts`,
`src/lib/historyBuilder.ts`, `src/context/modelHistory.ts`.
Super Chat: `src/core/types.ts`, `src/core/sessionPersistence.ts`,
`src/core/ChatEngine.ts`, `src/utils/importChat.ts`, `src/utils/exportChat.ts`,
`src/react/components/MessageBubble.tsx`, `src/react/components/ChatApp.tsx`,
`apps/standalone/src/persistence.ts`, `providerSettings.ts`, `dataManagement.ts`,
and shared persistence/host/sync adapters.
