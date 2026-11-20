# Super Chat Master Delivery Plan

*Updated: 2026-11-20 16:08:58 IST*
*Program owner: INFRA-1 · shared application: T22 · reference comparison: T15*

## Start here

This is the single execution plan for completing Super Chat. It owns delivery
order, feature coverage, owner assignments, acceptance checks, and the next work
item. Existing task files own implementation detail and evidence; their separate
historical phase numbers do not determine the order of current work.

The behavioral reference is the full
[Obsidian-AI Chat Component Capability Map](../../obsidian-ai/memory-bank/implementation-details/chat-component-capability-map.md),
whose stated reference date is 2026-10-23. Its branch prototypes and support
qualifications must remain identified. Check current Obsidian-AI source before
implementing a feature. Its generic chat behavior applies across hosts; actual
vault, file, editor, network, and storage operations belong in host adapters.

For Settings, use the current-source
[Obsidian-AI Settings port inventory](implementation-details/settings-port-inventory.md),
checked against Obsidian-AI commit `7b7e73560281e11e4a9a68faafc0b2f692c75b4d`.
It lists all 13 regular and two advanced sections, their controls, and the
current Super Chat gap for each. The capability map is dated, so T15 must also
reconcile current source modules and user-visible behavior against this plan;
any source feature missing from the checklist is added before its source group
is marked covered. The Settings inventory alone does not close that wider
source audit.

The [platform architecture](implementation-details/embeddable-super-chat-platform.md)
continues to define shared versus host responsibilities. This plan supplies the
execution order and feature checklist. INFRA-1's older numbered phases remain
historical progress records. Arxivite's external-host migration is retired;
fixture, Android, desktop, and Obsidian remain the active targets.

## Product rules

- Implement Settings table items in order, beginning with PG01, under the
  [source reuse and compatibility contract](implementation-details/obsidian-ai-source-compatibility.md).
  Maximize feature availability; preserve reference data structures, field
  meanings/names, defaults, validation and formats. Reuse coherent source groups
  unchanged where possible and record required adaptations. Deliver dependencies
  as needed, then resume table order; update evidence per item.

- Map every Obsidian-AI Settings control without assuming what to keep or leave
  out. Disabled/source-placeholder controls and platform-specific capabilities
  remain listed. Host differences require an explicit mapping or later product
  decision; they are not automatic exclusions.

- Keep all UI controls visible. Show unavailable or unconfigured controls in
  place with clear disabled states and explanations. Do not omit controls by
  capability, profile presence, hover, or screen width. Responsive wrapping must
  keep actions readable and reachable. Optional content can open on activation;
  its entry control must remain visible. Zen mode must retain a visible exit.
- Keep one shared chat UI and runtime. Platform code supplies capabilities.
- A feature includes loading, empty, configured, unavailable, streaming, error,
  cancellation, persisted-state, and mobile behavior where applicable.
- Preserve complete local messages and tool results while bounding model input.
- Keep credentials out of messages, profile summaries, exports, and logs.
- Approval and cancellation remain engine-owned; unavailable tools are not
  advertised to models. Visible disabled UI does not grant execution permission.
- A visible button is not an implemented feature. Disabled controls remain open
  backlog items until their actual operation is delivered.

## Current baseline and evidence

The worktree is on `main`. It now contains source for reused chat feature
groups, expanded Settings, three-tier memory, attachment and archive handling,
native Android document export, and explicit web/Android/desktop host
compositions. Web and desktop use browser services; Android adds Keystore,
native documents, app lifecycle, and native HTTP. Protected provider-key
storage remains Android-only. The latest standalone TypeScript check, web and
desktop renderer builds, and Android debug APK build passed. The current APK
was installed on `.108`, and the user confirmed that the app works. A fresh
Apple Silicon arm64 DMG passed `hdiutil verify` but has not been opened or
installed. Desktop runtime checks and browser/desktop provider API-key
profiles remain open.

- Shared session/turn storage, model history, cancellation/replay foundations,
  host contracts, and local tool integration already have implementation records.
- Named provider profiles, a default for new chats, per-chat profile/model fields,
  and request routing are present. Model discovery and a full model picker still
  need work.
- Reused source now covers saved-chat search, tabs/drafts, message selection and
  edit/resend, replay, thinking controls, provider message conversion,
  attachments, and archive import/export. Settings registers all 15 reference
  sections on one searchable, persistent accordion page. Standalone search/PDF,
  backup/import, WebDAV sync, local commands, debug, and diagnostics are wired;
  unavailable controls remain visible and marked. See the
  [Settings inventory](implementation-details/settings-port-inventory.md) for
  section-by-section behavior and remaining gaps.
