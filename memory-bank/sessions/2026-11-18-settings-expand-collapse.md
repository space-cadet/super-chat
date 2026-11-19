# T15/T22 Settings Expand and Collapse All — 2026-11-18

*Date: 2026-11-18 19:04:59 IST*
*Branch: `main`*
*Source commit: `c006a6a245918b772e35859a794378cfe4f99d84`*
*Obsidian-AI reference commit: `7b7e73560281e11e4a9a68faafc0b2f692c75b4d`*

## Ported behavior

- Added source-style Expand all and Collapse all controls above the standalone
  Settings groups.
- Both controls update the existing open-section state. The existing persistence
  effect writes that state to IndexedDB, including when every group is closed.
- The controls currently apply to Providers, Chat, Tools, and Memory. Other
  source groups and the search, advanced-settings switch, section index, nested
  collapse state, and per-section error behavior remain open.

## Checks

No tests, typechecks, builds, or device checks were run for this code slice.
