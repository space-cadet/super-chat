# Obsidian-AI Settings Port Inventory

*Updated: 2026-11-20 14:45:32 IST*
*Reference repository: `/Users/deepak/code/obsidian-ai`*
*Reference commit: `7b7e73560281e11e4a9a68faafc0b2f692c75b4d`*

This inventory records the Settings UI registered by Obsidian-AI's
`src/settings-sections/SettingsTab.ts` at the reference commit above. That tab
has 13 regular sections and two advanced sections. T15 still owns the
source-wide comparison of the rest of Obsidian-AI.


**Side-by-side status view:** [Settings comparison](settings-status-comparison.md)
— individual Obsidian-AI and Super Chat icon columns, dated 2026-11-20 15:20:01 IST.

**Implementation procedure:** [direct source reuse and compatibility](obsidian-ai-source-compatibility.md).
Work in table order from PG01; preserve reference fields and formats, record
necessary adaptations and verify each item without silently reducing scope.

## Current control-level mapping — 2026-11-20

Use the [individual Settings control checklist](settings-control-checklist.md)
for current per-control coverage: **249 entries** across all 15 registered
sections, Settings page behavior/readouts and delegated dialogs. Every literal
setting name in the section/data-health modules is accounted for; dynamic
provider, sync, telemetry, command and metric controls are expanded separately.
Source links and inspected counterpart files accompany every entry.

This is an inventory and source comparison, not completion acceptance. All
acceptance checkboxes remain open. No feature has been selected for removal or
excluded because a host differs. Source placeholders and disabled controls
remain recorded; host adaptation and behavior decisions remain open.

Corrections to the older summary below:

- Manual tag create/add/remove, filtering and counts already exist in Chat
  History; bulk generation and global normalization remain missing.
- Base instructions do not cover the reference prompt preview/copy/reset modal.
- A request-budget setting does not cover the separate selected-context budget,
  recent-message preservation, response reserve or result-replay settings.
- JSON/JSONL **archive export** does not cover the reference persistent-storage
  format selector, rolling session backup count or legacy storage migration.
- Memory budget/recovery settings exist but differ from the reference's combined
  persona budget and legacy-file backup semantics.
- Diagnostics/data-health and telemetry controls have narrower outputs in several
  places; matching section labels do not establish equivalent behavior.

The following dated summaries retain previous delivery history. Their blanket
platform exclusions and grouped “implemented” labels do not settle current
scope or supersede the individual checklist.

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
- The newly ported forms now use responsive fields, option rows and wrapping
  actions. Unsupported controls are greyed out and carry a small red × beside
  their labels. Settings import now restores sync component and WebDAV preferences;
  credentials remain excluded, API-key sync stays off, and unsupported backends
  are rejected.

Existing Provider/Chat/Tools/Memory controls remain partial. Section count does
not establish full parity. Settings-wide control search, advanced grouping,
manual/bulk tags, remaining context/compaction behavior, source-wide T15 audit,
and live WebDAV/backup acceptance remain open. The updated Settings screen was
installed and opened on `.108`; the user approved the small-screen layout. This
visual check does not establish live endpoint or data round-trip acceptance.

## Earlier section-by-section baseline (2026-11-18)

The following table records the pre-parallel-port baseline; the current update
above supersedes its implementation status for the newly ported groups.

## Section inventory