- Web search, PDF extraction/read, WebDAV synchronization, local chat commands,
  telemetry/logging, and data-health controls have source implementations.
  Live search/PDF/WebDAV endpoints and backup/restore round trips remain
  unverified. Relay joining and similar auxiliary features are deferred by the
  user.
- Three-tier memory and its standalone IndexedDB adapter are present. Prompt
  injection is opt-in; new items stay staged until promoted. AI pruning and a
  live memory-tool round trip remain open.
- Android debug builds and repeated ADB updates to the OPPO CPH2661IN at `.108`
  succeeded during this session. The connection test now reads SDK error events
  and allows bounded reasoning/output with a timeout.
- The standalone renderer selects a dedicated host module per Vite build
  target. Browser and desktop artifacts exclude Android credential/document
  plugins; Android includes them. See T22, T31, T32, and the current
  [session record](sessions/2026-11-19-cross-platform-host-composition.md) for
  the exact build and acceptance status.
- User screenshots `142484.jpg` and `142490.jpg` show OpenRouter selected and
  actual assistant responses to Hello and a supersymmetry question. This confirms
  basic live chat on Android. The truncated model field does not establish the
  exact effective model. Profile switching across chats, restart recovery, and
  live tool execution still require their own checks.
- Layout observations are retained in the session record. Address layout issues
  as the user reports them; current build work focuses on missing features.

## Delivery sequence

Each stage ends with its listed user-visible behavior working, focused automated
checks where meaningful, and Android interaction checks on `.108`. Keep completed
foundations and extend the existing paths. Order work by feature dependencies
and gaps in working behavior. Address layout issues as the user reports them.

- [ ] **Stage 1 — Core chat workflow** — Configure a provider, choose a model, send and stop replies, recover from errors, and use basic message actions.
  **Owners:** T22, T8, T28; Android T32.
  **Complete when:** A user can start a chat from first run, send a multiline prompt, receive or stop a streamed reply, retry after a failure, and copy a message. The chat shows the selected provider and model, and unavailable actions stay visible with an explanation.

- [ ] **Stage 2 — Reliable conversations** — Independent drafts, tab/view restoration, history/search, rename/delete, edit/resend and replay.
  **Owners:** T22, T15, T8; T30 for copy/export.
  **Complete when:** Two chats keep separate drafts and choices; close differs from delete; search opens the matching message; restart preserves saved content.

- [ ] **Stage 3 — Complete provider controls** — Discovery, recents, fallbacks, provider/model settings, thinking, per-message model and usage records.
  **Owners:** T28, T29, T22.
  **Complete when:** Switch providers/models between turns and chats; reload restores choices; old replies keep their own identity; connection failures are actionable.

- [ ] **Stage 4 — Context and files** — Resource picker/mentions, context chips, PDF/image/text attachments, budgets and captured replay content.
  **Owners:** T27, T7, T16, T22; T32/T31 host access.
  **Complete when:** Attach/remove/reopen/replay files and context; limits and unsupported formats are explained; no cross-chat leakage.

- [ ] **Stage 5 — Agent tools and retrieval** — Full current tool inventory, validated calls, approvals, execution/results, retrieval and citations.
  **Owners:** T25, T16, T15, T8.
  **Complete when:** Read and approval-required write flows, multiple calls, rejection, cancellation, long results and reload all preserve matching results.

- [ ] **Stage 6 — Memory and history management** — Memory tiers/tools, context summaries/pruning, archive exchange, tags and retention.
  **Owners:** T26, T30, T22.
  **Complete when:** Local transcript stays complete; memory changes can be audited/recovered; imports preserve existing chats; tags and retention behave predictably.

- [ ] **Stage 7 — Participants and collaboration** — Multiple AI profiles, addressing/debate, remote humans, separate saved-history sync.
  **Owners:** T6, T7, T22; T18/T31/T32 host services.
  **Complete when:** Attribution and selection survive tab changes; agents fail independently; humans-only and mixed chats work; relay does not replace stored history.

- [ ] **Stage 8 — Host and release completion** — Desktop/Obsidian adoption, Android recovery, diagnostics, signing and distribution.
  **Owners:** T18, T21, T29, T31, T32.
  **Complete when:** Each supported host passes its feature, persistence, permission and package checks; signed artifacts correspond to the accepted source.



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
and live WebDAV/backup acceptance remain open. The small-screen Settings layout
was checked on `.108` and approved by the user; this is visual acceptance only.

### Next executable work

