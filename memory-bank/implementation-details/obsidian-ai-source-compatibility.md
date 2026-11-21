# Obsidian-AI source reuse and compatibility

*Created / updated: 2026-11-21 15:31:01 IST*

*Owners: T15 extraction and comparison; T22 shared app integration; master plan OP01.*

## Canonical conversation format — 2026-11-21

The saved conversation format follows Obsidian-AI `7b7e735`; no previous-chat
format migration was added. See [data parity](obsidian-ai-data-parity.md) for
the implementation and current transfer acceptance.

## Agreed execution rule

The user authorised implementation on 2026-11-20: work through the
[Settings comparison](settings-status-comparison.md) item by item, maximizing
feature availability and reusing Obsidian-AI source unchanged wherever possible.
No feature is omitted because it is missing, disabled or platform-specific.
The [detailed checklist](settings-control-checklist.md) owns row IDs and acceptance;
the master plan remains the execution order, not this technical record.

Begin with PG01. Follow table order; when a row needs supporting work, record
the dependency and affected row IDs, deliver the coherent source group, then
resume. Capture compatibility for the current group before editing; do not
block all implementation on a repository-wide redesign.

## Compatibility contract

Preserve reference structures, types, variable/property names, meanings, defaults,
validation and serialized formats wherever possible. Identical names with different
meanings are incompatibilities, not parity. Reuse complete components/helpers,
styles and focused tests rather than independently rebuilding their behavior.
Copy source unchanged first where practical; limit changes to required imports,
platform calls and integration. Record every necessary adaptation and its reason.
Keep platform objects/APIs in host code; this does not exclude their features.

Maintain existing Super Chat saved data and public consumers. Record migrations
or neutral adapters for existing differences; test round trips and error cases
where data is affected. Known reference defects and source placeholders remain
explicit; do not silently copy a defect or invent completed behavior.

## Per-item delivery record

Record: row IDs and owner; reference revision/files and relevant consumers;
source and destination types/fields/defaults/validation/formats; unchanged source
files/blocks; adapted files/blocks and reasons; dependencies; migration behavior;
focused verification and platform/runtime evidence; remaining differences.
Update the checklist and comparison together. Source existence, test success,
build success and device acceptance are separate facts.

## Initial compatibility findings

| Item/group | Reference | Existing Super Chat | Required handling |
|---|---|---|---|
| PG01 | `showAdvancedSettings: boolean`, default `false`; advanced section/control classification in SettingsTab | No matching field or visibility preference | Preserve field/default and reuse classification blocks; adapt rendering/storage only. |
| Context/request budgets | `maxContextTokens` loads selected context; `maxRequestTokens` budgets the full request | `maxContextTokens` currently labels the request budget | Correct semantic mapping and preserve existing saved values through explicit migration; do not just rename. |
| Recent-history/reserve | Configurable `preserveRecentMessages`, `requestResponseReserveTokens` | Adapter uses fixed values | Keep distinct source fields and wire their actual consumers when reached. |
| Storage formats | Persistent legacy/JSONL choice | JSON/JSONL export choice | Treat as separate capabilities; host storage mapping remains open. |

## Ownership

T25 tools/schema/policy; T26 memory; T27 attachments; T28 provider profiles;
T29 diagnostics; T30 archives/migrations; T31 desktop and T32 Android host work.
T18 owns Obsidian host integration; T21 package adoption/release work remains
separate. Apply this contract to existing owners rather than creating parallel
feature tasks or 249 individual task files.

## PG01 implementation record

Status: implemented in the shared standalone Settings UI. Browser behavior and
reload persistence checked; Android device acceptance and full table-row
acceptance remain open.
Reference: `7b7e73560281e11e4a9a68faafc0b2f692c75b4d`.
Source: `src/settings.ts` and `src/settings-sections/SettingsTab.ts` in Obsidian-AI.

### Structures and behavior

- Reference field: `AppSettings.showAdvancedSettings: boolean`; default
  `false`; normalized with `Boolean(merged.showAdvancedSettings ?? false)`.
- Standalone field: `SettingsPresentationPreferences.showAdvancedSettings: boolean`;
  same default and normalization expression. The classification sets
  `ADVANCED_SECTION_TITLES` and `ADVANCED_SETTING_NAMES` were copied from
  `SettingsTab.ts` byte-for-byte (1,166 characters), then exported for the
  React adapter.
- React adaptation: a provider loads the setting before enabling the control,
  writes it before changing visibility, reports load/save errors and retries a
  failed load. `AdvancedSetting` uses the copied source names; advanced sections
  are hidden while the preference is false. Hiding retains mounted controls and
  their unsaved drafts. Nested advanced-group collapse remains PG09.
- Storage adaptation: the one-field object is kept under the IndexedDB key
  `standalone.settings-presentation`, rather than added to Obsidian's larger
  `AppSettings` object. Super Chat settings export/import carries it in the
  optional `presentation` object; older exports leave the current display
  preference alone. Existing chat/provider settings are not overwritten when
  the display toggle changes. This is field-level compatibility, not a shared
  whole-settings serialization format.

### Current control bindings and remaining differences

The source classification now wraps existing equivalents for full request
token display, agent step limit, request budget, context message limit, memory
audit, memory context budget/recovery retention, PDF endpoint/page limit, remote
sync direction/conflict resolution, and release channel/auto-install. The
`contextBudgetTokens` control only budgets standalone core memory; it does not
include the reference persona context. The recovery copies also have different
storage semantics. The standalone `maxContextTokens` is a whole-request budget;
the reference field of that name selects the memory/context budget. These
relationships are display classifications, not claims of field equivalence.
Controls that are not implemented remain separate open checklist entries.

### Verification

- 13 Vitest tests passed across four files, including source-default/name
  compatibility, persistence across remount, preservation of an unsaved chat
  draft, failed load/save handling, Settings integration, and settings
  export/import compatibility.
- Standalone typecheck and web production build passed.
- Browser at 390 x 844: the default view hid Debug Mode and Diagnostics; turning
  the preference on revealed both; after reload it remained on. The preview
  reported one missing `favicon.ico` request and no browser warnings.
- Android package/device verification was not performed. No user acceptance
  checkbox is marked complete by these checks.
