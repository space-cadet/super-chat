# Standalone UI Structure

**Status:** Supporting layout specification; delivery order and feature checklist
are in the [Master Delivery Plan](../../memory-bank/master-plan.md).

**Scope:** shared standalone interface for Android, desktop, and browser

**Reference:** Obsidian-AI's [Chat Component Capability Map](../../../obsidian-ai/memory-bank/implementation-details/chat-component-capability-map.md) is the behavior inventory. Adapt host-specific features to the standalone app; do not reproduce Obsidian-only controls.

## One shared UI

This plan describes one React interface shared by browser, Android, and desktop builds. Every build has the same destinations, features, and interaction patterns. Layout changes with screen size: for example, navigation uses a drawer on phones and a rail on wide screens, while History uses a full-page list on phones and a split view on wide screens. These are responsive arrangements of the same UI, not separate apps or competing chat interfaces.

The visual treatment can vary by platform. Share the core colors, typography, and component language, then tune spacing, control styling, navigation, menus, motion, and system integration to feel right on Android, desktop, or browser. A platform theme should change presentation without changing where features live or how a task works. System/light/dark appearance remains a user setting.

## Product boundary

The current standalone build mounts `SuperChatApp` with local sessions and settings, host tools, and configurable provider profiles. Android stores provider keys in Keystore; desktop and browser do not currently expose protected credential storage. The Android debug build and TypeScript checks pass. User screenshots on 2026-11-18 confirm basic live OpenRouter chat on Android; broader model-switching, credential recovery, and restart checks remain open. The [standalone Android notes](../../memory-bank/implementation-details/standalone-android.md) record the platform boundary.

Design the full chat experience as a target, while making the current state honest:

- With no provider configured, show an empty chat and a clear route to provider setup. Do not display assistant content in this state.
- Keep every control visible, including unconfigured and unavailable actions. Show an explained disabled state in its expected location. Do not omit actions by capability, profile presence, hover, or screen width.
- Keep repository actions generic. Keep file/source controls visible and explain unavailable host access; do not assume an Obsidian vault, wikilinks, or Dataview.
- Treat persisted chat history, live collaboration, and cross-device sync as separate features with separate controls and status.

## App navigation

Use one application shell with these destinations:

1. **Chat** — active conversation workspace.
2. **History** — saved conversations, search, and session actions.
3. **Diagnostics** — existing read-only device and network information.
4. **Settings** — chat, provider, storage, and app preferences.
5. **About** — version and app information.

On Android, open destinations from the navigation drawer and keep the chat composer above the keyboard and system safe areas. On desktop, use a persistent navigation rail or sidebar. Keep chat sessions as tabs inside Chat. History may appear as a full page on narrow screens and as a split pane on wide screens.

## Chat workspace

Keep the main chat in this order:

1. **Action toolbar:** New chat, History, Search, model/profile, Agents, Sync, Zen, Settings and session actions. Keep unavailable actions visible and explained; use consistent SVG icons and touch targets. No setup banner above chat.
2. **Session tabs:** horizontally scrollable on phones, wider on desktop. Each tab shows its title and close action; a generating session gets a clear activity marker.
3. **Chat identity and controls:** readable active provider/model and participant identity, with the toolbar controlling the current conversation. Model suggestions and manual model IDs are available. Keep action entry controls visible; unavailable features are disabled with an explanation.
4. **Context row:** selected files/resources/scopes as removable chips, plus a visible Add context control with explained availability.
5. **Transcript:** one scrollable message list with user/assistant attribution, timestamps, model and usage details when available, Markdown, attachments, and inline tool activity. Preserve scroll position; show Return to latest when the user reads older messages.
6. **Composer:** fixed to the bottom, grows for multiline input, restores the active chat's draft and attachments, and exposes Attach, Context, supported reasoning options, and Send/Stop. Keep it above the Android keyboard.

### Message and turn states

Design each state explicitly, with progress tied to real events:

