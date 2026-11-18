# Super Chat Master Delivery Plan

*Updated: 2026-11-18 10:59:33 IST*
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

The [platform architecture](implementation-details/embeddable-super-chat-platform.md)
continues to define shared versus host responsibilities. This plan supplies the
execution order and feature checklist. INFRA-1's older numbered phases remain
historical progress records. Arxivite's external-host migration is retired;
fixture, Android, desktop, and Obsidian remain the active targets.

## Product rules

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

The worktree is on `main`. The provider/profile, toolbar, connection-test,
Android backup and master-plan changes are recorded in the current session
commit; broader acceptance remains open.

- Shared session/turn storage, model history, cancellation/replay foundations,
  host contracts, and local tool integration already have implementation records.
- Named provider profiles, a default for new chats, per-chat profile/model fields,
  and request routing are present. Model discovery and a full model picker still
  need work.
- Android debug builds and repeated ADB updates to the OPPO CPH2661IN at `.108`
  succeeded during this session. The connection test now reads SDK error events
  and allows bounded reasoning/output with a timeout.
- User screenshots `142484.jpg` and `142490.jpg` show OpenRouter selected and
  actual assistant responses to Hello and a supersymmetry question. This confirms
  basic live chat on Android. The truncated model field does not establish the
  exact effective model. Profile switching across chats, restart recovery, and
  live tool execution still require their own checks.
- Those screenshots also show cramped provider/model controls and a clipped
  composer placeholder. The toolbar includes disabled unfinished actions. The
  green setup banner and redundant title row were removed.

## Delivery sequence

Each stage ends with its listed user-visible behavior working, focused automated
checks where meaningful, and Android interaction checks on `.108`. Keep completed
foundations; extend the existing paths. Release work must not block ordinary
local UI fixes, and later stages can reuse dependencies already implemented.

- [ ] **Stage 1 — Usable workspace** — Toolbar, profile/model identity, composer sizing, visible message actions, readable transcript and scrolling.
  **Owners:** T22, T8, T28; Android T32.
  **Complete when:** Controls fit mobile widths; model identity is readable; no banner displaces chat; typing, multiline, Send/Stop and touch actions work without clipping.

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


### Next executable work

Start Stage 1 with the defects visible in the supplied Android screenshots:

- [ ] Keep the full action row visible with consistent SVG icons, readable labels or
   accessible descriptions, touch targets, and clear disabled explanations.
- [ ] Replace the cramped provider/model fields with a compact picker and readable
   active identity; keep manual model entry accessible and profile-specific.
- [ ] Fix composer height, placeholder clipping, multiline growth, keyboard insets,
   and visible Send/Stop state; preserve text while changing chats.
- [ ] Verify message actions and Markdown/code/math/table sizing, transcript follow,
   scroll-up reading, and the visible return-to-latest control.
- [ ] Build, install, and interact with both unconfigured and configured states on
   `.108`; record outcomes against the checklist below.

Before changing each area, inspect its current source against the reference and
replace “Compare” below with implemented, partial, or missing plus exact evidence.
This is a targeted part of implementation, not a prerequisite full rewrite.

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
  **Current state:** Partial; current toolbar wraps, uses mixed icons, and has unfinished disabled controls.

- [ ] **UI02 — Compact model picker plus readable profile/provider/model identity; all actions reachable at narrow widths**
  **Owner:** T28/T22. **Reference:** 3.1, 6.1.
  **Current state:** Partial; configured controls are truncated on device.

- [ ] **UI03 — Attributed user, assistant, agent, human and diagnostic messages; timestamp, model, duration, real usage or labelled estimates**
  **Owner:** T22/T8/T29. **Reference:** 3.2.
  **Current state:** Partial; user/assistant messages and token display seen; full metadata comparison needed.

- [ ] **UI04 — Markdown, links, code, tables, equations, files and references render; wide content scrolls within its block**
  **Owner:** T22/T8. **Reference:** 3.2.
  **Current state:** Compare.

- [ ] **UI05 — Honest generation/tool/approval/error/cancel states and generating-tab markers; separate reasoning display with a visible control**
  **Owner:** T22/T25/T28. **Reference:** 3.2, 5.
  **Current state:** Partial; live reply works; remaining state/display comparison needed.