| Obsidian-AI section | Controls and behavior to account for | Super Chat status |
| --- | --- | --- |
| Provider Profiles | Add, edit, duplicate, delete, activate, and set a default profile; choose among OpenAI, Codex, Anthropic, DeepSeek, Kimi, Gemini, OpenRouter, Azure, custom/OpenAI-compatible, and OpenResponses agent providers; set model, fetch/search model lists, test connections, manage API keys, sign in/out of Codex, set provider endpoints and Azure API version, and configure OpenResponses agent ID, session key, and auto-approve. | **Partial.** Standalone has profile CRUD, default selection, per-chat provider/model selection, credentials, connection test, and custom/Ollama endpoint settings. Codex sign-in, Azure, model fetching/search, and the reference OpenResponses agent fields still need comparison. Any auto-approve equivalent must be reconciled with Super Chat's fail-closed policy. |
| Chat Defaults | Context-picker path display; full request token counts; Enter-to-send; active-note context; automatic session names and tags; tagging profile/model and normalization; bulk tagging; tab-title width and tab restoration; parallel sessions; agent prompt; sidebar and saved-chat limits; context token/message limits; request budget; recent-message preservation; response reserve; compaction thresholds; tool-result replay budget; tool-history mode. | **Partial.** Enter-to-send, draft/message estimates, full-request estimates from prepared standalone prompts, the previous-message request cap, instructions, request budget, per-chat thinking controls, automatic naming with local fallback, opt-in new-session tag suggestions with a selected profile, saved/active tab restoration, transcript scroll-position persistence, and configurable tab width are implemented. The message cap uses the shared history budgeter; older messages remain saved. Full-request counts are estimates; provider-reported usage remains separate. Manual/bulk tag management and normalization UI, retention and parallel-session controls, other context/compaction controls, and other global defaults remain open. Active-note and path display need host-aware equivalents. |
| Agent Tools | Enable tools, auto-apply edits, maximum steps, and developer mode. | **Partial.** Tool access and step limits exist. Developer mode is absent. Auto-apply must be reconciled with Super Chat's fail-closed approval policy before any equivalent is considered. |
| Integrations | Discover compatible peer-plugin providers, refresh the provider list, and enable or disable each provider. | **Partial.** Standalone has an injectable discovery/toggle bridge. No default host bridge discovers Obsidian peer plugins; the unavailable refresh action is visibly disabled. |
| AI Intelligence Layer | Enable the layer; identity-context budget; memory-core size; legacy memory-backup retention; persona and memory paths; automatic session summaries and minimum-message threshold; memory-audit tool; memory stats and counts; export memory as JSON or Markdown; refresh stats; optimize/prune memories (including AI-assisted optimization); refresh audit; open the memory folder. | **Partial/adapted.** Three-tier local memory, opt-in prompt inclusion, memory review, audit, recovery, and memory-tool settings exist. Summary scheduling, identity budget, source-file paths, memory export/optimization actions, and the reference retention/size controls still need comparison. |
| Web Search | Choose DuckDuckGo, Brave, Tavily, Exa, or SearXNG; configure the corresponding API key or self-hosted URL. | **Implemented in standalone.** Provider, key and endpoint settings connect to the copied search service and host HTTP adapter. Android keys use Keystore; browser/desktop keys last for the app session. Live provider requests remain unverified. |
| PDF Extraction | Choose automatic, server, or client extraction; set server URL and maximum pages. | **Implemented in standalone.** Method, endpoint and page limit feed the PDF service; PDF.js client extraction and composer attachments are wired. Live endpoint behavior remains unverified. |
| Multi-User Chat Relay | Relay URL and recent URL list; local-IP detection; connection test; list active rooms and join a room; default room ID; user display name; per-chat relay enablement reminder. | **Partial/deferred.** Relay defaults persist and the connection/room-list check is implemented. Local-IP detection and per-chat enablement reminder remain absent; joining rooms and broadcasting are deferred at the user's request, along with similar auxiliary features. |
| Sync Components | Independent inclusion controls for chat sessions, plugin settings, credentials, AI memory, memory audit, persona, and usage statistics. | **Implemented with an unavailable credential option.** Sessions, app settings, memory, audit, persona and count-only usage selection feed WebDAV sync. Credential transfer is disabled until a secure adapter exists. |
| Remote Storage | Enable remote storage and select backend; encryption/passphrase; auto-sync toggle; conflict strategy; direction; deletion policy; WebDAV URL, username, password/token, path prefix, test, and sync-now actions. The auto-sync toggle is disabled in the source pending verification. S3 and custom REST are shown as coming-soon choices and are not working implementations at this reference commit. | **WebDAV implemented; other choices unavailable.** Connection test and manual sync use the WebDAV adapter with encryption, direction, conflict and deletion settings. Auto-sync remains disabled pending verification; S3 and custom REST remain visibly unavailable. Live server acceptance remains open. |
| Updates | Check on startup; stable/dev release channel; auto-install stable releases; show current/last-check information; manual check; browse branch builds. | **Host-specific/unavailable in standalone.** The updater is absent, so its controls are disabled and marked. Track through desktop, Android, and Obsidian release owners; do not put Obsidian plugin update APIs in shared chat code. |
| Chat Commands | Table of built-in `!` commands handled locally by the composer, including their descriptions; these commands are not sent to the model. | **Implemented with one unavailable command.** Help, history, token estimate and context commands use the local dispatcher. Manual compaction is disabled and marked unavailable. |
| Backup & Restore | Export settings with secrets redacted by default; explicit export including secrets; import settings; import saved chats; choose legacy JSON or split JSONL storage; rolling session-backup count; migrate old chat storage; clear all chat history. | **Implemented for standalone data formats.** Settings export/import omits credentials and imports sync/WebDAV preferences; chats support JSON/JSONL, and clear-history saves a recovery copy. Secret export is disabled; Obsidian file migration and rolling data.json backups do not apply to IndexedDB. |
| Debug Mode (advanced) | Enable debug mode and choose whether exports include provider usage, request estimates, per-step breakdown, tool details, context metadata, and model/timing details. | **Implemented in standalone.** Persisted opt-in telemetry choices filter local recorded data for export; request bodies, tool arguments and results are omitted. |
| Diagnostics (advanced) | Log level, size, and retention; memory-snapshot interval; heap/DOM/session/message/usage/model/storage metrics; refresh; data-health check/report; repair-chat-data review; diagnostics export. | **Implemented with repair unavailable.** Standalone provides structured log settings/export, snapshots, metrics, data-health checks and diagnostics export. Automatic repair and Obsidian log-file rotation are disabled and marked unavailable. |

