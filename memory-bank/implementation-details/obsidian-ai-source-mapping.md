# Obsidian-AI current-source feature mapping

*Checked: 2026-11-20 14:34:26 IST*

*Owner: T15; execution checklist: [master plan](../master-plan.md)*

Reference checkout: `/Users/deepak/code/obsidian-ai`, commit
`7b7e73560281e11e4a9a68faafc0b2f692c75b4d`. Super Chat base:
`056457ab1225e4625e9d5df565e6e883fb926a62`, with this session's uncommitted
planning changes. The reference has unrelated Memory Bank edits; no reference
files were modified. This is a source inventory and initial comparison, not
runtime acceptance or a claim that every implementation detail is reconciled.

The screenshot supplied on 2026-11-20 shows the Super Chat Settings section
index. It supports visible section coverage only; the existing
[Settings inventory](settings-port-inventory.md) remains the control-level record.

## Source groups and existing owners

Reference paths below are relative to `obsidian-ai/src/`; destination paths are
relative to this repository. Missing parity evidence stays open in the master
plan. No second execution backlog is maintained here.

| Source group | Reference source | Super Chat source | Checklist and owner | Source finding / remaining comparison |
|---|---|---|---|---|
| Workspace and toolbar | components/ChatApp.tsx; components/ChatToolbar.tsx; components/ChatOverlays.tsx | src/react/components/ChatApp.tsx | UI01/UI12 · T22/T8 | Partial; Agents, Sync and Zen buttons explicitly disabled. First-run branding and overlays still need comparison. |
| Transcript rendering and actions | components/ChatMessages.tsx; components/MessageBubble.tsx; components/scrollableMarkdownTables.ts | src/react/components/MessageBubble.tsx; src/react/components/MarkdownRenderer.tsx | UI03–UI05/UI09–UI11 · T22/T8/T29 | Markdown, GFM and KaTeX rendering and message actions present; reference navigation, overflow, attribution and usage require focused checks. |
| Follow latest and search targets | components/ChatMessages.tsx; hooks/useSearch.ts | src/react/components/ChatApp.tsx; src/react/hooks/useSearch.ts | UI06/SE04 · T22/T8/T25 | Source has ResizeObserver, follow/scroll-up state, return-to-latest, matched-message scroll and highlight. Runtime/reload acceptance open. |
| Composer and reference decoration | components/ChatInput.tsx; components/ChatInputDecorations.tsx; lib/slashCommand.ts | src/react/components/ChatInput.tsx; src/react/components/ChatInputAttachments.tsx | UI07/UI08/CX01/CX02 · T22/T7/T27 | Composer and attachments present; resource mentions/decorations and adapter action shortcuts need detailed contract comparison. |
| Tabs, drafts and workspace | components/ChatTabBar.tsx; hooks/useChatSession.ts; hooks/useChatRuntimeState.ts | src/react/components/ChatTabBar.tsx; src/react/hooks/useChat.ts; src/core/ChatEngine.ts | SE01/SE02/OP02 · T22/T27/T28 | Draft/tab/scroll persistence exists; full per-session state and interruption checks remain open. |
| History, search and tags | hooks/useSessionActions.ts; hooks/useSearch.ts; components/presentational/SessionPickerModal.tsx; lib/sessionTags.ts; lib/sessionTagNormalization.ts | src/react/components/presentational/SessionPickerModal.tsx; src/react/hooks/useSearch.ts; src/search/fuzzy-search.ts; src/core/sessionTags.ts | SE03/SE04/SE07/SE08 · T22/T30/T25 | Rename, confirmed deletion, manual tag add/remove/create, tag filter/count and search are wired. Bulk suggestions/global normalization and tool routes remain open. |
| Archive exchange | hooks/useExportActions.ts; utils/exportChat.ts; utils/importChat.ts | src/utils/exportChat.ts; src/utils/importChat.ts; apps/standalone/src/dataManagement.ts | SE05/SE06 · T30/T22 | Shared archive paths and standalone management exist; migration/collision/no-execution and device round trips require verification. |
| Retention and stale snapshots | storage/ChatStorage.ts; storage/Migration.ts | apps/standalone/src/persistence.ts; src/core/sessionPersistence.ts; src/sync/SyncEngine.ts | SE09/OP02/CO05 · T22/T30 | Reference storage explicitly honours deleted-session tombstones. Standalone deleteSession directly deletes the record and saveSession puts it; local stale-write protection and retention need characterization. Sync deletion code is separate evidence. |
| Provider profiles and models | settings-sections/providerProfiles.ts; components/presentational/ModelSwitcher.tsx; lib/recentModels.ts; lib/sessionProfile.ts; api/providers.ts | apps/standalone/src/providerSettings.ts; apps/standalone/src/screens/ProviderSettingsScreen.tsx; src/react/components/ChatApp.tsx | PR01–PR04 · T28/T22/T31/T32 | Profile routing and manual/static model choices present; provider discovery/cache/recents and complete fallback behavior need comparison. |
| Thinking, streaming and usage | api/thinkingModes.ts; api/streaming.ts; lib/usageStats.ts | src/adapters/VercelLLMAdapter.ts; apps/standalone/src/llm.ts; src/core/AgentLoop.ts | PR05–PR07/UI03/UI05/CX10 · T28/T22/T29 | Basic streaming and thinking/request estimates present; actual usage, resolved identity and provider capability calibration remain open. |
| Context resolution and embeds | hooks/useContextItems.ts; components/ContextPickerModal.tsx; context/ContextEngine.ts; context/embedExpander.ts | src/context/contextBudget.ts; src/contracts/host.ts | CX01–CX04/CX07 · T27/T16/T15/T7 | Budget/host foundations exist; selected resources, current-resource refresh, picker and embed integration need focused mapping. |
| Attachments and provider parts | context/AttachmentEngine.ts; lib/modelContent.ts | src/context/AttachmentEngine.ts; src/adapters/VercelLLMAdapter.ts; apps/standalone/src/searchDocuments.ts | CX05/CX06 · T27/T28/T31/T32 | Resolution/conversion/PDF paths present; limits, captured replay inputs and host file access remain open. |
| Context history and full tool results | context/modelHistory.ts; context/toolResultCatalog.ts; context/toolResultProjection.ts; context/toolResultReference.ts; context/semanticCompaction.ts | src/adapters/VercelLLMAdapter.ts; src/core/ChatTurnOutput.ts; src/core/AgentLoop.ts | CX07/CX08/TL09 · T15/T25/T26 | History budgeting exists; full-result read route and references need completion; advanced compaction remains subject to the existing simple-first policy. |
| Memory and persona | intelligence/ThreeTierMemoryStore.ts; intelligence/MemoryOptimizer.ts; intelligence/PersonaLoader.ts; components/presentational/AIPruneModal.tsx | src/memory/ThreeTierMemoryStore.ts; src/memory/MemoryToolProvider.ts; apps/standalone/src/memory.ts | CX09/TL04/TL05 · T26/T25/T29 | Eight memory definitions present, audit access conditional; AI pruning and explicit agent-prompt read/update/reset tools remain open. |
| Tool definitions and discovery | agent/tools.ts; agent/toolRegistry.ts; integrations/ProviderRegistry.ts | src/adapters/HostAdapters.ts; src/contracts/host.ts; apps/standalone/src/hosts/createStandaloneHost.ts | TL01/TL06 · T25/T15 | Current reference catalogue inventoried below; standalone composes local, memory and web/PDF providers. External-provider parity still needs focused characterization. |
| Approval, ordered execution and writes | agent/ToolExecutor.ts; agent/targetLocks.ts; agent/ChatTurnCoordinator.ts; agent/AgentLoop.ts | src/core/ToolExecutor.ts; src/core/AgentLoop.ts; src/core/ChatTurnOutput.ts; src/react/components/PendingToolCard.tsx | TL07/TL08/PR07 · T25/T15/T22 | Shared execution/approval foundations exist; exact reference policy, target serialization, cancellation and multi-call behavior require tests before parity claims. |
| Repository tools and retrieval | agent/tools/handlers/noteHandlers.ts; agent/tools/handlers/vaultHandlers.ts; agent/tools/handlers/discoveryHandlers.ts; agent/tools/handlers/bulkHandlers.ts; agent/tools/handlers/DataviewHandlers.ts | src/core/retrieval.ts; src/contracts/host.ts | TL02/TL10 · T25/T16/T18/T31/T32 | Repository operations belong to host capabilities. Dataview remains an optional Obsidian-specific dependency; standalone must not advertise unsupported operations. |
| Web search and PDF | agent/tools/handlers/webHandlers.ts | apps/standalone/src/searchDocuments.ts; src/documents/PdfExtractor.ts | TL03 · T25/T16/T27 | Both standalone routes registered; endpoint/device checks open. |
| Session and tag tools | agent/tools/handlers/sessionHandlers.ts | src/core/ChatEngine.ts; src/core/sessionTags.ts | TL04/SE04/SE07/SE08 · T25/T22/T30 | Underlying UI/storage operations exist, but standalone composition has no session/tag tool provider. |
| Settings, identity and prompt tools | agent/tools/handlers/settingsHandlers.ts; lib/selfSettingsTools.ts | apps/standalone/src/appSettings.ts; apps/standalone/src/hosts/createStandaloneHost.ts | TL05 · T25/T29/T26 | Settings UI is not a tool route. Sanitized reads, allow-listed changes, app identity and prompt CRUD need explicit host-backed implementation. |
| Multi-agent and remote responses | agent/Orchestrator.ts; agent/ParticipantRouter.ts; agent/OpenResponsesLoop.ts; api/AgentApiManager.ts; api/OpenResponsesParser.ts | src/core/Orchestrator.ts; src/core/AgentInbox.ts; src/core/Topology.ts | CO01/CO02/PR04 · T6/T7/T28/T15 | Shared orchestration foundations exist; standalone Agents control disabled. Remote-response and participant integration not accepted. |
| Saved-chat sync | sync/SyncEngine.ts; sync/PluginFileSyncManager.ts; sync/WebDAVStorageAdapter.ts | src/sync/SyncEngine.ts; apps/standalone/src/dataManagement.ts | CO05/OP02 · T22/T31/T32 | Copied sync/settings paths exist; chat toolbar Sync disabled, and live WebDAV/conflict/deletion/recovery checks remain open. |
| Commands and diagnostics | lib/builtinCommands.ts; lib/debugCommands.ts; settings-sections/chatCommands.ts | src/lib/builtinCommands.ts; src/lib/localCommands.ts; apps/standalone/src/settingsPortTools.ts | OP01/OP05/CX08 · T22/T29/T26 | Local command dispatcher and diagnostic settings exist; listing a command does not prove its operation. Manual compaction remains unavailable. |
| Settings registry and host integration | settings-sections/; host/ObsidianChatHost.ts; views/ObsidianAIChatView.ts | apps/standalone/src/screens/SettingsScreen.tsx; apps/standalone/src/hosts/createStandaloneHost.ts | OP01/OP03/OP04/OP06/OP07 · T15/T22/T18/T31/T32 | Use the existing 15-section Settings inventory; native permissions, credentials, persistence and Obsidian host acceptance remain separate. |