**PG01 implementation:** Show advanced settings is wired in the standalone UI.
Its source field/default and classification data are preserved; focused tests,
typecheck, web build and browser reload checks passed. Android device acceptance
and full checklist acceptance remain open. Continue in table order with PG02 —
search setting names and descriptions as well as sections. Earlier next-work
suggestions below do not supersede this sequence.

The master plan remains the execution checklist. The user prioritised app icons
and consistent Android app identity alongside the existing feature sequence;
keep this work with T32 and desktop icon packaging with T31, without creating
a separate app-completion plan.

- [ ] **Priority — App icons and Android identity (OP08/T32; T31 desktop assets).**
  Create a reusable master icon and platform exports. Deliver Android legacy,
  adaptive and monochrome/themed launcher icons, and align the launcher, splash
  screen, recent-apps view and system app information with the Super Chat name
  and artwork. Preserve `com.spacecadet.superchat` so updates retain installed
  app data. Verify a replacement install and appearance on a real device;
  record themed-icon checks separately if the device cannot exercise them.
  Supply matching desktop icon exports and packaging references under T31;
  desktop appearance remains subject to its own runtime check.
  Selected mockup directions are recorded in
  [the icon selection](assets/icon-concepts/2026-11-20/SELECTION.md); production
  artwork, exports, package wiring and device checks remain open.

All 15 reference sections are now registered on one scrolling page, and their
open state persists in the standalone IndexedDB settings store. Search/PDF,
backup/import, WebDAV sync, local commands and diagnostics have working paths;
unavailable options are visibly disabled and marked. The complete inventory is
in `implementation-details/settings-control-checklist.md`, with the dated
section summary in `settings-port-inventory.md`, and remains the OP01 checklist.
Continue with remaining source controls for retention,
context/compaction, tag management, thinking/usage, and the wider T15 source
reconciliation. Exercise live WebDAV and backup round trips before claiming
host acceptance.

- [ ] **Complete Settings control parity (OP01/T15).** Use the 249-entry
  `settings-control-checklist.md` for individual controls, nested dialogs, source
  evidence and open differences. The source inventory is recorded; behavior,
  persistence, error handling and host acceptance stay unchecked. Do not infer
  keep/drop decisions from missing or disabled controls. Account for every section
  and control in `settings-port-inventory.md`; connect reusable controls to
  persisted behavior and route host-only operations through existing host
  owners. Do not mark OP01 done while any listed control or page behavior is
unclassified. Implemented slices include the 15-section registry and index,
persistent section state, automatic naming, new-session tag suggestions,
prepared-request estimates, saved-tab and transcript scroll restoration, tab
width, the previous-message request cap, search/PDF, backup/import, WebDAV sync,
local commands, logging, diagnostics, and explicit unavailable states.
  Remaining comparisons include retention, all context/compaction options, bulk
  tags/global normalization, provider/authentication, prompt inspection, memory,
  updates, credential exchange, storage migration/repair and telemetry. Manual
  history tag controls already have wired source paths.
- [ ] **Reconcile all current Obsidian-AI features (T15).** Compare current
  source modules and user-visible behavior with the dated capability map and
  this plan. Add a checklist row for every uncovered feature before completing
  its port group; keep host-specific features assigned to their existing owners.
- [ ] **Finish search and conversation continuity (SE02–SE04).** Continue from
  the implemented search, tab, and draft source; add the remaining matched-
  message navigation and saved-state behavior as feature slices.
- [ ] **Complete attachment and archive behavior (CX05/CX06, SE05/SE06).** Extend
  the existing paths for supported files, provider conversion, and import/export
  recovery rather than replacing them.

The [side-by-side Settings status table](implementation-details/settings-status-comparison.md)
provides separate Obsidian-AI/Super Chat icons for all 249 entries, with source
check time, versions and differences. Detailed acceptance remains in the control
checklist; source presence does not complete OP01.

## Current-source mapping — 2026-11-20

The [source mapping](implementation-details/obsidian-ai-source-mapping.md)
records 24 source groups and all 45 current built-in reference tools against
existing owners. Ten corresponding tool definitions are wired in standalone
(memory and web/PDF), plus its calculator and clock. This is an inventory and
initial source comparison; exact schema/policy parity and runtime acceptance
remain open. The wider T15 call-site/test audit is not complete.

Search jump/highlight, follow-latest and manual history/tag controls already
have wired source paths; verify those paths instead of rebuilding them.
Continue OP01's Settings table from PG02 under the current item-by-item order;
the older SE09/OP02 next-work suggestion is superseded. Keep advanced compaction
subject to the existing simple-first policy. Icon mockup choices are recorded
in [the selection note](assets/icon-concepts/2026-11-20/SELECTION.md); production
assets and Android identity acceptance remain open.

