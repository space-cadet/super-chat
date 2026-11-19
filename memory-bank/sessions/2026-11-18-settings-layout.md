# T22 Settings Accordion Layout

*Date: 2026-11-18 17:05:30 IST*
*Source branch: `main`*
*Source commit at Memory Bank update: `c006a6a245918b772e35859a794378cfe4f99d84`*

## Change

Changed the standalone Settings page from a category switcher to one scrolling
page with Providers, Chat, Tools, and Memory sections. Each section is an
independent accordion with an accessible expanded state. Open section IDs are
stored through `standaloneSettingsStore` under
`standalone.settings-open-sections`, so the choice is restored from IndexedDB.
Providers opens by default on first use; an explicitly saved empty list keeps
all sections closed. Section contents stay mounted while collapsed, preserving
form drafts.

The layout follows the one-page, collapsible Settings pattern in med-docs-v2,
using Super Chat's existing standalone storage and styling.

## Checks

No build, test, or device visual check was run for this change.

## Follow-up

OP01 remains in progress. Add persisted behavior for tab restoration,
conversation naming/tags/retention, and remaining thinking/usage preferences.
Broader Settings and Android interaction acceptance remain open.