## Current built-in tool catalogue

Extracted from the exported `noteTools` object in `src/agent/tools.ts`, rather
than from comments, the risk map or the dated tool count. Availability is also
conditional: memory audit requires its setting; mutation of settings/agent
prompt requires developer mode; Dataview requires that plugin. External
provider tools are dynamic and are outside this static catalogue.

“Present” below means a corresponding standalone tool definition is wired;
it does not assert identical schemas/results, policy or live acceptance.

| Reference tool | Existing checklist / owner | Standalone mapping |
|---|---|---|
| `read_note` | TL02 · T25/T18/T31/T32 | Host repository capability; no standalone repository provider |
| `edit_note` | TL02 · T25/T18/T31/T32 | Host repository capability; no standalone repository provider |
| `append_to_note` | TL02 · T25/T18/T31/T32 | Host repository capability; no standalone repository provider |
| `create_note` | TL02 · T25/T18/T31/T32 | Host repository capability; no standalone repository provider |
| `create_notes` | TL02 · T25/T18/T31/T32 | Host repository capability; no standalone repository provider |
| `patch_note` | TL02 · T25/T18/T31/T32 | Host repository capability; no standalone repository provider |
| `edit_section` | TL02 · T25/T18/T31/T32 | Host repository capability; no standalone repository provider |
| `search_notes` | TL02 · T25/T18/T31/T32 | Host repository capability; no standalone repository provider |
| `list_notes` | TL02 · T25/T18/T31/T32 | Host repository capability; no standalone repository provider |
| `count_notes` | TL02 · T25/T18/T31/T32 | Host repository capability; no standalone repository provider |
| `get_note_metadata` | TL02 · T25/T18/T31/T32 | Host repository capability; no standalone repository provider |
| `query_dataview` | TL02 · T25/T18 | Obsidian-only optional adapter; no generic Dataview dependency |
| `create_folder` | TL02 · T25/T18/T31/T32 | Host repository capability; no standalone repository provider |
| `move_note` | TL02 · T25/T18/T31/T32 | Host repository capability; no standalone repository provider |
| `delete_note` | TL02 · T25/T18/T31/T32 | Host repository capability; no standalone repository provider |
| `list_folders` | TL02 · T25/T18/T31/T32 | Host repository capability; no standalone repository provider |
| `check_paths` | TL02 · T25/T18/T31/T32 | Host repository capability; no standalone repository provider |
| `search_web` | TL03 · T25/T16/T27 | Present in standalone search/document provider; endpoint/parity checks open |
| `read_pdf` | TL03 · T25/T16/T27 | Present in standalone search/document provider; endpoint/parity checks open |
| `create_memory` | TL04/CX09 · T26/T25 | Present in MemoryToolProvider; audit conditional; parity/live checks open |
| `update_memory` | TL04/CX09 · T26/T25 | Present in MemoryToolProvider; audit conditional; parity/live checks open |
| `delete_memory` | TL04/CX09 · T26/T25 | Present in MemoryToolProvider; audit conditional; parity/live checks open |
| `list_memories` | TL04/CX09 · T26/T25 | Present in MemoryToolProvider; audit conditional; parity/live checks open |
| `search_memories` | TL04/CX09 · T26/T25 | Present in MemoryToolProvider; audit conditional; parity/live checks open |
| `read_memory_audit` | TL04/CX09 · T26/T25 | Present in MemoryToolProvider; audit conditional; parity/live checks open |
| `evaluate_staged` | TL04/CX09 · T26/T25 | Present in MemoryToolProvider; audit conditional; parity/live checks open |
| `cull_core` | TL04/CX09 · T26/T25 | Present in MemoryToolProvider; audit conditional; parity/live checks open |
| `search_note_content` | TL02 · T25/T18/T31/T32 | Host repository capability; no standalone repository provider |
| `search_past_sessions` | TL04/SE04/SE07/SE08 · T25/T22/T30 | No standalone session-tool provider; adapt storage/UI behavior |
| `list_chat_sessions` | TL04/SE04/SE07/SE08 · T25/T22/T30 | No standalone session-tool provider; adapt storage/UI behavior |
| `list_session_tags` | TL04/SE04/SE07/SE08 · T25/T22/T30 | No standalone session-tool provider; adapt storage/UI behavior |
| `add_session_tags` | TL04/SE04/SE07/SE08 · T25/T22/T30 | No standalone session-tool provider; adapt storage/UI behavior |
| `rename_session_tag` | TL04/SE04/SE07/SE08 · T25/T22/T30 | No standalone session-tool provider; adapt storage/UI behavior |
| `remove_session_tags` | TL04/SE04/SE07/SE08 · T25/T22/T30 | No standalone session-tool provider; adapt storage/UI behavior |
| `read_chat_session` | TL04/SE04/SE07/SE08 · T25/T22/T30 | No standalone session-tool provider; adapt storage/UI behavior |
| `rename_chat_session` | TL04/SE04/SE07/SE08 · T25/T22/T30 | No standalone session-tool provider; adapt storage/UI behavior |
| `open_chat_session` | TL04/SE04/SE07/SE08 · T25/T22/T30 | No standalone session-tool provider; adapt storage/UI behavior |
| `delete_chat_session` | TL04/SE04/SE07/SE08 · T25/T22/T30 | No standalone session-tool provider; adapt storage/UI behavior |
| `read_tool_result` | TL09 · T25/T15/T26 | No standalone route; preserve complete result and add bounded retrieval |
| `read_settings` | TL05 · T25/T29/T26 | No standalone route; neutral settings/prompt/identity contract needed |
| `get_agent_prompt` | TL05 · T25/T29/T26 | No standalone route; neutral settings/prompt/identity contract needed |
| `update_agent_prompt` | TL05 · T25/T29/T26 | No standalone route; neutral settings/prompt/identity contract needed |
| `reset_agent_prompt` | TL05 · T25/T29/T26 | No standalone route; neutral settings/prompt/identity contract needed |
| `update_setting` | TL05 · T25/T29/T26 | No standalone route; neutral settings/prompt/identity contract needed |
| `get_plugin_info` | TL05 · T25/T29/T26 | No standalone route; neutral settings/prompt/identity contract needed |