## Feature checklist

Check an item only when its full behavior and completion evidence are recorded.
Partial implementation stays unchecked. Each item retains its owner, reference
section and current state.

“Partial” means some source or device behavior exists and the stated remainder is
open. “Compare” means current Super Chat source still needs a focused comparison;
it does not mean the feature is absent. “Planned” means the existing task describes
future work. “Live basic” is the narrow screenshot-confirmed conversation path.
No item is complete until all of its checks are recorded. Ref numbers identify
sections of the external feature map. Item IDs are local checklist references,
not new task IDs.

### Workspace, transcript, composer and actions

- [ ] **UI01 — Full visible toolbar: New, History, Search, Models, Agents, Sync, Zen, Settings and session actions; clear unavailable states**
  **Owner:** T22/T8. **Reference:** 3.1, 12.
  **Current state:** Partial; Search and Settings are wired, while several unfinished actions remain unavailable. Layout changes wait for user-reported issues.

- [ ] **UI02 — Compact model picker plus readable profile/provider/model identity; all actions reachable at narrow widths**
  **Owner:** T28/T22. **Reference:** 3.1, 6.1.
  **Current state:** Partial; configured controls are truncated on device.

- [ ] **UI03 — Attributed user, assistant, agent, human and diagnostic messages; timestamp, model, duration, real usage or labelled estimates**
  **Owner:** T22/T8/T29. **Reference:** 3.2.
  **Current state:** Partial; message timestamps, draft estimates, and prepared-request estimates are configurable. Provider-reported usage, model/duration details, and broader attribution remain open.

- [ ] **UI04 — Markdown, links, code, tables, equations, files and references render; wide content scrolls within its block**
  **Owner:** T22/T8. **Reference:** 3.2.
  **Current state:** Compare.

- [ ] **UI05 — Honest generation/tool/approval/error/cancel states and generating-tab markers; separate reasoning display with a visible control**
  **Owner:** T22/T25/T28. **Reference:** 3.2, 5.
  **Current state:** Partial; thinking controls and streamed replies exist; full tool/approval/cancel state behavior remains open.

- [ ] **UI06 — Follow latest and late layout changes; preserve position when reading up; visible return-to-latest control**
  **Owner:** T22/T8. **Reference:** 3.2, 12.
  **Current state:** Partial; ChatApp has follow/scroll-up state, ResizeObserver for late layout changes, saved scroll restoration and return-to-latest. Runtime interaction and session-switch acceptance remain open.

- [ ] **UI07 — Multiline auto-growing composer, caret/input correctness, placeholder, keyboard/safe areas and configurable send shortcuts**
  **Owner:** T22/T8/T32. **Reference:** 3.3.
  **Current state:** Partial; Enter-to-send is configurable; input, keyboard, and remaining shortcut behavior are open.

- [ ] **UI08 — Visible Send and Stop controls with correct enabled state; stopping settles approval, tools and model continuation**
  **Owner:** T22/T25. **Reference:** 3.3, 5.
  **Current state:** Partial; engine foundation recorded; complete mobile flow needs checking.

- [ ] **UI09 — Copy, edit/resubmit/cancel-edit, retry on selected message/history; no draft leakage**
  **Owner:** T22/T8. **Reference:** 3.3, 3.5.
  **Current state:** Partial; selection, edit/resend, and replay source exists; full action behavior remains open.

- [ ] **UI10 — Touch/keyboard multi-message selection, copy as Markdown, cancel and reset on session switch**
  **Owner:** T22/T8/T30. **Reference:** 3.5.
  **Current state:** Partial; shared selection and export controls exist; touch/keyboard acceptance remains open.

- [ ] **UI11 — Visible host actions for create/update/append/review/insert, source target retained, permissions explained**
  **Owner:** T22/T8/T25. **Reference:** 3.5, 8.1.
  **Current state:** Compare; execution depends on host capabilities.

- [ ] **UI12 — Empty/first-run/loading/error layouts, focus management and announcements; theme and responsive layouts consistent across hosts**
  **Owner:** T22/T8. **Reference:** 3, 12.
  **Current state:** Partial; initial chat exists; reconcile first-run reference with standalone branding.


### Sessions, history and exchange

- [ ] **SE01 — New unsent draft stays out of saved history; duplicate opens avoided; tab close differs from confirmed deletion**
  **Owner:** T22. **Reference:** 2, 4.1.
  **Current state:** Partial; tab and draft source exists; saved-state acceptance remains open.

