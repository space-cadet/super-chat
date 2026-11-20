---
title: Obsidian-AI and Super Chat Settings Status
created: 2026-11-20 15:20:01 IST
updated: 2026-11-20 15:58:54 IST
source_checked: 2026-11-20 15:54:30 IST
timezone: Asia/Kolkata
tasks: [T15, T22]
master_plan_item: OP01
reference_commit: 7b7e73560281e11e4a9a68faafc0b2f692c75b4d
super_chat_base_commit: 056457ab1225e4625e9d5df565e6e883fb926a62
---

# Settings status: Obsidian-AI and Super Chat

**Created:** 2026-11-20 15:20:01 IST

**Last updated:** 2026-11-20 15:58:54 IST

**Source comparison checked:** 2026-11-20 15:54:30 IST (UTC+05:30).

**Scope:** All 15 registered Settings sections, Settings page behavior, conditional
controls, nested dialogs and readouts. **249 entries**; these include repeated
conditional branches and dialog actions, not 249 distinct product features.

**Implementation procedure:** [direct source reuse and compatibility](obsidian-ai-source-compatibility.md).
Work in table order from PG01; preserve reference fields and formats, record
necessary adaptations and verify each item without silently reducing scope.

## How to read the status icons

| Icon | Meaning |
|---|---|
| ✅ | Corresponding control/readout and source path exist. This does **not** mean verified runtime behavior or complete parity. |
| 🔧 | Related functionality exists in Super Chat but differs from the reference. See the notes. |
| ❌ | No corresponding Super Chat control/action found in the inspected code. |
| ⏸️ | Disabled or not connected in that app. |
| 🚧 | Shown as a coming-soon/source placeholder, not an implemented capability. |

Obsidian-AI statuses describe the inspected reference source, including conditional
controls that depend on configured profiles, enabled intelligence, plugins or
other prerequisites. Super Chat statuses describe the current standalone app;
Android/web/desktop differences appear in the notes. Source presence is not a
claim of runtime correctness in either app. PG01 has since received focused
tests, a standalone typecheck, a web build and browser default/toggle/reload
checks; its Android device check and detailed acceptance remain open. No
features have been excluded or selected for removal.

## Reference and maintenance

- Execution and ownership: [master plan](../master-plan.md), OP01/T15/T22.
- Detailed requirements, source links, inspected counterpart files and owners:
  [individual control checklist](settings-control-checklist.md). Row IDs match it exactly.
- Section history: [Settings port inventory](settings-port-inventory.md).
- Session: [2026-11-20 record](../sessions/2026-11-20-app-identity-priority.md).
- Reference repository: `/Users/deepak/code/obsidian-ai`, commit
  `7b7e73560281e11e4a9a68faafc0b2f692c75b4d`.
- Super Chat baseline for the original table: commit
  `056457ab1225e4625e9d5df565e6e883fb926a62`. PG01 was rechecked at current
  HEAD `88f7ef222a69854399f6cb6378adb55d3d665981`, plus the uncommitted PG01
  implementation and current Memory Bank updates.
- Checklist SHA-256: `c3e6ca790ded8b33ab9082a33981a724f596a3f47c55f0334713b1de4c30bff7`.

When a control is implemented or rechecked, update its detailed checklist entry
and this table together; update the timestamp and record the actual verification.
Keep source comparisons separate from runtime acceptance and preserve unresolved
host differences. Do not infer keep/drop decisions from any status icon.

## Status counts

| App | ✅ Source present / wired | 🔧 Different | ❌ Missing | ⏸️ Disabled | 🚧 Placeholder |
|---|---:|---:|---:|---:|---:|
| Obsidian-AI | 246 | 0 | 0 | 1 | 2 |
| Super Chat | 54 | 65 | 113 | 15 | 2 |

## Section index