Catalogue count: **45 built-in tools**; **10 corresponding
standalone definitions** across memory and search/PDF. The standalone also
adds `calculate` and `get_current_time`, which are not reference tools.

## Corrections carried into the master plan

- UI06: follow-latest, late layout observation and return-to-latest source exist.
- SE03/SE04: history rename/confirmed deletion and search-message jump/highlight
  are wired; remaining work includes durable/reload and interaction acceptance.
- SE07: manual tag create/add/remove, filtering and counts are wired through
  `ChatApp` to session metadata; global normalization/bulk generation remains open.
- SE09: local stale-save deletion protection must be checked independently of
  the copied sync engine's tombstones.
- TL04: name the full session-management tool family, not only past-session search.
- TL05: explicitly include agent-prompt read/update/reset with controlled mutation.

## Remaining audit boundary

The 24 groups above assign the inspected source families to existing owners.
T15's source-wide completion remains unchecked: detailed call-site and test
comparison, remote-human relay transport, provider-specific behavior, optional
integrations and host command registration still need focused passes. Preserve
branch-prototype qualifications from the dated capability map. Inline-editor
prompt history/diff behavior stays outside the chat extraction; vault/editor,
Dataview, plugin updater and plugin lifecycle stay with the Obsidian host.
No source features were implemented or accepted by this mapping pass.