- [ ] **SE02 — Per-chat text draft, attachments, context, profile/models, participants, thinking, tabs and scroll restored; closing last tab gives clean new chat**
  **Owner:** T22/T27/T28. **Reference:** 2, 4.1, 11.
  **Current state:** Partial; drafts, tabs, profile/model choices, and transcript scroll positions persist. Standalone can restore the saved open/active tabs or start with only the active chat; broader restart and full-state acceptance remain open.

- [ ] **SE03 — Searchable recent-history list: title, count, excerpt, date, usage; load, manual rename, delete and configurable auto-name with fallback**
  **Owner:** T22/T8. **Reference:** 4.2.
  **Current state:** Partial; history metadata, manual rename, confirmed deletion, saved-message search and auto-naming with local fallback are wired. Full metadata parity, restart/recovery and interaction acceptance remain open.

- [ ] **SE04 — Full saved-message search; open/highlight matching message; past-session tool excludes current session**
  **Owner:** T22/T25. **Reference:** 4.3.
  **Current state:** Partial; fuzzy search indexes saved messages, and result selection passes the message ID to ChatApp for scrolling/highlighting. Reload/full-history and device checks remain open; standalone past-session tool routing is missing.

- [ ] **SE05 — Single message/selection/session/bulk copy and export in Markdown, JSON and JSONL as applicable**
  **Owner:** T30/T22. **Reference:** 4.2.
  **Current state:** Partial; message selection and archive export source exist; full format and Android document acceptance remain open.

- [ ] **SE06 — Validated JSON/JSONL archive import, schema migration, ID collisions create copies; imports never run tools**
  **Owner:** T30. **Reference:** 4.2, 11.
  **Current state:** Partial; archive import source exists; round-trip, migration, conflict, and no-tool-execution acceptance remain open.

- [ ] **SE07 — Session tags: manual/model-assisted tags, filter/count, manage/search/create/remove; persistence and archive inclusion**
  **Owner:** T22/T30/T25. **Reference:** 4.2.
  **Current state:** Partial; normalized metadata, archive preservation, opt-in suggestions, manual create/add/remove controls and tag filtering/counts are wired through the history dialog. Bulk generation, global normalization and device/reload acceptance remain open.

- [ ] **SE08 — Reviewable tag normalization and optional tag-name-only suggestions, stale-plan rejection, retry and preserved transcripts**
  **Owner:** T22/T30. **Reference:** 4.2.
  **Current state:** Partial; shared normalization and bounded tag-suggestion helpers exist. Reviewable global normalization and bulk tag workflows remain open; automatic generation clears its pending marker after success, empty output, or failure as in the reference.

- [ ] **SE09 — Retention controls and explicit deletion records prevent old snapshots restoring deleted sessions**
  **Owner:** T22/T30. **Reference:** 4.2, 11.
  **Current state:** Partial; standalone deletes records directly and saves via put. Reference storage guards stale snapshots with explicit deletion records; local retention/stale-save behavior still needs characterization independently of sync tombstones.


### Profiles, models and request lifecycle

- [ ] **PR01 — Named profile CRUD/duplicate/default, endpoints/credentials, migration and connection tests with useful errors**
  **Owner:** T28/T32/T31. **Reference:** 6.1.
  **Current state:** Partial; Android source and configured chat shown; lifecycle/key failure cases open.

- [ ] **PR02 — Discover models where available, provider-scoped cache/recents, searchable picker, known/manual fallback**
  **Owner:** T28. **Reference:** 6.1.
  **Current state:** Partial; static suggestions/manual entry exist; discovery/recents unfinished.

- [ ] **PR03 — Effective model: session override, recover old reply model, then profile default; switching affects next turn only**
  **Owner:** T28/T22. **Reference:** 6.1.
  **Current state:** Partial; per-chat request selection implemented; multi-chat/device acceptance open.

- [ ] **PR04 — Provider coverage: OpenAI, Anthropic, Google, DeepSeek, Kimi, OpenRouter, Azure, Ollama, custom and remote OpenResponses**
  **Owner:** T28/T18. **Reference:** 6.1.
  **Current state:** Partial; OpenRouter live basic; Azure and remote-agent standalone gaps need comparison.

- [ ] **PR05 — Thinking menu/request mapping calibrated by model/provider; display choice separate; image/file/tools/usage/cancel support represented honestly**
  **Owner:** T28/T27. **Reference:** 3.3, 6.1.
  **Current state:** Partial; thinking controls exist; model/provider calibration and file/tool/usage capability reporting remain open.

- [ ] **PR06 — Stream response, preserve usage and resolved identity, cancel/time out/retry with actionable provider errors**
  **Owner:** T22/T28/T29. **Reference:** 5, 6.1.
  **Current state:** Live basic; connection-test fix installed; other paths partial.