## Settings page behavior

Obsidian-AI also provides setting search with direct navigation and keyboard
selection, a show-advanced-settings switch, a section index, expand-all and
collapse-all actions, persistent collapse state for sections and nested
advanced groups, and per-section load-error messages.
Its Settings header shows the active profile, provider, model, version, branch,
and commit identifier. The Chat Defaults section also includes the agent-prompt
editor action and controls for generating tags in bulk and normalizing existing
session tags.
Super Chat now registers all 15 source sections on one scrolling page, with
section-name/description search, an index, direct navigation, expand/collapse-all
actions, and persisted section state. It also has working standalone search/PDF,
backup/import, WebDAV sync, local command, debug and diagnostics controls. The
page does not yet have source-style control-level search, a show-advanced toggle,
nested advanced groups, per-section load errors, or the reference profile/build
header. Chat Defaults still lacks bulk tag generation and normalization.

## Porting rule

Use current Obsidian-AI source as the behavior and implementation reference.
Copy complete reusable chat logic and its focused helpers/tests where imports
and contracts fit. Adapt Obsidian `Setting`, `App`, vault, workspace, `Notice`,
plugin lifecycle, credential, network, and updater calls to Super Chat UI or
host capabilities. Do not copy a host call into shared code or weaken
fail-closed tool approval just to preserve a literal file copy. Keep source-only
placeholders, such as the unavailable S3/custom storage choices, labelled as
unimplemented.

## Source pointers

- [Settings tab and section registry](../../../obsidian-ai/src/settings-sections/SettingsTab.ts)
- [Obsidian settings model](../../../obsidian-ai/src/settings.ts)
- [Section implementations](../../../obsidian-ai/src/settings-sections/)