- [ ] **UI06 — Follow latest and late layout changes; preserve position when reading up; visible return-to-latest control**
  **Owner:** T22/T8. **Reference:** 3.2, 12.
  **Current state:** Compare.

- [ ] **UI07 — Multiline auto-growing composer, caret/input correctness, placeholder, keyboard/safe areas and configurable send shortcuts**
  **Owner:** T22/T8/T32. **Reference:** 3.3.
  **Current state:** Partial; placeholder clipping observed.

- [ ] **UI08 — Visible Send and Stop controls with correct enabled state; stopping settles approval, tools and model continuation**
  **Owner:** T22/T25. **Reference:** 3.3, 5.
  **Current state:** Partial; engine foundation recorded; complete mobile flow needs checking.

- [ ] **UI09 — Copy, edit/resubmit/cancel-edit, retry on selected message/history; no draft leakage**
  **Owner:** T22/T8. **Reference:** 3.3, 3.5.
  **Current state:** Partial; replay foundation exists; action behavior needs comparison.

- [ ] **UI10 — Touch/keyboard multi-message selection, copy as Markdown, cancel and reset on session switch**
  **Owner:** T22/T8/T30. **Reference:** 3.5.
  **Current state:** Compare.

- [ ] **UI11 — Visible host actions for create/update/append/review/insert, source target retained, permissions explained**
  **Owner:** T22/T8/T25. **Reference:** 3.5, 8.1.
  **Current state:** Compare; execution depends on host capabilities.

- [ ] **UI12 — Empty/first-run/loading/error layouts, focus management and announcements; theme and responsive layouts consistent across hosts**
  **Owner:** T22/T8. **Reference:** 3, 12.
  **Current state:** Partial; initial chat exists; reconcile first-run reference with standalone branding.


### Sessions, history and exchange

- [ ] **SE01 — New unsent draft stays out of saved history; duplicate opens avoided; tab close differs from confirmed deletion**
  **Owner:** T22. **Reference:** 2, 4.1.
  **Current state:** Partial; existing session/tab foundation.

- [ ] **SE02 — Per-chat text draft, attachments, context, profile/models, participants, thinking, tabs and scroll restored; closing last tab gives clean new chat**
  **Owner:** T22/T27/T28. **Reference:** 2, 4.1, 11.
  **Current state:** Partial; profile/model persistence present; full restoration comparison needed.

- [ ] **SE03 — Searchable recent-history list: title, count, excerpt, date, usage; load, manual rename, delete and configurable auto-name with fallback**
  **Owner:** T22/T8. **Reference:** 4.2.
  **Current state:** Partial; basic sidebar exists; history feature comparison needed.

- [ ] **SE04 — Full saved-message search; open/highlight matching message; past-session tool excludes current session**
  **Owner:** T22/T25. **Reference:** 4.3.
  **Current state:** Compare; search UI currently disabled.

- [ ] **SE05 — Single message/selection/session/bulk copy and export in Markdown, JSON and JSONL as applicable**
  **Owner:** T30/T22. **Reference:** 4.2.
  **Current state:** Planned; exact formats must be reconciled with reference.

- [ ] **SE06 — Validated JSON/JSONL archive import, schema migration, ID collisions create copies; imports never run tools**
  **Owner:** T30. **Reference:** 4.2, 11.
  **Current state:** Planned.

- [ ] **SE07 — Session tags: manual/model-assisted tags, filter/count, manage/search/create/remove; persistence and archive inclusion**
  **Owner:** T22/T30/T25. **Reference:** 4.2.
  **Current state:** Compare; reference includes prototype/branch qualifications.

- [ ] **SE08 — Reviewable tag normalization and optional tag-name-only suggestions, stale-plan rejection, retry and preserved transcripts**
  **Owner:** T22/T30. **Reference:** 4.2.
  **Current state:** Compare; reference branch work requires current source check.

- [ ] **SE09 — Retention controls and explicit deletion records prevent old snapshots restoring deleted sessions**
  **Owner:** T22/T30. **Reference:** 4.2, 11.
  **Current state:** Compare.


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
  **Current state:** Compare.

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
  **Current state:** Planned.

- [ ] **CX06 — Provider-compatible parts, page/resize/size/type limits, preserved captured content for replay; same captured input for group requests**
  **Owner:** T27/T28. **Reference:** 5, 7.2.
  **Current state:** Planned.