- [ ] **PR07 — Hydrate before send, capture request choices/context once, persist user turn, ordered model/tool events and terminal outcome**
  **Owner:** T22/T15/T25. **Reference:** 5, 11.
  **Current state:** Partial; existing turn/persistence foundation.


### Context, attachments, memory and budgets

- [ ] **CX01 — Searchable/disambiguated resource and agent mentions, keyboard choice, inline reference pills and accurate caret/wrapping**
  **Owner:** T7/T27/T22. **Reference:** 3.3.
  **Current state:** Planned/compare current mention implementation.

- [ ] **CX02 — Adapter-defined edit/create/append shortcuts retain target; show availability and matching direct actions**
  **Owner:** T7/T22/T25. **Reference:** 3.3, 3.5.
  **Current state:** Compare.

- [ ] **CX03 — Per-session resource/scope/current-resource selection, duplicate-free removable chips; resolve current content each send**
  **Owner:** T27/T16/T22. **Reference:** 3.4.
  **Current state:** Planned.

- [ ] **CX04 — Resolve embeds/groupings with source permissions and bounds; visible truncation and request budget**
  **Owner:** T27/T16/T15. **Reference:** 3.4, 7.1.
  **Current state:** Partial budgeting foundation; selected-context integration open.

- [ ] **CX05 — Pick/drop supported text/Markdown, PDF, image and external files; visible removable per-draft chips and submitted references**
  **Owner:** T27/T32/T31. **Reference:** 3.3, 7.2.
  **Current state:** Partial; attachment UI and shared resolution exist; host file selection and media coverage need completion.

- [ ] **CX06 — Provider-compatible parts, page/resize/size/type limits, preserved captured content for replay; same captured input for group requests**
  **Owner:** T27/T28. **Reference:** 5, 7.2.
  **Current state:** Partial; provider message conversion exists; PDF/image limits and persisted captured-content replay remain open.

- [ ] **CX07 — Persona, memory, context, history and tools within budgets/reserves; keep pairs valid and complete local transcript intact**
  **Owner:** T15/T16/T25/T26. **Reference:** 7.1, 9.
  **Current state:** Partial; chronology/result/context foundation recorded.

- [ ] **CX08 — Measured need determines summary/compaction; preserve originals, summary source links, continuation and full-result retrieval**
  **Owner:** T26/T15/T25. **Reference:** 7.1, 9.
  **Current state:** Planned; retain existing simple-first context policy.

- [ ] **CX09 — Memory tiers, CRUD/search/audit/promotion/archive, relevant prompt injection, reversible AI pruning**
  **Owner:** T26. **Reference:** 7.1, 8.2.
  **Current state:** Partial; three-tier storage, tools, review/restore, and opt-in injection exist; AI pruning remains open.

- [ ] **CX10 — Request token estimate includes tools and attachments, image estimate labelled, actual usage distinguished**
  **Owner:** T29/T27/T28. **Reference:** 3.3, 9.
  **Current state:** Partial; standalone estimates the prepared prompt, including system instructions and memory. Tool definitions, attachments/images, and provider-reported usage remain separate or unreported.


### Tool catalog, execution and evidence

- [ ] **TL01 — Reconcile every current tool family against source; map generic operations to host capability and owner instead of freezing the old 31-tool count**
  **Owner:** T25/T15. **Reference:** 8.1–8.2.
  **Current state:** Partial; the current-source mapping inventories all 45 built-in reference tools and existing owners. Dynamic external-provider discovery, schemas, policy and execution parity remain open.

- [ ] **TL02 — Repository read/inspect, browse/search/list/count, reference/resolve, supported queries, create/update/patch/append/section, organize/move/delete**
  **Owner:** T25/T18/T32/T31. **Reference:** 8.1–8.2.
  **Current state:** Planned by host support; unavailable controls visible; optional Dataview remains Obsidian-only.

- [ ] **TL03 — Web search and PDF read with bounded results/pages and visible backend configuration**
  **Owner:** T25/T16/T27. **Reference:** 8.2.
  **Current state:** Partial; standalone wires provider-configured web search and PDF extraction/read with page limits. Live search/PDF endpoint checks and cross-host acceptance remain open.

- [ ] **TL04 — Memory tools, past-session search, session list/read/open/rename/delete, tag tools and full stored-result retrieval**
  **Owner:** T26/T25/T22. **Reference:** 8.2.
  **Current state:** Partial; memory tools exist; live tool round trip, past-session search, tags, and full-result retrieval remain open.