- Empty first-run chat and ordinary empty chat.
- Sending, streaming, waiting, stopped, completed, and provider error.
- User message actions: copy, edit/resend, and multi-message selection.
- Assistant message actions: copy, retry, and supported host actions.
- Tool requested, approval pending, running, completed, rejected, canceled, and failed. Keep the action and result inline with the conversation.
- Loading a saved session, restoring a draft, and returning to the latest message.

Show provider/model identity, duration, and token/usage details only when the host or provider supplies them; label estimates as estimates.

## History and search

Give History its own searchable view, with a full-page or split-pane presentation by screen width. Include:

- Search across saved conversation messages and jump to the matching message.
- Recent/sorted conversation list with title, short excerpt, last-updated time, and optional message count or usage.
- Open, rename, copy, export, and delete actions. Confirm deletion and distinguish closing a tab from deleting a saved chat.
- Multi-select and bulk export where supported.
- Empty, loading, no-results, and storage-error states.
- Session tags only if standalone storage and settings support them; provide search/filter and a Manage tags dialog.

On mobile, use a dedicated page or full-height sheet. On desktop, use a split view with list and transcript preview.

## Settings

Use a sectioned settings page with focused subpages or dialogs. The current shell has Chat, Settings, and Diagnostics destinations; History and About remain part of the broader design target:

- **Appearance:** system/light/dark.
- **Chat behavior:** Enter-to-send, tab restoration, automatic titles, and other supported defaults.
- **AI providers and models:** add/edit/remove profiles, credentials through protected host storage, connection status, model discovery, and defaults. Keep per-chat model selection in the chat controls.
- **Context and files:** available sources, attachment behavior, and limits; keep sections visible with an explanation when unavailable.
- **Tools and approvals:** available tools and approval behavior. Default to asking before actions; show automatic approval disabled with an explanation until implemented.
- **Memory:** optional chat memory controls when the standalone host supports them.
- **History and backup:** retention, export/import, and local data management.
- **Collaboration and sync:** separate settings for live relay and saved-chat sync; keep controls visible with their setup or unavailable state.
- **Diagnostics and About:** links to the existing diagnostics view and app information.

## Pickers, sheets, and dialogs

The mockup set should cover these reusable overlays:

- Provider profile setup/edit and model selection.
- AI participant selection; human participant selection only when relay is available.
- Context/resource picker and local file picker, with search and removable selections.
- Message action sheet and multi-message selection toolbar.
- Tool approval card/dialog with target, concise action preview, and Approve/Reject.
- Rename session, delete confirmation, export format selection, import progress/results, and tag management when tags are supported.
- Settings choices for appearance and composer behavior.

Keep dialogs task-sized and use full-screen pickers on phones when the list or form needs room.

## Responsive layout

- **Android:** drawer navigation, compact app bar, scrollable session tabs, touch-sized controls, safe-area-aware composer, keyboard-aware scrolling, and file selection through the host when available.
- **Desktop:** persistent navigation, wider history split view, expanded toolbar, keyboard shortcuts, and hover actions with keyboard alternatives.
- **Browser:** use the desktop layout at wide widths and the phone layout at narrow widths.

## Mockup sequence

Create the next mockups in this order:

1. Empty chat with no provider connected.
2. Active multi-tab chat with a real-looking conversation, context chips, message actions, and anchored composer.
3. Streaming/tool approval/result states.
4. History/search with selected-message navigation and session actions.
5. Provider setup and model/participant pickers.
6. Context and attachment picker states.
7. Settings overview and provider/backup details.
8. Diagnostics, preserving its read-only behavior.
9. Mobile and desktop shell comparisons.

The first saved concept set is indexed in [`memory-bank/implementation-details/standalone-ui-mockups.md`](../../memory-bank/implementation-details/standalone-ui-mockups.md). It covers only part of this plan; the remaining active-chat, streaming, picker, and desktop mockups are still to be drawn.