| Section | Entries |
|---|---:|
| [Settings page](#settings-page) | 17 |
| [Provider Profiles](#provider-profiles) | 33 |
| [Chat Defaults](#chat-defaults) | 48 |
| [Agent Tools](#agent-tools) | 4 |
| [Integrations](#integrations) | 4 |
| [AI Intelligence Layer](#ai-intelligence-layer) | 25 |
| [Web Search](#web-search) | 5 |
| [PDF Extraction](#pdf-extraction) | 3 |
| [Multi-User Chat Relay](#multi-user-chat-relay) | 9 |
| [Sync Components](#sync-components) | 7 |
| [Remote Storage](#remote-storage) | 28 |
| [Updates](#updates) | 10 |
| [Chat Commands](#chat-commands) | 7 |
| [Backup & Restore](#backup--restore) | 14 |
| [Debug Mode](#debug-mode) | 7 |
| [Diagnostics](#diagnostics) | 28 |

## Settings page

| ID | Setting / action / readout | Obsidian-AI | Super Chat | Notes / differences |
|---|---|:---:|:---:|---|
| PG01 | Show advanced settings | ✅ | ✅ | Default-off preference reveals the two advanced sections and currently mapped advanced controls; source classification is copied unchanged. Stored separately under an IndexedDB key and carried by settings export/import. PG09 owns nested advanced-group collapse. Web behavior/reload checked; Android device check and full acceptance remain open. |
| PG02 | Search names, descriptions and sections | ✅ | 🔧 | Standalone searches section label/subtitle only; reference indexes individual setting names/descriptions too. |
| PG03 | Search suggestion keyboard selection | ✅ | ❌ | Reference Arrow/Enter/Escape selection and direct setting focus need equivalent behavior; section index buttons alone do not establish it. |
| PG04 | Search result highlighting and reveal hidden setting | ✅ | ❌ | Reference highlights matches and reveals target section/advanced state; standalone navigates sections only. |
| PG05 | Section index navigation | ✅ | ✅ | Standalone section buttons open and scroll to selected section; verify focus/keyboard and state persistence. |
| PG06 | Expand all sections | ✅ | ✅ | Standalone expands all section IDs and persists state; compare advanced-group behavior. |
| PG07 | Collapse all sections | ✅ | ✅ | Standalone collapses all and persists state; compare focus while collapsing. |
| PG08 | Individual section collapse state | ✅ | ✅ | Accordion state is persisted in IndexedDB; reference stores it through plugin Settings. |
| PG09 | Nested advanced groups and collapse persistence | ✅ | ❌ | No standalone nested groups corresponding to source classification and collapse state. |
| PG10 | Per-section load failure and remaining-section isolation | ✅ | ❌ | Standalone has individual async errors but no equivalent section render exception boundary for every section. |
| PG11 | Settings save event and runtime refresh | ✅ | 🔧 | Reference updates chat API and broadcasts settings-changed; standalone uses save callbacks and some actions reload the app. Check propagation for every control. |
| PG12 | Active profile | ✅ | ❌ | No equivalent read-only profile/build field in the standalone Settings header; retain it for comparison. |
| PG13 | Active provider | ✅ | ❌ | No equivalent read-only profile/build field in the standalone Settings header; retain it for comparison. |
| PG14 | Active model | ✅ | ❌ | No equivalent read-only profile/build field in the standalone Settings header; retain it for comparison. |
| PG15 | App version | ✅ | ❌ | No equivalent read-only profile/build field in the standalone Settings header; retain it for comparison. |
| PG16 | Build branch | ✅ | ❌ | No equivalent read-only profile/build field in the standalone Settings header; retain it for comparison. |
| PG17 | Build commit and link | ✅ | ❌ | No equivalent read-only profile/build field in the standalone Settings header; retain it for comparison. |

## Provider Profiles

| ID | Setting / action / readout | Obsidian-AI | Super Chat | Notes / differences |
|---|---|:---:|:---:|---|
| PP01 | Add profile | ✅ | ✅ | Standalone creates a draft and saves a new ID; check default assignment. |
| PP02 | Edit/select profile | ✅ | ✅ | Selecting profile loads editable metadata; saved secrets are not read back. |
| PP03 | Duplicate profile | ✅ | 🔧 | Standalone duplicates metadata but requires API-key reentry; reference duplicates the profile record. |
| PP04 | Delete profile | ✅ | 🔧 | Standalone confirms and removes key; inspect reference default fallback and deletion semantics. |
| PP05 | Set default profile | ✅ | ✅ | Default for new chats is persisted; reference active/default semantics need multi-chat verification. |
| PP06 | Profile status and credential readiness | ✅ | 🔧 | Standalone displays saved/default and credential capability state; reference per-profile readiness has more states. |
| PP07 | Profile name | ✅ | ✅ | Editable persisted name; compare constraints and empty fallback. |
| PP08 | Provider choice | ✅ | 🔧 | Reference choices: OpenAI, Codex, Anthropic, DeepSeek, Kimi, Gemini, OpenRouter, Azure, custom/OpenAI-compatible and Agent/OpenResponses. Standalone excludes Azure and lacks Codex/agent fields. All options remain recorded. |
| PP09 | Manual model ID | ✅ | ✅ | Standalone manual ID with static suggestions; persistence and profile switching need checking. |
| PP10 | Fetch models | ✅ | ❌ | No provider-backed fetch/reload models button. |
| PP11 | Search fetched model list | ✅ | ❌ | No equivalent fetched-list search control. |
| PP12 | Provider-scoped model cache | ✅ | ❌ | Static suggestions are not the reference fetched cache and provider isolation workflow. |
| PP13 | API key entry | ✅ | 🔧 | Android stores via credential capability; web/desktop key saving disabled. Reference editable saved-key behavior differs. |
| PP14 | Show/hide API key | ✅ | ❌ | No reveal toggle for saved/new provider key. |
| PP15 | Copy API key | ✅ | ❌ | No key copy action. Both key actions remain recorded; no product decision made. |
| PP16 | Endpoint override | ✅ | 🔧 | Standalone endpoint field only custom/Ollama; reference exposes endpoint for every non-Codex provider. |
| PP17 | Azure endpoint | ✅ | ❌ | Azure excluded from standalone catalog; record endpoint requirement independently. |
| PP18 | Azure API version | ✅ | ❌ | No azureApiVersion field. |
| PP19 | Codex sign in/reconnect | ✅ | ❌ | No account sign-in/reconnect flow in standalone Settings. |
| PP20 | Codex sign out | ✅ | ❌ | No account sign-out flow. |
| PP21 | Codex account connection state | ✅ | ❌ | No corresponding connected/account state. |
| PP22 | OpenResponses agent ID | ✅ | ❌ | No agentId field or equivalent provider configuration. |
| PP23 | OpenResponses session key | ✅ | ❌ | No sessionKey field. |
| PP24 | OpenResponses auto-approve tools | ✅ | ❌ | No remote-agent autoApprove control; keep separate from local auto-apply and policy decisions. |
| PP25 | OpenResponses max steps | ✅ | ❌ | No provider-specific 1–50 maxSteps slider; global local-tool rounds is different. |
| PP26 | Test profile connection | ✅ | 🔧 | Save & test persists before checking; reference has saved-profile and agent-draft tests. No live request run in this audit. |
| PP27 | Save edited profile | ✅ | ✅ | Save persists metadata/credentials using host capability; compare errors and unchanged secrets. |
| PP28 | Cancel profile edit | ✅ | ❌ | No explicit Cancel reverting the draft; choosing another profile is not recorded as equivalent. |
| PP29 | Codex dialog: Start device sign-in | ✅ | ❌ | Start authorization and display one-time code; per-profile secure credentials. No equivalent standalone dialog. |
| PP30 | Codex dialog: Copy one-time code | ✅ | ❌ | Clipboard action for authorization code with feedback. No equivalent standalone dialog. |
| PP31 | Codex dialog: Open verification page | ✅ | ❌ | Verification URI link for browser authorization. No equivalent standalone dialog. |
| PP32 | Codex dialog: Cancel device sign-in | ✅ | ❌ | Cancel polling/authorization and report cancellation. No equivalent standalone dialog. |
| PP33 | Codex dialog: Finish connected sign-in | ✅ | ❌ | Connected state closes modal; ensure models refresh after authorization. No equivalent standalone dialog. |

## Chat Defaults

| ID | Setting / action / readout | Obsidian-AI | Super Chat | Notes / differences |
|---|---|:---:|:---:|---|
| CD01 | Context picker path display | ✅ | ❌ | No equivalent path-display setting or context picker in standalone. Reference choices are never/always/duplicates; host-independent behavior and resource naming remain to map. |
| CD02 | Show full request token count | ✅ | 🔧 | Full-request estimate toggle exists; estimate coverage differs and does not establish provider usage or exact payload parity. |
| CD03 | Press Enter to send | ✅ | ✅ | Persisted pressEnterToSend reaches composer. Standalone help also documents Ctrl/Cmd+Enter. Check keyboard behavior against reference call sites. |
| CD04 | Include active note | ✅ | ❌ | No active-resource inclusion toggle. Reference description itself says when chat context is implemented; trace actual reference runtime before claiming it works there. |
| CD05 | Auto-name sessions | ✅ | ✅ | autoNameSessions persists and ChatApp calls the title helper with a local fallback; generation/reload checks remain open. |
| CD06 | Auto-generate session tags | ✅ | ✅ | autoTagSessions persists and selected-profile suggestions are wired for new chats; source defaults and excerpt behavior need parity checks. |
| CD07 | Session tag provider and model | ✅ | ✅ | Selected profile ID persists; missing-profile indication exists. Reference has both configured and no-profile rendering branches, retained as separate occurrences. |
| CD08 | Saved-session tags | ✅ | ❌ | No Settings action to generate tags across existing sessions. Automatic new-chat suggestions and history manual tags do not cover this action. |
| CD09 | Session tag provider and model | ✅ | ✅ | Selected profile ID persists; missing-profile indication exists. Reference has both configured and no-profile rendering branches, retained as separate occurrences. |
| CD10 | Normalize session tags | ✅ | ❌ | No global normalization review dialog; individual history tag edits exist separately. |
| CD11 | Chat tab title width | ✅ | ✅ | Input and validator accept 120–360 px; persisted into chat settings. Check blur/save and invalid-input behavior against source. |
| CD12 | Restore chat tabs after reload | ✅ | 🔧 | Toggle and saved active/open tabs and scroll exist; reference description excludes draft tabs, so draft restoration semantics need explicit comparison. |
| CD13 | Maximum parallel chat sessions | ✅ | ❌ | No Settings concurrency control equivalent to reference 1–10 (default 5); orchestration internals are separate evidence. |
| CD14 | Agent prompt | ✅ | 🔧 | Base instructions editor exists, but the reference View and edit modal includes latest generated prompt, copy and reset; see nested rows. |
| CD15 | Max sessions in sidebar | ✅ | ❌ | No sidebar-page-size preference equivalent to the reference 10–200 step 10 slider. |
| CD16 | Max saved conversations | ✅ | ❌ | No saved-conversation retention preference equivalent to positive integer/fallback 20. Do not equate pagination with deletion. |
| CD17 | Max context tokens | ✅ | ❌ | No separate selected-resource context budget. Standalone maxContextTokens is exposed as the model request budget, a different purpose despite the shared name. |
| CD18 | Max context messages | ✅ | ✅ | Positive previous-message limit persists and adapter adds one for the current message; full history remains stored. Compare edge cases and defaults. |
| CD19 | Model request token budget | ✅ | 🔧 | Standalone request budget uses maxContextTokens and fixed choices 8000–1000000; reference maxRequestTokens accepts 0 to disable token budgeting. Separate selected-context budget is absent. |
| CD20 | Recent messages to preserve | ✅ | ❌ | No Settings preference. VercelLLMAdapter currently fixes preserveRecentMessages to 2; reference setting defaults to 4 and accepts positive integers. |
| CD21 | Response token reserve | ✅ | ❌ | No Settings preference. Adapter fixes reserve to min(4096, contextWindow/4); reference accepts a configurable nonnegative value. |
| CD22 | Compaction trigger tokens | ✅ | ❌ | No threshold preference or equivalent exposed workflow; retained for comparison without deciding to defer or omit it. |
| CD23 | Compaction release tokens | ✅ | ❌ | No hysteresis/release preference; retained independently from trigger. |
| CD24 | Max tool-result replay tokens | ✅ | ❌ | No Settings preference equivalent to maxToolResultTokens; complete saved result and bounded request projection must be distinguished. |
| CD25 | Tool history mode | ✅ | ❌ | No elide/preserve preference. Runtime history code does not establish the Settings behavior. |
| CD26 | Base prompt view | ✅ | 🔧 | Base instructions editor exists on Chat Settings, without modal view switching. |
| CD27 | Main instructions editing | ✅ | 🔧 | Standalone allows empty up to 16000 characters; source rejects blank on Save. |
| CD28 | Latest generated system prompt view | ✅ | ❌ | No read-only request-time generated prompt preview or captured provider/time. |
| CD29 | Copy latest system prompt | ✅ | ❌ | No prompt-copy action. |
| CD30 | Reset base prompt to default | ✅ | ❌ | No explicit reset-to-default control that stages reset before Save. |
| CD31 | Save base prompt | ✅ | 🔧 | Standalone saves full chat preference form; source modal validates nonblank and rolls back failed persistence. |
| CD32 | Cancel/close prompt without saving | ✅ | 🔧 | Discard changes exists for chat Settings; source modal preserves draft across views and discards on close. |
| CD33 | Latest prompt empty state and lifetime | ✅ | ❌ | No equivalent no-request-yet state or reload-limited latest-prompt capture. |
| CD34 | Tag normalization: Find/regenerate merge proposals | ✅ | ❌ | Selected tagging profile receives tag names only; preserve proposal cancellation and failures. No global normalization dialog exists in standalone. |
| CD35 | Tag normalization: Suggested merges tab | ✅ | ❌ | Show proposed equivalent tags separately from all tags. No global normalization dialog exists in standalone. |
| CD36 | Tag normalization: All tags tab | ✅ | ❌ | Show complete tag inventory and session counts. No global normalization dialog exists in standalone. |
| CD37 | Tag normalization: Select individual merge | ✅ | ❌ | Each proposed merge is independently selectable. No global normalization dialog exists in standalone. |
| CD38 | Tag normalization: Edit canonical tag name | ✅ | ❌ | Canonical input has max length 32 and validates merge targets. No global normalization dialog exists in standalone. |
| CD39 | Tag normalization: Select all merges | ✅ | ❌ | Select all eligible proposed changes. No global normalization dialog exists in standalone. |
| CD40 | Tag normalization: Deselect all merges | ✅ | ❌ | Clear merge selection. No global normalization dialog exists in standalone. |
| CD41 | Tag normalization: Rescan tags / retry failed save | ✅ | ❌ | Retain fresh inventory and pending-save recovery semantics. No global normalization dialog exists in standalone. |
| CD42 | Tag normalization: Cancel suggestions / close | ✅ | ❌ | Abort model suggestions and leave unapplied changes untouched. No global normalization dialog exists in standalone. |
| CD43 | Tag normalization: Apply selected merges | ✅ | ❌ | Validate affected sessions/stale plans, persist selected changes and preserve transcript content. No global normalization dialog exists in standalone. |
| CD44 | Bulk tag generation progress/cancellation | ✅ | ❌ | Reference progress modal, bounded per-session work, generated/failed counts and save behavior need equivalent comparison; automatic new-chat tagging does not cover them. |
| CD45 | Bulk-generation Normalize tags entry | ✅ | ❌ | The configured-profile bulk tagging row has an additional Normalize tags button, beyond the standalone normalization row. Both lead to the same missing dialog. |
| CD46 | Bulk tag dialog: Generated-tag results | ✅ | ❌ | Per-session generated-tag readouts and running summary. Standalone has no saved-session bulk tagging dialog. |
| CD47 | Bulk tag dialog: Cancel generation | ✅ | ❌ | AbortController cancellation and close-cancels behavior are supplied by Chat Defaults. Standalone has no saved-session bulk tagging dialog. |
| CD48 | Bulk tag dialog: Done after tagging | ✅ | ❌ | Completion/error feedback and close without starting model work. Standalone has no saved-session bulk tagging dialog. |

## Agent Tools

| ID | Setting / action / readout | Obsidian-AI | Super Chat | Notes / differences |
|---|---|:---:|:---:|---|
| AT01 | Enable agent tools | ✅ | ✅ | Allow agent tools persists and maps to engine enableTools; available tool sets differ by host. |
| AT02 | Auto-apply edits | ✅ | ❌ | No autoApply control. Current write approvals differ; map reference semantics and policy before implementation. No keep/drop decision made. |
| AT03 | Max agent steps | ✅ | 🔧 | Standalone offers 1/2/3/5/8/12 and validator caps at 12; source accepts any positive integer with fallback 5. |
| AT04 | Developer mode | ✅ | ❌ | No developer-mode control or conditional settings mutation routes. Reference interaction with tool availability must be retained. |

## Integrations

| ID | Setting / action / readout | Obsidian-AI | Super Chat | Notes / differences |
|---|---|:---:|:---:|---|
| IN01 | Refresh provider discovery | ✅ | 🔧 | Standalone injectable bridge exists but default host has no installed-provider discovery; Refresh disabled without bridge. |
| IN02 | Per-provider enable/disable | ✅ | 🔧 | Dynamic toggle routes to bridge; actual standalone host discovery is absent. |
| IN03 | Provider status/message/capability count | ✅ | 🔧 | Rows exist when bridge returns data; compare status/availability handling and failure messages. |
| IN04 | No-compatible-provider state | ✅ | 🔧 | Standalone has empty/unavailable states; compare when refreshing and discovery fails. |

## AI Intelligence Layer

| ID | Setting / action / readout | Obsidian-AI | Super Chat | Notes / differences |
|---|---|:---:|:---:|---|
| MI01 | Enable intelligence layer | ✅ | 🔧 | Enable memory controls store/tools/prompt injection. Reference enablement also concerns persona and initialization; it is not proven equivalent. |
| MI02 | Identity context budget | ✅ | 🔧 | Core memory prompt budget exists (0–8000 choices) but no equivalent configurable persona contribution. Compare combined persona+memory budget. |
| MI03 | Memory core size | ✅ | ❌ | No small/medium/large (50/100/200) preference. Review/promote actions do not replace configurable core size. |
| MI04 | Legacy memory backup retention | ✅ | 🔧 | Recovery copies supports 0/10/20/50/100 and stores snapshot history. Reference timestamped legacy files and fixed recovery backups have different semantics. |
| MI05 | Persona file path | ✅ | ❌ | No selectable persona path/storage location. Host storage adaptation remains an open decision, not an exclusion. |
| MI06 | Memory file path | ✅ | ❌ | No configurable memory file path. IndexedDB implementation is recorded, without dropping the reference capability. |
| MI07 | Auto-summarize sessions | ✅ | ❌ | No auto-summary-on-new-session toggle or scheduled equivalent exposed here. |
| MI08 | Min messages before summarizing | ✅ | ❌ | No conditional summary threshold (reference 2–20), tied to auto-summarize. |
| MI09 | Enable memory audit tool | ✅ | ✅ | Expose memory audit tool persists and filters MemoryToolProvider availability. UI audit viewing is distinct from model tool access. |
| MI10 | Memory entry count | ✅ | ✅ | Standalone shows tier counts for current query; reference total entries may differ. |
| MI11 | Memory total size | ✅ | ❌ | No total memory-size readout. |
| MI12 | Memory category counts | ✅ | ❌ | Standalone entries show category but no equivalent aggregate category stats. |
| MI13 | Export memory JSON | ✅ | ❌ | Settings export does not provide the reference dedicated memory export action. |
| MI14 | Export memory Markdown | ✅ | ❌ | No dedicated Markdown memory export. |
| MI15 | Refresh memory statistics | ✅ | 🔧 | Refresh list/tier counts exists; reference refresh also recomputes size/category statistics. |
| MI16 | Prune exact duplicate memories | ✅ | ❌ | Promote staged memories is not duplicate pruning. |
| MI17 | AI-powered semantic prune | ✅ | ❌ | No optimizer launch equivalent; keep model cost, review and restore behavior in nested rows. |
| MI18 | Memory audit display | ✅ | 🔧 | Standalone activity list shows timestamp/operation/entry ID; reference audit includes more detail. |
| MI19 | Refresh audit | ✅ | 🔧 | Standalone toggles activity and refreshes on entry-count change; no explicit Refresh Audit button. |
| MI20 | Open intelligence folder | ✅ | ❌ | No folder/location action; host storage choice remains open. |
| MI21 | AI prune: Progress, stage, log and ETA | ✅ | ❌ | No standalone semantic-prune dialog; retain reference action and its failure/recovery behavior. |
| MI22 | AI prune: Confirm proposed pruning before save | ✅ | ❌ | No standalone semantic-prune dialog; retain reference action and its failure/recovery behavior. |
| MI23 | AI prune: Cancel running prune | ✅ | ❌ | No standalone semantic-prune dialog; retain reference action and its failure/recovery behavior. |
| MI24 | AI prune: Restore pre-prune backup | ✅ | ❌ | No standalone semantic-prune dialog; retain reference action and its failure/recovery behavior. |
| MI25 | AI prune: Finish/close prune dialog | ✅ | ❌ | No standalone semantic-prune dialog; retain reference action and its failure/recovery behavior. |

## Web Search

| ID | Setting / action / readout | Obsidian-AI | Super Chat | Notes / differences |
|---|---|:---:|:---:|---|
| WS01 | Search provider | ✅ | ✅ | All five provider choices exist; selected settings reach copied search service. Live provider checks remain open. |
| WS02 | Brave API key | ✅ | 🔧 | Password field exists and Android uses credential storage; inactive provider field is disabled. Reference conditional rendering and persistence differ across hosts. |
| WS03 | Tavily API key | ✅ | 🔧 | Password field exists; Android protected storage and web/desktop session-memory retention differ from reference persistence. |
| WS04 | Exa API key | ✅ | 🔧 | Password field exists; compare conditional availability, credential changes and host persistence. |
| WS05 | SearXNG instance URL | ✅ | ✅ | URL control reaches service and is disabled when another provider is selected; runtime validation remains to verify. |

## PDF Extraction

| ID | Setting / action / readout | Obsidian-AI | Super Chat | Notes / differences |
|---|---|:---:|:---:|---|
| PDF01 | Extraction method | ✅ | ✅ | Auto/server/client choices exist; client availability is a supplied host flag. Need fallback and offline checks. |
| PDF02 | Server endpoint URL | ✅ | ✅ | Endpoint field exists and is disabled for client-only; source hides it for client-only. Check request/validation differences. |
| PDF03 | Maximum pages | ✅ | ✅ | Both expose 0–200 in steps of 10 and 0 means all pages; extraction must verify it end to end. |

## Multi-User Chat Relay

| ID | Setting / action / readout | Obsidian-AI | Super Chat | Notes / differences |
|---|---|:---:|:---:|---|
| RE01 | Relay URL | ✅ | ✅ | URL defaults saved; reference saves on its own event path. |
| RE02 | Recent relay URL history | ✅ | 🔧 | Standalone datalist records history on Save; reference selection/recency semantics need comparison. |
| RE03 | Test relay connection | ✅ | 🔧 | Standalone combines test and HTTP room listing; compare protocol/status handling. |
| RE04 | Detect local IP | ✅ | ❌ | No detection control or callback. |
| RE05 | Available rooms and member names | ✅ | ✅ | Room listing renderer exists; loading/empty/failure behavior requires checks. |
| RE06 | Join selected room | ✅ | ⏸️ | Standalone Join disabled; earlier user deferral is historical and the feature remains fully listed. |
| RE07 | Default room ID | ✅ | ✅ | Persisted room default exists; session connection behavior not established. |
| RE08 | Local display name | ✅ | ✅ | Persisted display name exists; attribution integration remains separate. |
| RE09 | Per-chat relay-enablement guidance | ✅ | ❌ | Standalone explanation does not provide matching per-chat toolbar integration. |

## Sync Components

| ID | Setting / action / readout | Obsidian-AI | Super Chat | Notes / differences |
|---|---|:---:|:---:|---|
| SC01 | Chat sessions | ✅ | ✅ | Sessions feed SyncEngine; verify selected context and drafts survive round trips. |
| SC02 | Plugin/app settings | ✅ | 🔧 | Target list includes chat/provider/search/PDF/relay/debug/log/sync/remote settings. Compare reference whole-settings selection and omissions. |
| SC03 | API keys and credentials | ✅ | ⏸️ | Disabled in standalone and import forces false; source can select this with encryption. No decision to omit credential transfer. |
| SC04 | AI memory | ✅ | ✅ | Memory snapshot included via file targets; round-trip not accepted. |
| SC05 | Memory audit log | ✅ | ✅ | Audit snapshot included; verify selected/unselected isolation. |
| SC06 | AI persona | ✅ | 🔧 | Current target maps to chat systemPrompt; reference persona.md is distinct from base agent prompt. |
| SC07 | Usage statistics | ✅ | 🔧 | Standalone exports session/message counts, reference token/model aggregates. |

## Remote Storage

| ID | Setting / action / readout | Obsidian-AI | Super Chat | Notes / differences |
|---|---|:---:|:---:|---|
| RS01 | Enable Remote Storage | ✅ | ✅ | Persisted enabled controls manual sync availability; network acceptance open. |
| RS02 | Storage Backend | ✅ | 🔧 | WebDAV selectable, S3/custom visibly unavailable; source also has a none choice and coming-soon entries. Preserve all variants below. |
| RS03 | Encrypt Data | ✅ | 🔧 | Standalone persists a separate encrypted boolean; reference derives enabled state from a nonempty passphrase and clears the passphrase when disabled. Round-trip and toggle semantics remain to compare. |
| RS04 | Encryption Passphrase | ✅ | 🔧 | In-memory form value supplied to sync; reference saves its passphrase setting. Persistence and reuse semantics differ and remain open. |
| RS05 | Auto-sync | ⏸️ | ⏸️ | Reference AUTO_SYNC_ENABLED disables the control; standalone also disabled. This is source status, not permission to discard automatic sync. |
| RS06 | Conflict Resolution | ✅ | ✅ | last-write-wins/keep-both/manual choices reach SyncEngine. Manual leaves conflicts unresolved; interaction and resolution parity open. |
| RS07 | Sync Direction | ✅ | ✅ | both/upload/download choices reach sync; verify each direction and cancellation/errors. |
| RS08 | Allow Session Deletions | ✅ | 🔧 | Flag reaches engine; standalone label describes remote-to-local deletion while reference says automatic deletions more broadly. Verify both directions before equivalence. |
| RS09 | WebDAV URL | ✅ | ✅ | Persisted URL reaches adapter; validation/normalization/error details differ and need endpoint checks. |
| RS10 | Username | ✅ | ✅ | Persisted username reaches adapter; test authentication failures and export behavior. |
| RS11 | Password / App Token | ✅ | 🔧 | Form value stays in memory; source saves credentials in settings. Compare replacement/retention and secure host storage without assuming a policy choice. |
| RS12 | Path Prefix | ✅ | ✅ | Persisted prefix reaches sync identity/cache; cross-prefix isolation needs verification. |
| RS13 | Connection | ✅ | 🔧 | Test connection action exists, but exact preflight validation and error detail differ from the source PROPFIND helper. |
| RS14 | No backend selected | ✅ | ❌ | Source none state exists; standalone defaults to WebDAV and offers no none radio. |
| RS15 | WebDAV backend | ✅ | ✅ | Selectable backend and adapter exist; endpoint acceptance open. |
| RS16 | S3 backend choice | 🚧 | 🚧 | Both show unavailable S3; retain source placeholder as an item, not a delivered capability. |
| RS17 | Custom REST backend choice | 🚧 | 🚧 | Both show unavailable custom backend; retained without exclusion. |
| RS18 | Sync now | ✅ | ✅ | Manual action wired; progress, conflicts, errors and reload behavior differ. |
| RS19 | Last sync timestamp | ✅ | ❌ | No equivalent persisted last-sync readout in standalone form. |
| RS20 | Sync dialog: Review plan before moving data | ✅ | ❌ | Source Settings Sync Now opens examination before confirmation; standalone starts sync without equivalent review. |
| RS21 | Sync dialog: Change direction and re-examine | ✅ | ❌ | Independent direction choice refreshes preview; persisted direction alone is not equivalent. |
| RS22 | Sync dialog: Rebuild sync index | ✅ | ❌ | Settings sync caller supplies onRebuildIndex and re-examines stores; no standalone Settings action. |
| RS23 | Sync dialog: Confirm reviewed sync plan | ✅ | ❌ | Confirm preview before work begins; separate from initial Settings entry. |
| RS24 | Sync dialog: Cancel/close review | ✅ | ❌ | Closing before confirmation cancels without moving data. |
| RS25 | Sync dialog: Progress, summary and activity log | ✅ | ❌ | No corresponding progress/activity modal in standalone sync. |
| RS26 | Sync dialog: Cancel running sync | ✅ | ❌ | Call engine cancellation and disable cancellation while settling. |
| RS27 | Sync dialog: Continue sync in background | ✅ | ❌ | Source progress modal can close while work continues; no corresponding action. |
| RS28 | Sync dialog: Close completed sync | ✅ | ❌ | Completion action separate from cancellation. |

## Updates

| ID | Setting / action / readout | Obsidian-AI | Super Chat | Notes / differences |
|---|---|:---:|:---:|---|
| UP01 | Check for updates on startup | ✅ | ⏸️ | Control rendered disabled; no standalone host updater attached. Android/desktop behavior remains to implement or decide, not excluded. |
| UP02 | Release channel | ✅ | 🔧 | Disabled Stable-only selector; reference offers stable and dev. Both choices retained in required behavior. |
| UP03 | Auto-install stable updates | ✅ | ⏸️ | Disabled control; reference stable auto-install and dev confirmation behavior need host implementation mapping. |
| UP04 | Available branch builds | ✅ | ❌ | No Browse builds action; retain reference published-branch build browsing/installation capability with host owner. |
| UP05 | Current installed version/channel | ✅ | ❌ | No current version/channel readout in standalone Updates. |
| UP06 | Manual check now | ✅ | ⏸️ | Button disabled without host updater; reference checking state and outcomes retained. |
| UP07 | Last update-check result/time | ✅ | ❌ | No standalone last-check readout. |
| UP08 | Build browser: Build list, branch, commit and publication time | ✅ | ❌ | List available published builds with identity; no matching standalone browser. |
| UP09 | Build browser: Install selected branch build | ✅ | ❌ | Download/install selected build, show busy/failure state and reload; platform contract unresolved. |
| UP10 | Build browser: Loading/empty/error build states | ✅ | ❌ | Preserve loading, no-build and load-failure behavior. |

## Chat Commands

| ID | Setting / action / readout | Obsidian-AI | Super Chat | Notes / differences |
|---|---|:---:|:---:|---|
| CC01 | !help | ✅ | ✅ | Listed and handled by local dispatcher; verify it never sends a provider request and compare output. |
| CC02 | !debug | ✅ | ✅ | Listed and handled by local dispatcher; verify it never sends a provider request and compare output. |
| CC03 | !debug help | ✅ | ✅ | Listed and handled by local dispatcher; verify it never sends a provider request and compare output. |
| CC04 | !debug history | ✅ | ✅ | Listed and handled by local dispatcher; verify it never sends a provider request and compare output. |
| CC05 | !debug tokens | ✅ | 🔧 | Standalone reports rough transcript estimate/budget/tool-call counts; compare reference model-request breakdown. |
| CC06 | !debug context | ✅ | 🔧 | Standalone returns attachment metadata only; selected resource context is not included. |
| CC07 | !debug compact | ✅ | ⏸️ | Standalone reports unavailable; reference runs validated compaction. Retain as an open capability. |

## Backup & Restore

| ID | Setting / action / readout | Obsidian-AI | Super Chat | Notes / differences |
|---|---|:---:|:---:|---|
| BR01 | Export settings | ✅ | 🔧 | Uses Super Chat JSON format and host document export, omitting credentials. Export coverage omits some Settings categories; compare every category and format. |
| BR02 | Export with secrets | ✅ | ⏸️ | Visible disabled action. Reference exports secrets explicitly; secure host export remains an unresolved capability, not excluded. |
| BR03 | Import settings | ✅ | 🔧 | Only accepts super-chat-settings v1; reference Obsidian Settings bundle is not accepted. Credential import forced off; migration and partial failure semantics open. |
| BR04 | Import saved chats | ✅ | ✅ | JSON/JSONL parsing and ID collision copies are wired; verify schema/migration/round trips and no tool execution. |
| BR05 | Chat storage format | ✅ | 🔧 | Chat archive format selects export format only; it does not select durable legacy/JSONL storage. Reference storage-format choice remains unmatched. |
| BR06 | Session backup count | ✅ | ❌ | No rolling session backup-count setting. Clear-history recovery copy and memory recovery are different mechanisms. |
| BR07 | Migrate chat data | ✅ | ❌ | Reference shows migration only when legacy data is detected. No equivalent standalone migration action. Record host format differences; adaptation decision remains open. |
| BR08 | Clear all chat history | ✅ | 🔧 | Confirmation, recovery snapshot, deletion and reload exist; reference confirmation/storage handling differ. Verify recovery completeness. |
| BR09 | Cancel clear-history confirmation | ✅ | ✅ | window.confirm cancellation exists; custom modal behavior differs. |
| BR10 | Confirm clear all history | ✅ | 🔧 | Standalone saves one recovery copy then deletes/reloads; verify failure atomicity. |
| BR11 | Legacy persistent storage option | ✅ | ❌ | Standalone only has export archive choice, not persistent storage-format selection. |
| BR12 | Split JSONL persistent storage option | ✅ | ❌ | Persistent JSONL and corruption-isolation behavior unmatched by export dropdown. |
| BR13 | Choose Settings export from vault | ✅ | 🔧 | Reference fuzzy-selects chat-lab-settings*.json from vault; standalone uses native file input and different schema. |
| BR14 | Choose chat archive from vault | ✅ | 🔧 | Reference fuzzy-selects JSON/JSONL files, excluding Settings bundles; standalone file input differs. |

## Debug Mode

| ID | Setting / action / readout | Obsidian-AI | Super Chat | Notes / differences |
|---|---|:---:|:---:|---|
| DB01 | Enable debug mode | ✅ | 🔧 | Persisted export enablement and dependent toggles exist; reference also shows chat Debug mode active indicator, not established here. |
| DB02 | Provider usage | ✅ | 🔧 | Selection exists; actual provider telemetry capture not established. |
| DB03 | Request estimates | ✅ | ✅ | Selection exists and estimator data is used when recorded. |
| DB04 | Per-step request breakdown | ✅ | 🔧 | Selection exists but complete per-step capture/schema parity is open. |
| DB05 | Tool details | ✅ | 🔧 | Standalone omits arguments/results and reports selected sizes; reference includes arguments/status. Preserve difference for decision. |
| DB06 | Context metadata | ✅ | 🔧 | Standalone selects attachment references, reference selected context references are broader. |
| DB07 | Model and timing | ✅ | 🔧 | Field selection exists; runtime population and provider identity need verification. |

## Diagnostics

| ID | Setting / action / readout | Obsidian-AI | Super Chat | Notes / differences |
|---|---|:---:|:---:|---|
| DG01 | Debug log level | ✅ | ✅ | off/error/info/debug persist and feed structured log capture. Verify which runtime events reach the log. |
| DG02 | Debug log max size (MB) | ✅ | 🔧 | Standalone clamps 0.1–100 MB; source accepts positive float/fallback 5. JSON entry size retention differs from file truncation. |
| DG03 | Debug log retention | ✅ | 🔧 | Standalone counts/clamps entries 1–10000; reference approximates retained log lines. Rotation semantics differ. |
| DG04 | Memory snapshot interval (seconds) | ✅ | ✅ | Both clamp 60–3600 and persist; standalone snapshot timer consumes this value. Logging-off/error-only behavior requires parity checks. |
| DG05 | Refresh metrics | ✅ | 🔧 | Combined refresh/data-health action exists; metric set is smaller than source, itemized below. |
| DG06 | Export diagnostics | ✅ | 🔧 | Standalone exports IDs/counts/runtime/debugSettings; reference includes broader redacted settings/usage/storage metadata. No full export-schema parity established. |
| DG07 | Check data health | ✅ | 🔧 | Checks session/message structure only. Reference also checks assets, Settings, index/transcripts, draft attachments and memory; preserve expanded scope below. |
| DG08 | Repair chat data | ✅ | ⏸️ | Visible disabled button; reference opens preview/schedule workflow. Review, backups, restart and unindexed recovery remain mapped below. |
| DG09 | JS Heap Used | ✅ | ✅ | Displayed only when runtime exposes performance.memory; unavailable state shown otherwise. |
| DG10 | JS Heap Total | ✅ | ❌ | Collected in exported runtime heap object but no equivalent Settings readout. |
| DG11 | JS Heap Limit | ✅ | ❌ | Collected in exported runtime heap object but no equivalent Settings readout. |
| DG12 | DOM Nodes | ✅ | ✅ | Standalone corresponding metric exists; verify counts and refresh behavior. |
| DG13 | Chat Sessions | ✅ | ✅ | Standalone corresponding metric exists; verify counts and refresh behavior. |
| DG14 | Total Messages | ✅ | ✅ | Standalone corresponding metric exists; verify counts and refresh behavior. |
| DG15 | LLM Usage (estimated) | ✅ | ❌ | No equivalent Settings aggregate estimated usage metric. |
| DG16 | Estimated input / output | ✅ | ❌ | No Settings input/output aggregate metric. |
| DG17 | Completed responses | ✅ | ❌ | No equivalent completed-response metric. |
| DG18 | Plugin Storage | ✅ | 🔧 | Browser origin storage estimate differs from plugin-folder total. |
| DG19 | Storage Breakdown | ✅ | ❌ | No per-file/category storage breakdown. |
| DG20 | Usage by model | ✅ | ❌ | No equivalent Settings model-usage bars/aggregate list. |
| DG21 | Export data-health report | ✅ | ❌ | No separate report action with full findings/omission counts/limits; generic diagnostics includes narrower structural health list. |
| DG22 | Data-health findings and limitations | ✅ | 🔧 | Standalone findings are session/message structure only; preserve source assets/settings/index/transcript/draft/memory checks and omitted/limitation reporting. |
| DG23 | Repair: Repair preview and progress | ✅ | ⏸️ | Read-only scan, counts, progress and proposed safe changes. Standalone repair entry is disabled and no nested equivalent is connected. |
| DG24 | Repair: Choose unindexed chats to recover | ✅ | ⏸️ | Independent chat checkboxes with title/message counts and skipped reasons. Standalone repair entry is disabled and no nested equivalent is connected. |
| DG25 | Repair: Review files requiring manual repair | ✅ | ⏸️ | Retain skipped paths/reasons and findings limits. Standalone repair entry is disabled and no nested equivalent is connected. |
| DG26 | Repair: Schedule selected repairs | ✅ | ⏸️ | Apply after restart; original verification and backups are required reference behavior. Standalone repair entry is disabled and no nested equivalent is connected. |
| DG27 | Repair: Cancel scheduled repairs | ✅ | ⏸️ | Reference can undo scheduling before restart. Standalone repair entry is disabled and no nested equivalent is connected. |
| DG28 | Repair: Repair backup information | ✅ | ⏸️ | Record where originals are backed up and failures surfaced. Standalone repair entry is disabled and no nested equivalent is connected. |