- [ ] **TL05 — Sanitized settings, allow-listed changes, agent-prompt read/update/reset and app capability/identity reporting**
  **Owner:** T25/T29. **Reference:** 8.2.
  **Current state:** Planned; standalone composition has no settings, app-identity or agent-prompt tool routes. Adapt get_plugin_info to host identity and preserve the reference restrictions on settings/prompt mutation.

- [ ] **TL06 — Built-in/external tool discovery, unique routes, input validation and local risk/authorization policy**
  **Owner:** T25. **Reference:** 8.2–8.3.
  **Current state:** Partial; composition/routes/abort propagation implemented.

- [ ] **TL07 — Tool-specific preview, approve/reject/auto-approval policy; unknown tools fail; conflicting target writes serialized**
  **Owner:** T25/T22/T8. **Reference:** 8.3.
  **Current state:** Partial approval foundation; full reference comparison needed.

- [ ] **TL08 — Multiple ordered calls/results, cancellation/rejection/retry, bounded steps; no execution or continuation after stop**
  **Owner:** T25/T15. **Reference:** 5, 8.3.
  **Current state:** Partial; structured history foundation; live Android tool flow open.

- [ ] **TL09 — Readable bounded model result with paging/continuation; full saved result accessible after reload**
  **Owner:** T25/T15/T26. **Reference:** 7.1, 8.3.
  **Current state:** Partial foundation; complete result-retrieval path open.

- [ ] **TL10 — Agent-driven retrieval/search/fetch, citations/source tracking, progress, warnings, errors and replay**
  **Owner:** T16/T25. **Reference:** 5, 8.
  **Current state:** Partial retrieval/context foundation; full agentic flow open.


### AI participants, remote humans and saved-chat sync

- [ ] **CO01 — Select several profiles per chat, restore selections, route each turn and attribute replies, thinking/activity and errors**
  **Owner:** T6/T28/T22. **Reference:** 6.2.
  **Current state:** Phase A orchestration recorded; standalone Agents control disabled.

- [ ] **CO02 — Named-agent addressing, sequential/parallel/debate behavior, earlier replies as input and optional pass**
  **Owner:** T6/T7/T15. **Reference:** 6.2.
  **Current state:** Partial orchestration foundation; chat integration open.

- [ ] **CO03 — Relay connection/room/local identity/member and recipient selection, presence/typing, human-only and mixed chat**
  **Owner:** T22/T18/T31/T32. **Reference:** 6.3.
  **Current state:** Planned; message-envelope/dedup foundation recorded.

- [ ] **CO04 — Reconnect/replay/order/dedup, sender identity, permission failures, session participant restore**
  **Owner:** T22. **Reference:** 6.3, 11.
  **Current state:** Partial inbound-message foundation; transport acceptance open.

- [ ] **CO05 — Saved-history sync configured separately from relay; progress/conflicts/errors, offline/partial merge and explicit deletions**
  **Owner:** T22/T18/T31/T32. **Reference:** 10–11.
  **Current state:** Planned; select host backend when implementing.


### Settings, durability, access and release

- [ ] **OP01 — Map every Obsidian-AI Settings control and deliver its agreed behavior, with persisted state and explicit host differences**
  **Owner:** T22 plus feature owners. **Reference:** 9.
  **Current state:** Source control inventory recorded in the [249-entry checklist](implementation-details/settings-control-checklist.md); implementation/acceptance remains partial. No features were excluded or approved for omission. All 15 reference sections are registered on one page with searchable section navigation and persisted accordion state. Standalone search/PDF, backup/import, WebDAV sync, local commands, debug and diagnostics have working paths. Unsupported controls are disabled and marked. The [Settings port inventory](implementation-details/settings-port-inventory.md) tracks each section and support boundary. Remaining gaps include control-level search, advanced-settings grouping/load errors, retention and context/compaction controls, bulk tag generation/global normalization, provider-reported usage, deferred relay joining, live WebDAV/backup acceptance and the wider T15 source audit. Host-only rows and source placeholders stay with their existing owners.

- [ ] **OP02 — Durable sessions, drafts, parts, index/transcript hydration, no empty overwrite of unloaded data, migration and corruption recovery**
  **Owner:** T22/T30/T32/T31. **Reference:** 10–11.
  **Current state:** Partial; IndexedDB, draft/session persistence, and replay source exist; lazy loading and restart/recovery cases remain open.

- [ ] **OP03 — Android lifecycle/process death/offline/backup, protected-key failure and permission-aware file/share behavior**
  **Owner:** T32. **Reference:** 11.
  **Current state:** Partial; backup exclusions and live chat present; recovery/permission cases open.