- [ ] **CX07 — Persona, memory, context, history and tools within budgets/reserves; keep pairs valid and complete local transcript intact**
  **Owner:** T15/T16/T25/T26. **Reference:** 7.1, 9.
  **Current state:** Partial; chronology/result/context foundation recorded.

- [ ] **CX08 — Measured need determines summary/compaction; preserve originals, summary source links, continuation and full-result retrieval**
  **Owner:** T26/T15/T25. **Reference:** 7.1, 9.
  **Current state:** Planned; retain existing simple-first context policy.

- [ ] **CX09 — Memory tiers, CRUD/search/audit/promotion/archive, relevant prompt injection, reversible AI pruning**
  **Owner:** T26. **Reference:** 7.1, 8.2.
  **Current state:** Planned.

- [ ] **CX10 — Request token estimate includes tools and attachments, image estimate labelled, actual usage distinguished**
  **Owner:** T29/T27/T28. **Reference:** 3.3, 9.
  **Current state:** Compare.


### Tool catalog, execution and evidence

- [ ] **TL01 — Reconcile every current tool family against source; map generic operations to host capability and owner instead of freezing the old 31-tool count**
  **Owner:** T25/T15. **Reference:** 8.1–8.2.
  **Current state:** Partial; composition exists; current full inventory open.

- [ ] **TL02 — Repository read/inspect, browse/search/list/count, reference/resolve, supported queries, create/update/patch/append/section, organize/move/delete**
  **Owner:** T25/T18/T32/T31. **Reference:** 8.1–8.2.
  **Current state:** Planned by host support; unavailable controls visible; optional Dataview remains Obsidian-only.

- [ ] **TL03 — Web search and PDF read with bounded results/pages and visible backend configuration**
  **Owner:** T25/T16/T27. **Reference:** 8.2.
  **Current state:** Planned; basic chat alone does not demonstrate web search.

- [ ] **TL04 — Memory tools, past-session search, tag tools and full stored-result retrieval**
  **Owner:** T26/T25/T22. **Reference:** 8.2.
  **Current state:** Planned/compare.

- [ ] **TL05 — Sanitized read-settings, allow-listed setting changes and capability/identity reporting for this app**
  **Owner:** T25/T29. **Reference:** 8.2.
  **Current state:** Planned/compare; adapt get_plugin_info to host identity.

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

- [ ] **OP01 — Visible configurable persona, send behavior, tab restoration, naming/tags/retention, tools/approval/steps, budgets, thinking and usage options**
  **Owner:** T22 plus feature owners. **Reference:** 9.
  **Current state:** Partial provider settings; full settings comparison open.

- [ ] **OP02 — Durable sessions, drafts, parts, index/transcript hydration, no empty overwrite of unloaded data, migration and corruption recovery**
  **Owner:** T22/T30/T32/T31. **Reference:** 10–11.
  **Current state:** Partial IndexedDB/turn foundation; lazy loading and restart cases open.

- [ ] **OP03 — Android lifecycle/process death/offline/backup, protected-key failure and permission-aware file/share behavior**
  **Owner:** T32. **Reference:** 11.
  **Current state:** Partial; backup exclusions and live chat present; recovery/permission cases open.

- [ ] **OP04 — Keyboard, touch/long-press, accessible labels, focus, status announcements, cancellation and narrow layouts**
  **Owner:** T22/T8/T32/T31. **Reference:** 12.
  **Current state:** Partial; current clipping defects listed in Stage 1.

- [ ] **OP05 — Correlated/redacted provider/tool/context/storage diagnostics, opt-in telemetry fields and safe export**
  **Owner:** T29. **Reference:** 9, 12.
  **Current state:** Planned; native device diagnostics alone do not satisfy this.

- [ ] **OP06 — Host credential storage, explicit data destinations, secret-free archives/logs and secure room identity**
  **Owner:** T28/T29/T30/T31/T32. **Reference:** 10, 12.
  **Current state:** Partial Android credential storage; broader coverage open.

- [ ] **OP07 — Versioned package and host adoption, accepted source/artifact identity, signing, Android/desktop/Obsidian checks**
  **Owner:** T21/T18/T31/T32. **Reference:** 13.
  **Current state:** Partial local debug delivery; broader acceptance open.


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

Text Memory Bank files remain authoritative. This consolidation updates planning
and evidence only; no application source, build, install or tests are run by the
planning change.