- [ ] **OP04 — Keyboard, touch/long-press, accessible labels, focus, status announcements, cancellation and narrow layouts**
  **Owner:** T22/T8/T32/T31. **Reference:** 12.
  **Current state:** Partial; Android layout observations are recorded in the session.

- [ ] **OP05 — Correlated/redacted provider/tool/context/storage diagnostics, opt-in telemetry fields and safe export**
  **Owner:** T29. **Reference:** 9, 12.
  **Current state:** Partial; standalone provides selected telemetry export, structured logs, snapshots, metrics, health checks, and host diagnostics. The shared correlated/redacted provider/tool/context/storage event pipeline remains incomplete.

- [ ] **OP06 — Host credential storage, explicit data destinations, secret-free archives/logs and secure room identity**
  **Owner:** T28/T29/T30/T31/T32. **Reference:** 10, 12.
  **Current state:** Partial Android credential storage; broader coverage open.

- [ ] **OP07 — Versioned package and host adoption, accepted source/artifact identity, signing, Android/desktop/Obsidian checks**
  **Owner:** T21/T18/T31/T32. **Reference:** 13.
  **Current state:** Partial local debug delivery; broader acceptance open.


- [ ] **OP08 — App icons and consistent Android app identity**
  **Owners:** T32 Android identity and device checks; T31 desktop icon packaging.
  **Priority:** User-requested near-term work alongside the existing delivery sequence.
  **Complete when:** A reusable icon source and platform exports exist; Android
  launcher/adaptive/themed icons, splash, recent-apps appearance and app labels
  are consistent; `com.spacecadet.superchat` is preserved; replacement-install
  data continuity and device appearance are checked. Matching desktop icons
  are wired into packaging, with desktop runtime appearance recorded separately.
  **Current state:** In progress. The reusable master is
  `apps/standalone/resources/icon.png`, copied from selected concept 13. Android
  legacy/adaptive raster resources are packaged, and the debug APK was installed
  on `.108` with `com.spacecadet.superchat` and the `Super Chat` label. Visual
  appearance and data continuity remain unchecked; monochrome/themed icons,
  splash/recent-app alignment, and desktop exports/package wiring remain open.
  See T32 for build and install evidence.


## Tool and reference coverage rules

The checklist covers feature-map sections 2–12; section 13 is the final acceptance
checklist and section 14 qualifies support. Section 1 defines scope. Keep the
complete external map as the detailed specification, including its examples and
subrequirements; checklist items group work without discarding those details.

The standalone does not copy Obsidian branding, vault-only API names, or plugin
updater behavior as generic features. Generic resource actions still get visible
availability states. Optional host integrations get an explicit adapter and
configuration outcome. Reference branch features (notably tags/normalization)
remain listed and require current-source verification before implementation.

Independent agent lifecycles/emergent dynamics beyond ordinary multi-agent chat
remain T6 research extensions; they do not delay the reference chat behavior.
iOS needs its own platform owner if requested. No new task IDs are created by
this consolidation; detailed gaps should become subtasks under the owners above.

## Recording progress and completion

For each implemented group:

1. Record the row IDs, source paths and reference behavior in its existing task.
2. Record focused automated checks, package/build result, installed artifact,
   device interaction and user confirmation as distinct evidence.
3. Change each item's baseline to partial, implemented, or accepted with an evidence
   link. Acceptance names the host and supported provider/capability cases.
4. Update this plan's delivery stage and next executable work, then the owning
   task, INFRA-1, registry and current session/cache. Do not duplicate independent
   delivery sequences in each task.
5. Finish by checking the reference map's full section 13 and the product rules
   above across supported hosts. A build, screenshot or working single request
   does not close unrelated feature items.

## Supporting implementation documents

- [UI structure and layouts](../apps/standalone/UI-STRUCTURE.md)
- [Capability extraction ownership](implementation-details/obsidian-ai-capability-matrix.md)
- [Public host/UI contract](implementation-details/public-interface-components.md)
- [Session persistence](implementation-details/session-persistence.md)
- [Model history and context](implementation-details/model-history-and-context.md)
- [Provider profiles](implementation-details/provider-profiles-and-switching.md)
- [Tools](implementation-details/agentic-tool-runtime.md) and [retrieval](implementation-details/agentic-rag-evidence.md)
- [Attachments](implementation-details/attachments-and-context.md), [memory](implementation-details/memory-and-pruning.md), [archive exchange](implementation-details/session-export-import.md)
- [Android](implementation-details/standalone-android.md) and [desktop](implementation-details/standalone-desktop.md)

Text Memory Bank files remain authoritative. The plan records feature coverage
and acceptance state; platform task and session records hold detailed source,
build, device, and runtime evidence.
