# Obsidian-AI Settings — individual control mapping

*Checked: 2026-11-20 15:54:30 IST*

*Owner: T15 with existing feature/platform owners; canonical execution plan: [master plan](../master-plan.md)*

Reference: `obsidian-ai` commit `7b7e73560281e11e4a9a68faafc0b2f692c75b4d`.
Reference `src/` has no uncommitted changes at this check. Super Chat base:
`056457ab1225e4625e9d5df565e6e883fb926a62`, plus the uncommitted PG01
implementation and Memory Bank updates.

**Side-by-side status table:** [Obsidian-AI / Super Chat Settings comparison](settings-status-comparison.md),
created 2026-11-20 15:20:01 IST. This checklist retains detailed source evidence
and acceptance boxes; the table is its readable comparison view.

**Implementation procedure:** [direct source reuse and compatibility](obsidian-ai-source-compatibility.md).
Work in table order from PG01; preserve reference fields and formats, record
necessary adaptations and verify each item without silently reducing scope.

## Scope and meaning

This mapping retains all 15 registered sections, page controls/readouts,
conditional provider fields and the Settings-launched prompt, tag-normalization,
AI-prune, data-repair, Codex-login, build-browser and sync/progress dialogs. Both branches of repeated conditional controls
are retained. Dynamic helpers for integration providers, sync categories,
debug telemetry, commands and diagnostic metrics are expanded individually.
Every literal `setName("…")` in the registered section modules and data-health
module has an entry; provider React controls and nested actions were inspected
separately. This is a source-level control inventory, not exhaustive runtime
characterization of the services these controls call.

No feature is designated keep, drop, unnecessary or not applicable here.
A platform difference identifies adaptation work or an open decision. Source
placeholders remain listed. Earlier relay deferral is historical context, not
a new scope decision. Existing simple-first compaction policy is not used to
remove any reference Settings control from this inventory.

- **Wired:** UI, persistence/handler and a corresponding path exist in inspected
  source. Exact behavior and end-to-end acceptance remain open.
- **Different:** Related code exists, but scope, options, validation, persistence,
  defaults or runtime behavior differs; the difference is stated.
- **Missing:** No corresponding standalone control/action found in inspected
  Settings and their supporting modules. This is an implementation gap, not a
  recommendation to omit it.
- **Disabled here:** Super Chat displays an unavailable action or has no working
  equivalent; reference behavior is retained as required comparison work.
- **Disabled in source / Placeholder in source:** The reference itself disables
  the control or labels it coming soon. This does not establish delivered behavior.

Every checkbox below is **acceptance**, not merely inventory coverage. They stay
unchecked because this pass ran no functional, browser, build or device checks.
A checkbox can be completed only after its reference behavior, implementation
or explicitly agreed adaptation, persistence/error handling, and relevant host
checks are recorded. No product adaptation was approved by this mapping pass.
Source links identify the label/action; adjacent code contains handlers and
conditions. Destination links identify inspected code, including where an
absent counterpart was sought; a link is not evidence a missing control exists.

## Summary

| Section | Mapped controls/actions/readouts | Existing owners |
|---|---:|---|
| Settings page | 17 | T22/T15 |
| Provider Profiles | 33 | T28/T22/T31/T32 |
| Chat Defaults | 48 | T22/T15/T26/T30 |
| Agent Tools | 4 | T25/T22 |
| Integrations | 4 | T25/T18/T31/T32 |
| AI Intelligence Layer | 25 | T26/T22 |
| Web Search | 5 | T25/T16/T27 |
| PDF Extraction | 3 | T27/T25 |
| Multi-User Chat Relay | 9 | T22/T18/T31/T32 |
| Sync Components | 7 | T22/T30/T31/T32 |
| Remote Storage | 28 | T22/T31/T32 |
| Updates | 10 | T21/T18/T31/T32 |
| Chat Commands | 7 | T22/T25/T26 |
| Backup & Restore | 14 | T30/T22/T31/T32 |
| Debug Mode | 7 | T29/T22 |
| Diagnostics | 28 | T29/T30/T31/T32 |

Total: **249 entries**. Status counts: **113 Missing**, **65 Different**, **54 Wired**, **1 Disabled in source**, **14 Disabled here**, **2 Placeholder in source**. These counts describe this inventory, not product completion.

## Settings page

- [ ] **PG01 — Show advanced settings** — **Wired.** A default-off preference reveals Debug Mode, Diagnostics and currently mapped advanced controls; advanced section/control classification is copied unchanged. The `{ showAdvancedSettings: boolean }` preference uses a separate standalone IndexedDB key and an optional `presentation` field in Super Chat settings export/import. Nested advanced-group collapse remains PG09; several source controls are still missing or have different data meanings.
  Reference behavior: Reveal diagnostics, developer controls, and other low-level configuration. Advanced controls are marked with *.
  Source: [settings-sections/SettingsTab.ts:387](../../../obsidian-ai/src/settings-sections/SettingsTab.ts#L387); implementation: [settingsPresentation.ts](../../apps/standalone/src/settingsPresentation.ts), [SettingsPresentation.tsx](../../apps/standalone/src/screens/SettingsPresentation.tsx), and [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Verification: 13 tests, standalone typecheck, web build and browser default/toggle/reload check passed; Android device check remains open. Owner: T22/T15.

- [ ] **PG02 — Search names, descriptions and sections** — **Different.** Standalone searches section label/subtitle only; reference indexes individual setting names/descriptions too.
  Source: [settings-sections/SettingsTab.ts:366](../../../obsidian-ai/src/settings-sections/SettingsTab.ts#L366); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15.

- [ ] **PG03 — Search suggestion keyboard selection** — **Missing.** Reference Arrow/Enter/Escape selection and direct setting focus need equivalent behavior; section index buttons alone do not establish it.
  Source: [settings-sections/SettingsTab.ts:47](../../../obsidian-ai/src/settings-sections/SettingsTab.ts#L47); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15.

- [ ] **PG04 — Search result highlighting and reveal hidden setting** — **Missing.** Reference highlights matches and reveals target section/advanced state; standalone navigates sections only.
  Source: [settings-sections/SettingsTab.ts:527](../../../obsidian-ai/src/settings-sections/SettingsTab.ts#L527); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15.

- [ ] **PG05 — Section index navigation** — **Wired.** Standalone section buttons open and scroll to selected section; verify focus/keyboard and state persistence.
  Source: [settings-sections/SettingsTab.ts:675](../../../obsidian-ai/src/settings-sections/SettingsTab.ts#L675); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15.

- [ ] **PG06 — Expand all sections** — **Wired.** Standalone expands all section IDs and persists state; compare advanced-group behavior.
  Source: [settings-sections/SettingsTab.ts:677](../../../obsidian-ai/src/settings-sections/SettingsTab.ts#L677); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15.

- [ ] **PG07 — Collapse all sections** — **Wired.** Standalone collapses all and persists state; compare focus while collapsing.
  Source: [settings-sections/SettingsTab.ts:681](../../../obsidian-ai/src/settings-sections/SettingsTab.ts#L681); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15.

- [ ] **PG08 — Individual section collapse state** — **Wired.** Accordion state is persisted in IndexedDB; reference stores it through plugin Settings.
  Source: [settings-sections/SettingsTab.ts:99](../../../obsidian-ai/src/settings-sections/SettingsTab.ts#L99); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15.

- [ ] **PG09 — Nested advanced groups and collapse persistence** — **Missing.** No standalone nested groups corresponding to source classification and collapse state.
  Source: [settings-sections/SettingsTab.ts:143](../../../obsidian-ai/src/settings-sections/SettingsTab.ts#L143); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15.

- [ ] **PG10 — Per-section load failure and remaining-section isolation** — **Missing.** Standalone has individual async errors but no equivalent section render exception boundary for every section.
  Source: [settings-sections/SettingsTab.ts:842](../../../obsidian-ai/src/settings-sections/SettingsTab.ts#L842); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15.

- [ ] **PG11 — Settings save event and runtime refresh** — **Different.** Reference updates chat API and broadcasts settings-changed; standalone uses save callbacks and some actions reload the app. Check propagation for every control.
  Source: [settings-sections/SettingsTab.ts:323](../../../obsidian-ai/src/settings-sections/SettingsTab.ts#L323); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15.

- [ ] **PG12 — Active profile** — **Missing.** No equivalent read-only profile/build field in the standalone Settings header; retain it for comparison.
  Source: [settings-sections/hero.ts:26](../../../obsidian-ai/src/settings-sections/hero.ts#L26); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15.

- [ ] **PG13 — Active provider** — **Missing.** No equivalent read-only profile/build field in the standalone Settings header; retain it for comparison.
  Source: [settings-sections/hero.ts:27](../../../obsidian-ai/src/settings-sections/hero.ts#L27); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15.

- [ ] **PG14 — Active model** — **Missing.** No equivalent read-only profile/build field in the standalone Settings header; retain it for comparison.
  Source: [settings-sections/hero.ts:28](../../../obsidian-ai/src/settings-sections/hero.ts#L28); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15.

- [ ] **PG15 — App version** — **Missing.** No equivalent read-only profile/build field in the standalone Settings header; retain it for comparison.
  Source: [settings-sections/hero.ts:30](../../../obsidian-ai/src/settings-sections/hero.ts#L30); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15.

- [ ] **PG16 — Build branch** — **Missing.** No equivalent read-only profile/build field in the standalone Settings header; retain it for comparison.
  Source: [settings-sections/hero.ts:51](../../../obsidian-ai/src/settings-sections/hero.ts#L51); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15.

- [ ] **PG17 — Build commit and link** — **Missing.** No equivalent read-only profile/build field in the standalone Settings header; retain it for comparison.
  Source: [settings-sections/hero.ts:63](../../../obsidian-ai/src/settings-sections/hero.ts#L63); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15.


## Provider Profiles

- [ ] **PP01 — Add profile** — **Wired.** Standalone creates a draft and saves a new ID; check default assignment.
  Source: [components/ProfileCard.tsx:782](../../../obsidian-ai/src/components/ProfileCard.tsx#L782); inspected counterpart: [ProviderSettingsScreen.tsx](../../apps/standalone/src/screens/ProviderSettingsScreen.tsx). Owner: T28/T22/T31/T32.

- [ ] **PP02 — Edit/select profile** — **Wired.** Selecting profile loads editable metadata; saved secrets are not read back.
  Source: [components/ProfileCard.tsx:712](../../../obsidian-ai/src/components/ProfileCard.tsx#L712); inspected counterpart: [ProviderSettingsScreen.tsx](../../apps/standalone/src/screens/ProviderSettingsScreen.tsx). Owner: T28/T22/T31/T32.

- [ ] **PP03 — Duplicate profile** — **Different.** Standalone duplicates metadata but requires API-key reentry; reference duplicates the profile record.
  Source: [components/ProfileCard.tsx:719](../../../obsidian-ai/src/components/ProfileCard.tsx#L719); inspected counterpart: [ProviderSettingsScreen.tsx](../../apps/standalone/src/screens/ProviderSettingsScreen.tsx). Owner: T28/T22/T31/T32.

- [ ] **PP04 — Delete profile** — **Different.** Standalone confirms and removes key; inspect reference default fallback and deletion semantics.
  Source: [components/ProfileCard.tsx:740](../../../obsidian-ai/src/components/ProfileCard.tsx#L740); inspected counterpart: [ProviderSettingsScreen.tsx](../../apps/standalone/src/screens/ProviderSettingsScreen.tsx). Owner: T28/T22/T31/T32.

- [ ] **PP05 — Set default profile** — **Wired.** Default for new chats is persisted; reference active/default semantics need multi-chat verification.
  Source: [components/ProfileCard.tsx:733](../../../obsidian-ai/src/components/ProfileCard.tsx#L733); inspected counterpart: [ProviderSettingsScreen.tsx](../../apps/standalone/src/screens/ProviderSettingsScreen.tsx). Owner: T28/T22/T31/T32.

- [ ] **PP06 — Profile status and credential readiness** — **Different.** Standalone displays saved/default and credential capability state; reference per-profile readiness has more states.
  Source: [components/ProfileCard.tsx:704](../../../obsidian-ai/src/components/ProfileCard.tsx#L704); inspected counterpart: [ProviderSettingsScreen.tsx](../../apps/standalone/src/screens/ProviderSettingsScreen.tsx). Owner: T28/T22/T31/T32.

- [ ] **PP07 — Profile name** — **Wired.** Editable persisted name; compare constraints and empty fallback.
  Source: [components/ProfileCard.tsx:295](../../../obsidian-ai/src/components/ProfileCard.tsx#L295); inspected counterpart: [ProviderSettingsScreen.tsx](../../apps/standalone/src/screens/ProviderSettingsScreen.tsx). Owner: T28/T22/T31/T32.

- [ ] **PP08 — Provider choice** — **Different.** Reference choices: OpenAI, Codex, Anthropic, DeepSeek, Kimi, Gemini, OpenRouter, Azure, custom/OpenAI-compatible and Agent/OpenResponses. Standalone excludes Azure and lacks Codex/agent fields. All options remain recorded.
  Source: [components/ProfileCard.tsx:305](../../../obsidian-ai/src/components/ProfileCard.tsx#L305); inspected counterpart: [ProviderSettingsScreen.tsx](../../apps/standalone/src/screens/ProviderSettingsScreen.tsx). Owner: T28/T22/T31/T32.

- [ ] **PP09 — Manual model ID** — **Wired.** Standalone manual ID with static suggestions; persistence and profile switching need checking.
  Source: [components/ProfileCard.tsx:356](../../../obsidian-ai/src/components/ProfileCard.tsx#L356); inspected counterpart: [ProviderSettingsScreen.tsx](../../apps/standalone/src/screens/ProviderSettingsScreen.tsx). Owner: T28/T22/T31/T32.

- [ ] **PP10 — Fetch models** — **Missing.** No provider-backed fetch/reload models button.
  Source: [components/ProfileCard.tsx:367](../../../obsidian-ai/src/components/ProfileCard.tsx#L367); inspected counterpart: [ProviderSettingsScreen.tsx](../../apps/standalone/src/screens/ProviderSettingsScreen.tsx). Owner: T28/T22/T31/T32.

- [ ] **PP11 — Search fetched model list** — **Missing.** No equivalent fetched-list search control.
  Source: [components/ProfileCard.tsx:381](../../../obsidian-ai/src/components/ProfileCard.tsx#L381); inspected counterpart: [ProviderSettingsScreen.tsx](../../apps/standalone/src/screens/ProviderSettingsScreen.tsx). Owner: T28/T22/T31/T32.

- [ ] **PP12 — Provider-scoped model cache** — **Missing.** Static suggestions are not the reference fetched cache and provider isolation workflow.
  Source: [components/ProfileCard.tsx:122](../../../obsidian-ai/src/components/ProfileCard.tsx#L122); inspected counterpart: [ProviderSettingsScreen.tsx](../../apps/standalone/src/screens/ProviderSettingsScreen.tsx). Owner: T28/T22/T31/T32.

- [ ] **PP13 — API key entry** — **Different.** Android stores via credential capability; web/desktop key saving disabled. Reference editable saved-key behavior differs.
  Source: [components/ProfileCard.tsx:413](../../../obsidian-ai/src/components/ProfileCard.tsx#L413); inspected counterpart: [ProviderSettingsScreen.tsx](../../apps/standalone/src/screens/ProviderSettingsScreen.tsx). Owner: T28/T22/T31/T32.

- [ ] **PP14 — Show/hide API key** — **Missing.** No reveal toggle for saved/new provider key.
  Source: [components/ProfileCard.tsx:432](../../../obsidian-ai/src/components/ProfileCard.tsx#L432); inspected counterpart: [ProviderSettingsScreen.tsx](../../apps/standalone/src/screens/ProviderSettingsScreen.tsx). Owner: T28/T22/T31/T32.

- [ ] **PP15 — Copy API key** — **Missing.** No key copy action. Both key actions remain recorded; no product decision made.
  Source: [components/ProfileCard.tsx:438](../../../obsidian-ai/src/components/ProfileCard.tsx#L438); inspected counterpart: [ProviderSettingsScreen.tsx](../../apps/standalone/src/screens/ProviderSettingsScreen.tsx). Owner: T28/T22/T31/T32.

- [ ] **PP16 — Endpoint override** — **Different.** Standalone endpoint field only custom/Ollama; reference exposes endpoint for every non-Codex provider.
  Source: [components/ProfileCard.tsx:453](../../../obsidian-ai/src/components/ProfileCard.tsx#L453); inspected counterpart: [ProviderSettingsScreen.tsx](../../apps/standalone/src/screens/ProviderSettingsScreen.tsx). Owner: T28/T22/T31/T32.

- [ ] **PP17 — Azure endpoint** — **Missing.** Azure excluded from standalone catalog; record endpoint requirement independently.
  Source: [components/ProfileCard.tsx:458](../../../obsidian-ai/src/components/ProfileCard.tsx#L458); inspected counterpart: [ProviderSettingsScreen.tsx](../../apps/standalone/src/screens/ProviderSettingsScreen.tsx). Owner: T28/T22/T31/T32.

- [ ] **PP18 — Azure API version** — **Missing.** No azureApiVersion field.
  Source: [components/ProfileCard.tsx:478](../../../obsidian-ai/src/components/ProfileCard.tsx#L478); inspected counterpart: [ProviderSettingsScreen.tsx](../../apps/standalone/src/screens/ProviderSettingsScreen.tsx). Owner: T28/T22/T31/T32.

- [ ] **PP19 — Codex sign in/reconnect** — **Missing.** No account sign-in/reconnect flow in standalone Settings.
  Source: [components/ProfileCard.tsx:176](../../../obsidian-ai/src/components/ProfileCard.tsx#L176); inspected counterpart: [ProviderSettingsScreen.tsx](../../apps/standalone/src/screens/ProviderSettingsScreen.tsx). Owner: T28/T22/T31/T32.

- [ ] **PP20 — Codex sign out** — **Missing.** No account sign-out flow.
  Source: [components/ProfileCard.tsx:214](../../../obsidian-ai/src/components/ProfileCard.tsx#L214); inspected counterpart: [ProviderSettingsScreen.tsx](../../apps/standalone/src/screens/ProviderSettingsScreen.tsx). Owner: T28/T22/T31/T32.

- [ ] **PP21 — Codex account connection state** — **Missing.** No corresponding connected/account state.
  Source: [components/ProfileCard.tsx:327](../../../obsidian-ai/src/components/ProfileCard.tsx#L327); inspected counterpart: [ProviderSettingsScreen.tsx](../../apps/standalone/src/screens/ProviderSettingsScreen.tsx). Owner: T28/T22/T31/T32.

- [ ] **PP22 — OpenResponses agent ID** — **Missing.** No agentId field or equivalent provider configuration.
  Source: [components/ProfileCard.tsx:493](../../../obsidian-ai/src/components/ProfileCard.tsx#L493); inspected counterpart: [ProviderSettingsScreen.tsx](../../apps/standalone/src/screens/ProviderSettingsScreen.tsx). Owner: T28/T22/T31/T32.

- [ ] **PP23 — OpenResponses session key** — **Missing.** No sessionKey field.
  Source: [components/ProfileCard.tsx:504](../../../obsidian-ai/src/components/ProfileCard.tsx#L504); inspected counterpart: [ProviderSettingsScreen.tsx](../../apps/standalone/src/screens/ProviderSettingsScreen.tsx). Owner: T28/T22/T31/T32.

- [ ] **PP24 — OpenResponses auto-approve tools** — **Missing.** No remote-agent autoApprove control; keep separate from local auto-apply and policy decisions.
  Source: [components/ProfileCard.tsx:523](../../../obsidian-ai/src/components/ProfileCard.tsx#L523); inspected counterpart: [ProviderSettingsScreen.tsx](../../apps/standalone/src/screens/ProviderSettingsScreen.tsx). Owner: T28/T22/T31/T32.

- [ ] **PP25 — OpenResponses max steps** — **Missing.** No provider-specific 1–50 maxSteps slider; global local-tool rounds is different.
  Source: [components/ProfileCard.tsx:527](../../../obsidian-ai/src/components/ProfileCard.tsx#L527); inspected counterpart: [ProviderSettingsScreen.tsx](../../apps/standalone/src/screens/ProviderSettingsScreen.tsx). Owner: T28/T22/T31/T32.

- [ ] **PP26 — Test profile connection** — **Different.** Save & test persists before checking; reference has saved-profile and agent-draft tests. No live request run in this audit.
  Source: [components/ProfileCard.tsx:726](../../../obsidian-ai/src/components/ProfileCard.tsx#L726); inspected counterpart: [ProviderSettingsScreen.tsx](../../apps/standalone/src/screens/ProviderSettingsScreen.tsx). Owner: T28/T22/T31/T32.

- [ ] **PP27 — Save edited profile** — **Wired.** Save persists metadata/credentials using host capability; compare errors and unchanged secrets.
  Source: [components/ProfileCard.tsx:569](../../../obsidian-ai/src/components/ProfileCard.tsx#L569); inspected counterpart: [ProviderSettingsScreen.tsx](../../apps/standalone/src/screens/ProviderSettingsScreen.tsx). Owner: T28/T22/T31/T32.

- [ ] **PP28 — Cancel profile edit** — **Missing.** No explicit Cancel reverting the draft; choosing another profile is not recorded as equivalent.
  Source: [components/ProfileCard.tsx:574](../../../obsidian-ai/src/components/ProfileCard.tsx#L574); inspected counterpart: [ProviderSettingsScreen.tsx](../../apps/standalone/src/screens/ProviderSettingsScreen.tsx). Owner: T28/T22/T31/T32.

- [ ] **PP29 — Codex dialog: Start device sign-in** — **Missing.** Start authorization and display one-time code; per-profile secure credentials. No equivalent standalone dialog.
  Source: [modals/CodexLoginModal.ts:76](../../../obsidian-ai/src/modals/CodexLoginModal.ts#L76); inspected counterpart: [ProviderSettingsScreen.tsx](../../apps/standalone/src/screens/ProviderSettingsScreen.tsx). Owner: T28/T22/T31/T32.

- [ ] **PP30 — Codex dialog: Copy one-time code** — **Missing.** Clipboard action for authorization code with feedback. No equivalent standalone dialog.
  Source: [modals/CodexLoginModal.ts:126](../../../obsidian-ai/src/modals/CodexLoginModal.ts#L126); inspected counterpart: [ProviderSettingsScreen.tsx](../../apps/standalone/src/screens/ProviderSettingsScreen.tsx). Owner: T28/T22/T31/T32.

- [ ] **PP31 — Codex dialog: Open verification page** — **Missing.** Verification URI link for browser authorization. No equivalent standalone dialog.
  Source: [modals/CodexLoginModal.ts:134](../../../obsidian-ai/src/modals/CodexLoginModal.ts#L134); inspected counterpart: [ProviderSettingsScreen.tsx](../../apps/standalone/src/screens/ProviderSettingsScreen.tsx). Owner: T28/T22/T31/T32.

- [ ] **PP32 — Codex dialog: Cancel device sign-in** — **Missing.** Cancel polling/authorization and report cancellation. No equivalent standalone dialog.
  Source: [modals/CodexLoginModal.ts:59](../../../obsidian-ai/src/modals/CodexLoginModal.ts#L59); inspected counterpart: [ProviderSettingsScreen.tsx](../../apps/standalone/src/screens/ProviderSettingsScreen.tsx). Owner: T28/T22/T31/T32.

- [ ] **PP33 — Codex dialog: Finish connected sign-in** — **Missing.** Connected state closes modal; ensure models refresh after authorization. No equivalent standalone dialog.
  Source: [modals/CodexLoginModal.ts:69](../../../obsidian-ai/src/modals/CodexLoginModal.ts#L69); inspected counterpart: [ProviderSettingsScreen.tsx](../../apps/standalone/src/screens/ProviderSettingsScreen.tsx). Owner: T28/T22/T31/T32.


## Chat Defaults

- [ ] **CD01 — Context picker path display** — **Missing.** No equivalent path-display setting or context picker in standalone. Reference choices are never/always/duplicates; host-independent behavior and resource naming remain to map.
  Reference behavior: How to show file paths in the context picker. 'Never' shows filenames only. 'Always' shows the parent folder for every file. 'When duplicates' shows the parent folder only when multiple files share the same name. Reference choices: never (Never), always (Always), duplicates (When duplicates).
  Source: [settings-sections/chatDefaults.ts:48](../../../obsidian-ai/src/settings-sections/chatDefaults.ts#L48); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD02 — Show full request token count** — **Different.** Full-request estimate toggle exists; estimate coverage differs and does not establish provider usage or exact payload parity.
  Source: [settings-sections/chatDefaults.ts:68](../../../obsidian-ai/src/settings-sections/chatDefaults.ts#L68); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD03 — Press Enter to send** — **Wired.** Persisted pressEnterToSend reaches composer. Standalone help also documents Ctrl/Cmd+Enter. Check keyboard behavior against reference call sites.
  Reference behavior: When enabled, pressing Enter sends the message and Shift+Enter inserts a new line. When disabled, Enter inserts a new line and you must click the send button.
  Source: [settings-sections/chatDefaults.ts:82](../../../obsidian-ai/src/settings-sections/chatDefaults.ts#L82); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD04 — Include active note** — **Missing.** No active-resource inclusion toggle. Reference description itself says when chat context is implemented; trace actual reference runtime before claiming it works there.
  Reference behavior: Automatically include the active note when chat context is implemented.
  Source: [settings-sections/chatDefaults.ts:96](../../../obsidian-ai/src/settings-sections/chatDefaults.ts#L96); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD05 — Auto-name sessions** — **Wired.** autoNameSessions persists and ChatApp calls the title helper with a local fallback; generation/reload checks remain open.
  Reference behavior: Generate chat titles automatically once a conversation has enough context.
  Source: [settings-sections/chatDefaults.ts:110](../../../obsidian-ai/src/settings-sections/chatDefaults.ts#L110); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD06 — Auto-generate session tags** — **Wired.** autoTagSessions persists and selected-profile suggestions are wired for new chats; source defaults and excerpt behavior need parity checks.
  Reference behavior: Suggest up to 5 tags after the first exchange in each new session. A short excerpt of that chat is sent to the selected provider. Existing sessions are not tagged automatically.
  Source: [settings-sections/chatDefaults.ts:127](../../../obsidian-ai/src/settings-sections/chatDefaults.ts#L127); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD07 — Session tag provider and model** — **Wired.** Selected profile ID persists; missing-profile indication exists. Reference has both configured and no-profile rendering branches, retained as separate occurrences.
  Source: [settings-sections/chatDefaults.ts:150](../../../obsidian-ai/src/settings-sections/chatDefaults.ts#L150); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD08 — Saved-session tags** — **Missing.** No Settings action to generate tags across existing sessions. Automatic new-chat suggestions and history manual tags do not cover this action.
  Reference behavior: Generate
  Source: [settings-sections/chatDefaults.ts:182](../../../obsidian-ai/src/settings-sections/chatDefaults.ts#L182); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD09 — Session tag provider and model** — **Wired.** Selected profile ID persists; missing-profile indication exists. Reference has both configured and no-profile rendering branches, retained as separate occurrences.
  Source: [settings-sections/chatDefaults.ts:423](../../../obsidian-ai/src/settings-sections/chatDefaults.ts#L423); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD10 — Normalize session tags** — **Missing.** No global normalization review dialog; individual history tag edits exist separately.
  Reference behavior: Review and consolidate existing tag names across saved sessions. Edit canonical names and choose which merges to apply.
  Source: [settings-sections/chatDefaults.ts:429](../../../obsidian-ai/src/settings-sections/chatDefaults.ts#L429); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD11 — Chat tab title width** — **Wired.** Input and validator accept 120–360 px; persisted into chat settings. Check blur/save and invalid-input behavior against source.
  Reference behavior: Allowed range: 120–360 px. Default: 160 px. Wider tabs show more of each title before the tab strip scrolls.
  Source: [settings-sections/chatDefaults.ts:446](../../../obsidian-ai/src/settings-sections/chatDefaults.ts#L446); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD12 — Restore chat tabs after reload** — **Different.** Toggle and saved active/open tabs and scroll exist; reference description excludes draft tabs, so draft restoration semantics need explicit comparison.
  Reference behavior: Reopen saved chat tabs, the active tab, and each tab's scroll position after Obsidian or this plugin reloads. Draft tabs are not restored.
  Source: [settings-sections/chatDefaults.ts:472](../../../obsidian-ai/src/settings-sections/chatDefaults.ts#L472); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD13 — Maximum parallel chat sessions** — **Missing.** No Settings concurrency control equivalent to reference 1–10 (default 5); orchestration internals are separate evidence.
  Source: [settings-sections/chatDefaults.ts:486](../../../obsidian-ai/src/settings-sections/chatDefaults.ts#L486); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD14 — Agent prompt** — **Different.** Base instructions editor exists, but the reference View and edit modal includes latest generated prompt, copy and reset; see nested rows.
  Reference behavior: Edit the shared base prompt or view and copy the latest generated system prompt.
  Source: [settings-sections/chatDefaults.ts:505](../../../obsidian-ai/src/settings-sections/chatDefaults.ts#L505); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD15 — Max sessions in sidebar** — **Missing.** No sidebar-page-size preference equivalent to the reference 10–200 step 10 slider.
  Source: [settings-sections/chatDefaults.ts:516](../../../obsidian-ai/src/settings-sections/chatDefaults.ts#L516); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD16 — Max saved conversations** — **Missing.** No saved-conversation retention preference equivalent to positive integer/fallback 20. Do not equate pagination with deletion.
  Reference behavior: Maximum number of chat sessions to keep before older ones are trimmed.
  Source: [settings-sections/chatDefaults.ts:532](../../../obsidian-ai/src/settings-sections/chatDefaults.ts#L532); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD17 — Max context tokens** — **Missing.** No separate selected-resource context budget. Standalone maxContextTokens is exposed as the model request budget, a different purpose despite the shared name.
  Reference behavior: Approximate context budget for note/context loading.
  Source: [settings-sections/chatDefaults.ts:548](../../../obsidian-ai/src/settings-sections/chatDefaults.ts#L548); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD18 — Max context messages** — **Wired.** Positive previous-message limit persists and adapter adds one for the current message; full history remains stored. Compare edge cases and defaults.
  Reference behavior: Maximum previous messages to include in the conversation context. Older messages are silently dropped.
  Source: [settings-sections/chatDefaults.ts:562](../../../obsidian-ai/src/settings-sections/chatDefaults.ts#L562); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD19 — Model request token budget** — **Different.** Standalone request budget uses maxContextTokens and fixed choices 8000–1000000; reference maxRequestTokens accepts 0 to disable token budgeting. Separate selected-context budget is absent.
  Reference behavior: Maximum estimated tokens sent for the system prompt, conversation history, current message, tools, and response reserve. Recent messages are preserved first. Set to 0 to use the legacy message-count limit only.
  Source: [settings-sections/chatDefaults.ts:578](../../../obsidian-ai/src/settings-sections/chatDefaults.ts#L578); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD20 — Recent messages to preserve** — **Missing.** No Settings preference. VercelLLMAdapter currently fixes preserveRecentMessages to 2; reference setting defaults to 4 and accepts positive integers.
  Reference behavior: Number of newest messages retained verbatim when the request budget trims older history.
  Source: [settings-sections/chatDefaults.ts:594](../../../obsidian-ai/src/settings-sections/chatDefaults.ts#L594); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD21 — Response token reserve** — **Missing.** No Settings preference. Adapter fixes reserve to min(4096, contextWindow/4); reference accepts a configurable nonnegative value.
  Reference behavior: Tokens held back for the assistant response and agent tool-loop continuations.
  Source: [settings-sections/chatDefaults.ts:610](../../../obsidian-ai/src/settings-sections/chatDefaults.ts#L610); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD22 — Compaction trigger tokens** — **Missing.** No threshold preference or equivalent exposed workflow; retained for comparison without deciding to defer or omit it.
  Reference behavior: Estimated history size at which old conversation turns are summarized. Set to 0 to disable semantic compaction.
  Source: [settings-sections/chatDefaults.ts:626](../../../obsidian-ai/src/settings-sections/chatDefaults.ts#L626); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD23 — Compaction release tokens** — **Missing.** No hysteresis/release preference; retained independently from trigger.
  Reference behavior: Estimated history size below which a future compaction may be triggered again. Keep below the trigger threshold.
  Source: [settings-sections/chatDefaults.ts:642](../../../obsidian-ai/src/settings-sections/chatDefaults.ts#L642); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD24 — Max tool-result replay tokens** — **Missing.** No Settings preference equivalent to maxToolResultTokens; complete saved result and bounded request projection must be distinguished.
  Reference behavior: Maximum estimated tokens from one tool result replayed to the model. Full results remain in the saved transcript for display and export.
  Source: [settings-sections/chatDefaults.ts:658](../../../obsidian-ai/src/settings-sections/chatDefaults.ts#L658); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD25 — Tool history mode** — **Missing.** No elide/preserve preference. Runtime history code does not establish the Settings behavior.
  Reference behavior: Reference choices: elide (Elide (saves tokens)), preserve (Preserve (full detail)).
  Source: [settings-sections/chatDefaults.ts:674](../../../obsidian-ai/src/settings-sections/chatDefaults.ts#L674); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD26 — Base prompt view** — **Different.** Base instructions editor exists on Chat Settings, without modal view switching.
  Source: [modals/AgentPromptModal.ts:33](../../../obsidian-ai/src/modals/AgentPromptModal.ts#L33); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD27 — Main instructions editing** — **Different.** Standalone allows empty up to 16000 characters; source rejects blank on Save.
  Source: [modals/AgentPromptModal.ts:75](../../../obsidian-ai/src/modals/AgentPromptModal.ts#L75); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD28 — Latest generated system prompt view** — **Missing.** No read-only request-time generated prompt preview or captured provider/time.
  Source: [modals/AgentPromptModal.ts:49](../../../obsidian-ai/src/modals/AgentPromptModal.ts#L49); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD29 — Copy latest system prompt** — **Missing.** No prompt-copy action.
  Source: [modals/AgentPromptModal.ts:150](../../../obsidian-ai/src/modals/AgentPromptModal.ts#L150); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD30 — Reset base prompt to default** — **Missing.** No explicit reset-to-default control that stages reset before Save.
  Source: [modals/AgentPromptModal.ts:96](../../../obsidian-ai/src/modals/AgentPromptModal.ts#L96); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD31 — Save base prompt** — **Different.** Standalone saves full chat preference form; source modal validates nonblank and rolls back failed persistence.
  Source: [modals/AgentPromptModal.ts:189](../../../obsidian-ai/src/modals/AgentPromptModal.ts#L189); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD32 — Cancel/close prompt without saving** — **Different.** Discard changes exists for chat Settings; source modal preserves draft across views and discards on close.
  Source: [modals/AgentPromptModal.ts:93](../../../obsidian-ai/src/modals/AgentPromptModal.ts#L93); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD33 — Latest prompt empty state and lifetime** — **Missing.** No equivalent no-request-yet state or reload-limited latest-prompt capture.
  Source: [modals/AgentPromptModal.ts:116](../../../obsidian-ai/src/modals/AgentPromptModal.ts#L116); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD34 — Tag normalization: Find/regenerate merge proposals** — **Missing.** Selected tagging profile receives tag names only; preserve proposal cancellation and failures. No global normalization dialog exists in standalone.
  Source: [modals/NormalizeSessionTagsModal.ts:97](../../../obsidian-ai/src/modals/NormalizeSessionTagsModal.ts#L97); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD35 — Tag normalization: Suggested merges tab** — **Missing.** Show proposed equivalent tags separately from all tags. No global normalization dialog exists in standalone.
  Source: [modals/NormalizeSessionTagsModal.ts:123](../../../obsidian-ai/src/modals/NormalizeSessionTagsModal.ts#L123); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD36 — Tag normalization: All tags tab** — **Missing.** Show complete tag inventory and session counts. No global normalization dialog exists in standalone.
  Source: [modals/NormalizeSessionTagsModal.ts:124](../../../obsidian-ai/src/modals/NormalizeSessionTagsModal.ts#L124); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD37 — Tag normalization: Select individual merge** — **Missing.** Each proposed merge is independently selectable. No global normalization dialog exists in standalone.
  Source: [modals/NormalizeSessionTagsModal.ts:166](../../../obsidian-ai/src/modals/NormalizeSessionTagsModal.ts#L166); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD38 — Tag normalization: Edit canonical tag name** — **Missing.** Canonical input has max length 32 and validates merge targets. No global normalization dialog exists in standalone.
  Source: [modals/NormalizeSessionTagsModal.ts:193](../../../obsidian-ai/src/modals/NormalizeSessionTagsModal.ts#L193); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD39 — Tag normalization: Select all merges** — **Missing.** Select all eligible proposed changes. No global normalization dialog exists in standalone.
  Source: [modals/NormalizeSessionTagsModal.ts:232](../../../obsidian-ai/src/modals/NormalizeSessionTagsModal.ts#L232); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD40 — Tag normalization: Deselect all merges** — **Missing.** Clear merge selection. No global normalization dialog exists in standalone.
  Source: [modals/NormalizeSessionTagsModal.ts:249](../../../obsidian-ai/src/modals/NormalizeSessionTagsModal.ts#L249); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD41 — Tag normalization: Rescan tags / retry failed save** — **Missing.** Retain fresh inventory and pending-save recovery semantics. No global normalization dialog exists in standalone.
  Source: [modals/NormalizeSessionTagsModal.ts:272](../../../obsidian-ai/src/modals/NormalizeSessionTagsModal.ts#L272); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD42 — Tag normalization: Cancel suggestions / close** — **Missing.** Abort model suggestions and leave unapplied changes untouched. No global normalization dialog exists in standalone.
  Source: [modals/NormalizeSessionTagsModal.ts:278](../../../obsidian-ai/src/modals/NormalizeSessionTagsModal.ts#L278); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD43 — Tag normalization: Apply selected merges** — **Missing.** Validate affected sessions/stale plans, persist selected changes and preserve transcript content. No global normalization dialog exists in standalone.
  Source: [modals/NormalizeSessionTagsModal.ts:305](../../../obsidian-ai/src/modals/NormalizeSessionTagsModal.ts#L305); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD44 — Bulk tag generation progress/cancellation** — **Missing.** Reference progress modal, bounded per-session work, generated/failed counts and save behavior need equivalent comparison; automatic new-chat tagging does not cover them.
  Source: [settings-sections/chatDefaults.ts:197](../../../obsidian-ai/src/settings-sections/chatDefaults.ts#L197); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD45 — Bulk-generation Normalize tags entry** — **Missing.** The configured-profile bulk tagging row has an additional Normalize tags button, beyond the standalone normalization row. Both lead to the same missing dialog.
  Source: [settings-sections/chatDefaults.ts:416](../../../obsidian-ai/src/settings-sections/chatDefaults.ts#L416); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD46 — Bulk tag dialog: Generated-tag results** — **Missing.** Per-session generated-tag readouts and running summary. Standalone has no saved-session bulk tagging dialog.
  Source: [modals/SyncProgressModal.ts:492](../../../obsidian-ai/src/modals/SyncProgressModal.ts#L492); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD47 — Bulk tag dialog: Cancel generation** — **Missing.** AbortController cancellation and close-cancels behavior are supplied by Chat Defaults. Standalone has no saved-session bulk tagging dialog.
  Source: [modals/SyncProgressModal.ts:529](../../../obsidian-ai/src/modals/SyncProgressModal.ts#L529); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.

- [ ] **CD48 — Bulk tag dialog: Done after tagging** — **Missing.** Completion/error feedback and close without starting model work. Standalone has no saved-session bulk tagging dialog.
  Source: [modals/SyncProgressModal.ts:549](../../../obsidian-ai/src/modals/SyncProgressModal.ts#L549); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T22/T15/T26/T30.


## Agent Tools

- [ ] **AT01 — Enable agent tools** — **Wired.** Allow agent tools persists and maps to engine enableTools; available tool sets differ by host.
  Reference behavior: When enabled, the AI can invoke tools to interact with your vault during chat conversations.
  Source: [settings-sections/agentTools.ts:20](../../../obsidian-ai/src/settings-sections/agentTools.ts#L20); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T25/T22.

- [ ] **AT02 — Auto-apply edits** — **Missing.** No autoApply control. Current write approvals differ; map reference semantics and policy before implementation. No keep/drop decision made.
  Reference behavior: Apply note edits automatically without asking for confirmation. (Not recommended for important notes.)
  Source: [settings-sections/agentTools.ts:34](../../../obsidian-ai/src/settings-sections/agentTools.ts#L34); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T25/T22.

- [ ] **AT03 — Max agent steps** — **Different.** Standalone offers 1/2/3/5/8/12 and validator caps at 12; source accepts any positive integer with fallback 5.
  Reference behavior: Maximum number of tool call rounds per message. Higher values allow more complex multi-step reasoning.
  Source: [settings-sections/agentTools.ts:48](../../../obsidian-ai/src/settings-sections/agentTools.ts#L48); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T25/T22.

- [ ] **AT04 — Developer mode** — **Missing.** No developer-mode control or conditional settings mutation routes. Reference interaction with tool availability must be retained.
  Reference behavior: Allow the AI to read and modify select plugin settings through developer tools. Use with caution.
  Source: [settings-sections/agentTools.ts:64](../../../obsidian-ai/src/settings-sections/agentTools.ts#L64); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T25/T22.


## Integrations

- [ ] **IN01 — Refresh provider discovery** — **Different.** Standalone injectable bridge exists but default host has no installed-provider discovery; Refresh disabled without bridge.
  Source: [settings-sections/integrations.ts:20](../../../obsidian-ai/src/settings-sections/integrations.ts#L20); inspected counterpart: [ToolsDiagnosticsSections.tsx](../../apps/standalone/src/screens/ToolsDiagnosticsSections.tsx). Owner: T25/T18/T31/T32.

- [ ] **IN02 — Per-provider enable/disable** — **Different.** Dynamic toggle routes to bridge; actual standalone host discovery is absent.
  Source: [settings-sections/integrations.ts:50](../../../obsidian-ai/src/settings-sections/integrations.ts#L50); inspected counterpart: [ToolsDiagnosticsSections.tsx](../../apps/standalone/src/screens/ToolsDiagnosticsSections.tsx). Owner: T25/T18/T31/T32.

- [ ] **IN03 — Provider status/message/capability count** — **Different.** Rows exist when bridge returns data; compare status/availability handling and failure messages.
  Source: [settings-sections/integrations.ts:43](../../../obsidian-ai/src/settings-sections/integrations.ts#L43); inspected counterpart: [ToolsDiagnosticsSections.tsx](../../apps/standalone/src/screens/ToolsDiagnosticsSections.tsx). Owner: T25/T18/T31/T32.

- [ ] **IN04 — No-compatible-provider state** — **Different.** Standalone has empty/unavailable states; compare when refreshing and discovery fails.
  Source: [settings-sections/integrations.ts:31](../../../obsidian-ai/src/settings-sections/integrations.ts#L31); inspected counterpart: [ToolsDiagnosticsSections.tsx](../../apps/standalone/src/screens/ToolsDiagnosticsSections.tsx). Owner: T25/T18/T31/T32.


## AI Intelligence Layer

- [ ] **MI01 — Enable intelligence layer** — **Different.** Enable memory controls store/tools/prompt injection. Reference enablement also concerns persona and initialization; it is not proven equivalent.
  Reference behavior: When enabled, the AI loads a persistent persona and memory on every session.  It can create memories and search past conversations.
  Source: [settings-sections/intelligence.ts:25](../../../obsidian-ai/src/settings-sections/intelligence.ts#L25); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T26/T22.

- [ ] **MI02 — Identity context budget** — **Different.** Core memory prompt budget exists (0–8000 choices) but no equivalent configurable persona contribution. Compare combined persona+memory budget.
  Reference behavior: Max tokens for persona + memory injected into the system prompt.  Higher values = more context but consume more of your model's window.
  Source: [settings-sections/intelligence.ts:58](../../../obsidian-ai/src/settings-sections/intelligence.ts#L58); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T26/T22.

- [ ] **MI03 — Memory core size** — **Missing.** No small/medium/large (50/100/200) preference. Review/promote actions do not replace configurable core size.
  Reference behavior: Reference choices: small (Small (50)), medium (Medium (100)), large (Large (200)).
  Source: [settings-sections/intelligence.ts:77](../../../obsidian-ai/src/settings-sections/intelligence.ts#L77); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T26/T22.

- [ ] **MI04 — Legacy memory backup retention** — **Different.** Recovery copies supports 0/10/20/50/100 and stores snapshot history. Reference timestamped legacy files and fixed recovery backups have different semantics.
  Reference behavior: Number of timestamped legacy memory backups to retain. Fixed recovery backups are always kept. Reference choices: 0 (Off), 10 (10 generations), 20 (20 generations), 50 (50 generations).
  Source: [settings-sections/intelligence.ts:98](../../../obsidian-ai/src/settings-sections/intelligence.ts#L98); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T26/T22.

- [ ] **MI05 — Persona file path** — **Missing.** No selectable persona path/storage location. Host storage adaptation remains an open decision, not an exclusion.
  Reference behavior: Path to the AI's static identity file, relative to the plugin folder.  Edit this to customize how the AI behaves.
  Source: [settings-sections/intelligence.ts:115](../../../obsidian-ai/src/settings-sections/intelligence.ts#L115); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T26/T22.

- [ ] **MI06 — Memory file path** — **Missing.** No configurable memory file path. IndexedDB implementation is recorded, without dropping the reference capability.
  Reference behavior: Path to the AI's dynamic memory file. The AI appends facts, preferences, and project updates here.
  Source: [settings-sections/intelligence.ts:131](../../../obsidian-ai/src/settings-sections/intelligence.ts#L131); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T26/T22.

- [ ] **MI07 — Auto-summarize sessions** — **Missing.** No auto-summary-on-new-session toggle or scheduled equivalent exposed here.
  Reference behavior: When enabled, the AI automatically summarizes ended sessions and saves key points to memory.  Triggered when you start a new chat session.
  Source: [settings-sections/intelligence.ts:146](../../../obsidian-ai/src/settings-sections/intelligence.ts#L146); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T26/T22.

- [ ] **MI08 — Min messages before summarizing** — **Missing.** No conditional summary threshold (reference 2–20), tied to auto-summarize.
  Source: [settings-sections/intelligence.ts:162](../../../obsidian-ai/src/settings-sections/intelligence.ts#L162); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T26/T22.

- [ ] **MI09 — Enable memory audit tool** — **Wired.** Expose memory audit tool persists and filters MemoryToolProvider availability. UI audit viewing is distinct from model tool access.
  Reference behavior: When enabled, the AI can query the memory audit log via the read_memory_audit tool.  Useful for debugging memory issues. Off by default to prevent context bloat.
  Source: [settings-sections/intelligence.ts:173](../../../obsidian-ai/src/settings-sections/intelligence.ts#L173); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T26/T22.

- [ ] **MI10 — Memory entry count** — **Wired.** Standalone shows tier counts for current query; reference total entries may differ.
  Source: [settings-sections/intelligence.ts:242](../../../obsidian-ai/src/settings-sections/intelligence.ts#L242); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T26/T22.

- [ ] **MI11 — Memory total size** — **Missing.** No total memory-size readout.
  Source: [settings-sections/intelligence.ts:234](../../../obsidian-ai/src/settings-sections/intelligence.ts#L234); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T26/T22.

- [ ] **MI12 — Memory category counts** — **Missing.** Standalone entries show category but no equivalent aggregate category stats.
  Source: [settings-sections/intelligence.ts:257](../../../obsidian-ai/src/settings-sections/intelligence.ts#L257); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T26/T22.

- [ ] **MI13 — Export memory JSON** — **Missing.** Settings export does not provide the reference dedicated memory export action.
  Source: [settings-sections/intelligence.ts:286](../../../obsidian-ai/src/settings-sections/intelligence.ts#L286); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T26/T22.

- [ ] **MI14 — Export memory Markdown** — **Missing.** No dedicated Markdown memory export.
  Source: [settings-sections/intelligence.ts:311](../../../obsidian-ai/src/settings-sections/intelligence.ts#L311); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T26/T22.

- [ ] **MI15 — Refresh memory statistics** — **Different.** Refresh list/tier counts exists; reference refresh also recomputes size/category statistics.
  Source: [settings-sections/intelligence.ts:353](../../../obsidian-ai/src/settings-sections/intelligence.ts#L353); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T26/T22.

- [ ] **MI16 — Prune exact duplicate memories** — **Missing.** Promote staged memories is not duplicate pruning.
  Source: [settings-sections/intelligence.ts:384](../../../obsidian-ai/src/settings-sections/intelligence.ts#L384); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T26/T22.

- [ ] **MI17 — AI-powered semantic prune** — **Missing.** No optimizer launch equivalent; keep model cost, review and restore behavior in nested rows.
  Source: [settings-sections/intelligence.ts:433](../../../obsidian-ai/src/settings-sections/intelligence.ts#L433); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T26/T22.

- [ ] **MI18 — Memory audit display** — **Different.** Standalone activity list shows timestamp/operation/entry ID; reference audit includes more detail.
  Source: [settings-sections/intelligence.ts:471](../../../obsidian-ai/src/settings-sections/intelligence.ts#L471); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T26/T22.

- [ ] **MI19 — Refresh audit** — **Different.** Standalone toggles activity and refreshes on entry-count change; no explicit Refresh Audit button.
  Source: [settings-sections/intelligence.ts:532](../../../obsidian-ai/src/settings-sections/intelligence.ts#L532); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T26/T22.

- [ ] **MI20 — Open intelligence folder** — **Missing.** No folder/location action; host storage choice remains open.
  Source: [settings-sections/intelligence.ts:539](../../../obsidian-ai/src/settings-sections/intelligence.ts#L539); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T26/T22.

- [ ] **MI21 — AI prune: Progress, stage, log and ETA** — **Missing.** No standalone semantic-prune dialog; retain reference action and its failure/recovery behavior.
  Source: [components/presentational/AIPruneModal.tsx:55](../../../obsidian-ai/src/components/presentational/AIPruneModal.tsx#L55); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T26/T22.

- [ ] **MI22 — AI prune: Confirm proposed pruning before save** — **Missing.** No standalone semantic-prune dialog; retain reference action and its failure/recovery behavior.
  Source: [components/presentational/AIPruneModal.tsx:59](../../../obsidian-ai/src/components/presentational/AIPruneModal.tsx#L59); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T26/T22.

- [ ] **MI23 — AI prune: Cancel running prune** — **Missing.** No standalone semantic-prune dialog; retain reference action and its failure/recovery behavior.
  Source: [components/presentational/AIPruneModal.tsx:31](../../../obsidian-ai/src/components/presentational/AIPruneModal.tsx#L31); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T26/T22.

- [ ] **MI24 — AI prune: Restore pre-prune backup** — **Missing.** No standalone semantic-prune dialog; retain reference action and its failure/recovery behavior.
  Source: [components/presentational/AIPruneModal.tsx:28](../../../obsidian-ai/src/components/presentational/AIPruneModal.tsx#L28); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T26/T22.

- [ ] **MI25 — AI prune: Finish/close prune dialog** — **Missing.** No standalone semantic-prune dialog; retain reference action and its failure/recovery behavior.
  Source: [components/presentational/AIPruneModal.tsx:8](../../../obsidian-ai/src/components/presentational/AIPruneModal.tsx#L8); inspected counterpart: [SettingsScreen.tsx](../../apps/standalone/src/screens/SettingsScreen.tsx). Owner: T26/T22.


## Web Search

- [ ] **WS01 — Search provider** — **Wired.** All five provider choices exist; selected settings reach copied search service. Live provider checks remain open.
  Reference behavior: Choose the search engine to use for web queries. Reference choices: duckduckgo (DuckDuckGo (free, no API key)), brave (Brave Search API (requires key)), tavily (Tavily AI Search (requires key)), exa (Exa AI Search (requires key)), searxng (SearXNG (self-hosted)).
  Source: [settings-sections/webSearch.ts:21](../../../obsidian-ai/src/settings-sections/webSearch.ts#L21); inspected counterpart: [SearchDocumentSettingsSection.tsx](../../apps/standalone/src/screens/sections/SearchDocumentSettingsSection.tsx). Owner: T25/T16/T27.

- [ ] **WS02 — Brave API key** — **Different.** Password field exists and Android uses credential storage; inactive provider field is disabled. Reference conditional rendering and persistence differ across hosts.
  Source: [settings-sections/webSearch.ts:41](../../../obsidian-ai/src/settings-sections/webSearch.ts#L41); inspected counterpart: [SearchDocumentSettingsSection.tsx](../../apps/standalone/src/screens/sections/SearchDocumentSettingsSection.tsx). Owner: T25/T16/T27.

- [ ] **WS03 — Tavily API key** — **Different.** Password field exists; Android protected storage and web/desktop session-memory retention differ from reference persistence.
  Source: [settings-sections/webSearch.ts:51](../../../obsidian-ai/src/settings-sections/webSearch.ts#L51); inspected counterpart: [SearchDocumentSettingsSection.tsx](../../apps/standalone/src/screens/sections/SearchDocumentSettingsSection.tsx). Owner: T25/T16/T27.

- [ ] **WS04 — Exa API key** — **Different.** Password field exists; compare conditional availability, credential changes and host persistence.
  Source: [settings-sections/webSearch.ts:61](../../../obsidian-ai/src/settings-sections/webSearch.ts#L61); inspected counterpart: [SearchDocumentSettingsSection.tsx](../../apps/standalone/src/screens/sections/SearchDocumentSettingsSection.tsx). Owner: T25/T16/T27.

- [ ] **WS05 — SearXNG instance URL** — **Wired.** URL control reaches service and is disabled when another provider is selected; runtime validation remains to verify.
  Reference behavior: URL of your SearXNG instance, e.g. https://search.example.com
  Source: [settings-sections/webSearch.ts:71](../../../obsidian-ai/src/settings-sections/webSearch.ts#L71); inspected counterpart: [SearchDocumentSettingsSection.tsx](../../apps/standalone/src/screens/sections/SearchDocumentSettingsSection.tsx). Owner: T25/T16/T27.


## PDF Extraction

- [ ] **PDF01 — Extraction method** — **Wired.** Auto/server/client choices exist; client availability is a supplied host flag. Need fallback and offline checks.
  Reference behavior: Choose how PDF text is extracted.  Reference choices: auto (Auto (server preferred, client fallback)), server (Server-side only), client (Client-side only (offline)).
  Source: [settings-sections/pdfExtraction.ts:20](../../../obsidian-ai/src/settings-sections/pdfExtraction.ts#L20); inspected counterpart: [SearchDocumentSettingsSection.tsx](../../apps/standalone/src/screens/sections/SearchDocumentSettingsSection.tsx). Owner: T27/T25.

- [ ] **PDF02 — Server endpoint URL** — **Wired.** Endpoint field exists and is disabled for client-only; source hides it for client-only. Check request/validation differences.
  Reference behavior: The PDF extraction service URL.  Default uses the built-in relay endpoint.  You can self-host the extraction service for privacy.
  Source: [settings-sections/pdfExtraction.ts:45](../../../obsidian-ai/src/settings-sections/pdfExtraction.ts#L45); inspected counterpart: [SearchDocumentSettingsSection.tsx](../../apps/standalone/src/screens/sections/SearchDocumentSettingsSection.tsx). Owner: T27/T25.

- [ ] **PDF03 — Maximum pages** — **Wired.** Both expose 0–200 in steps of 10 and 0 means all pages; extraction must verify it end to end.
  Reference behavior: Maximum number of pages to extract from a PDF.  Lower values save tokens and speed up extraction.
  Source: [settings-sections/pdfExtraction.ts:66](../../../obsidian-ai/src/settings-sections/pdfExtraction.ts#L66); inspected counterpart: [SearchDocumentSettingsSection.tsx](../../apps/standalone/src/screens/sections/SearchDocumentSettingsSection.tsx). Owner: T27/T25.


## Multi-User Chat Relay

- [ ] **RE01 — Relay URL** — **Wired.** URL defaults saved; reference saves on its own event path.
  Source: [settings-sections/syncSettings.ts:76](../../../obsidian-ai/src/settings-sections/syncSettings.ts#L76); inspected counterpart: [HostSettingsSections.tsx](../../apps/standalone/src/screens/HostSettingsSections.tsx). Owner: T22/T18/T31/T32.

- [ ] **RE02 — Recent relay URL history** — **Different.** Standalone datalist records history on Save; reference selection/recency semantics need comparison.
  Source: [settings-sections/syncSettings.ts:105](../../../obsidian-ai/src/settings-sections/syncSettings.ts#L105); inspected counterpart: [HostSettingsSections.tsx](../../apps/standalone/src/screens/HostSettingsSections.tsx). Owner: T22/T18/T31/T32.

- [ ] **RE03 — Test relay connection** — **Different.** Standalone combines test and HTTP room listing; compare protocol/status handling.
  Source: [settings-sections/syncSettings.ts:140](../../../obsidian-ai/src/settings-sections/syncSettings.ts#L140); inspected counterpart: [HostSettingsSections.tsx](../../apps/standalone/src/screens/HostSettingsSections.tsx). Owner: T22/T18/T31/T32.

- [ ] **RE04 — Detect local IP** — **Missing.** No detection control or callback.
  Source: [settings-sections/syncSettings.ts:146](../../../obsidian-ai/src/settings-sections/syncSettings.ts#L146); inspected counterpart: [HostSettingsSections.tsx](../../apps/standalone/src/screens/HostSettingsSections.tsx). Owner: T22/T18/T31/T32.

- [ ] **RE05 — Available rooms and member names** — **Wired.** Room listing renderer exists; loading/empty/failure behavior requires checks.
  Source: [settings-sections/syncSettings.ts:193](../../../obsidian-ai/src/settings-sections/syncSettings.ts#L193); inspected counterpart: [HostSettingsSections.tsx](../../apps/standalone/src/screens/HostSettingsSections.tsx). Owner: T22/T18/T31/T32.

- [ ] **RE06 — Join selected room** — **Disabled here.** Standalone Join disabled; earlier user deferral is historical and the feature remains fully listed.
  Source: [settings-sections/syncSettings.ts:232](../../../obsidian-ai/src/settings-sections/syncSettings.ts#L232); inspected counterpart: [HostSettingsSections.tsx](../../apps/standalone/src/screens/HostSettingsSections.tsx). Owner: T22/T18/T31/T32.

- [ ] **RE07 — Default room ID** — **Wired.** Persisted room default exists; session connection behavior not established.
  Source: [settings-sections/syncSettings.ts:260](../../../obsidian-ai/src/settings-sections/syncSettings.ts#L260); inspected counterpart: [HostSettingsSections.tsx](../../apps/standalone/src/screens/HostSettingsSections.tsx). Owner: T22/T18/T31/T32.

- [ ] **RE08 — Local display name** — **Wired.** Persisted display name exists; attribution integration remains separate.
  Source: [settings-sections/syncSettings.ts:279](../../../obsidian-ai/src/settings-sections/syncSettings.ts#L279); inspected counterpart: [HostSettingsSections.tsx](../../apps/standalone/src/screens/HostSettingsSections.tsx). Owner: T22/T18/T31/T32.

- [ ] **RE09 — Per-chat relay-enablement guidance** — **Missing.** Standalone explanation does not provide matching per-chat toolbar integration.
  Source: [settings-sections/syncSettings.ts:300](../../../obsidian-ai/src/settings-sections/syncSettings.ts#L300); inspected counterpart: [HostSettingsSections.tsx](../../apps/standalone/src/screens/HostSettingsSections.tsx). Owner: T22/T18/T31/T32.


## Sync Components

- [ ] **SC01 — Chat sessions** — **Wired.** Sessions feed SyncEngine; verify selected context and drafts survive round trips.
  Source: [settings-sections/syncComponents.ts:49](../../../obsidian-ai/src/settings-sections/syncComponents.ts#L49); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T22/T30/T31/T32.

- [ ] **SC02 — Plugin/app settings** — **Different.** Target list includes chat/provider/search/PDF/relay/debug/log/sync/remote settings. Compare reference whole-settings selection and omissions.
  Source: [settings-sections/syncComponents.ts:55](../../../obsidian-ai/src/settings-sections/syncComponents.ts#L55); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T22/T30/T31/T32.

- [ ] **SC03 — API keys and credentials** — **Disabled here.** Disabled in standalone and import forces false; source can select this with encryption. No decision to omit credential transfer.
  Source: [settings-sections/syncComponents.ts:61](../../../obsidian-ai/src/settings-sections/syncComponents.ts#L61); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T22/T30/T31/T32.

- [ ] **SC04 — AI memory** — **Wired.** Memory snapshot included via file targets; round-trip not accepted.
  Source: [settings-sections/syncComponents.ts:68](../../../obsidian-ai/src/settings-sections/syncComponents.ts#L68); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T22/T30/T31/T32.

- [ ] **SC05 — Memory audit log** — **Wired.** Audit snapshot included; verify selected/unselected isolation.
  Source: [settings-sections/syncComponents.ts:74](../../../obsidian-ai/src/settings-sections/syncComponents.ts#L74); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T22/T30/T31/T32.

- [ ] **SC06 — AI persona** — **Different.** Current target maps to chat systemPrompt; reference persona.md is distinct from base agent prompt.
  Source: [settings-sections/syncComponents.ts:80](../../../obsidian-ai/src/settings-sections/syncComponents.ts#L80); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T22/T30/T31/T32.

- [ ] **SC07 — Usage statistics** — **Different.** Standalone exports session/message counts, reference token/model aggregates.
  Source: [settings-sections/syncComponents.ts:86](../../../obsidian-ai/src/settings-sections/syncComponents.ts#L86); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T22/T30/T31/T32.


## Remote Storage

- [ ] **RS01 — Enable Remote Storage** — **Wired.** Persisted enabled controls manual sync availability; network acceptance open.
  Reference behavior: Turn on to sync chat sessions to a remote backend.
  Source: [settings-sections/remoteStorageSettings.ts:118](../../../obsidian-ai/src/settings-sections/remoteStorageSettings.ts#L118); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T22/T31/T32.

- [ ] **RS02 — Storage Backend** — **Different.** WebDAV selectable, S3/custom visibly unavailable; source also has a none choice and coming-soon entries. Preserve all variants below.
  Reference behavior: Reference choices: none (— Select backend —), webdav (WebDAV (Nextcloud, ownCloud, generic)), s3 (S3-compatible — coming soon), custom (Custom REST API — coming soon).
  Source: [settings-sections/remoteStorageSettings.ts:130](../../../obsidian-ai/src/settings-sections/remoteStorageSettings.ts#L130); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T22/T31/T32.

- [ ] **RS03 — Encrypt Data** — **Different.** Standalone persists a separate encrypted boolean; reference derives enabled state from a nonempty passphrase and clears the passphrase when disabled. Round-trip and toggle semantics remain to compare.
  Reference behavior: Encrypt sessions before uploading. Strongly recommended.
  Source: [settings-sections/remoteStorageSettings.ts:148](../../../obsidian-ai/src/settings-sections/remoteStorageSettings.ts#L148); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T22/T31/T32.

- [ ] **RS04 — Encryption Passphrase** — **Different.** In-memory form value supplied to sync; reference saves its passphrase setting. Persistence and reuse semantics differ and remain open.
  Reference behavior: Used to encrypt/decrypt your data. Never stored on the server. Required on every device.
  Source: [settings-sections/remoteStorageSettings.ts:162](../../../obsidian-ai/src/settings-sections/remoteStorageSettings.ts#L162); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T22/T31/T32.

- [ ] **RS05 — Auto-sync** — **Disabled in source.** Reference AUTO_SYNC_ENABLED disables the control; standalone also disabled. This is source status, not permission to discard automatic sync.
  Reference behavior: Temporarily disabled until automatic sync is fully verified. Use Sync Now for manual sync.
  Source: [settings-sections/remoteStorageSettings.ts:179](../../../obsidian-ai/src/settings-sections/remoteStorageSettings.ts#L179); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T22/T31/T32.

- [ ] **RS06 — Conflict Resolution** — **Wired.** last-write-wins/keep-both/manual choices reach SyncEngine. Manual leaves conflicts unresolved; interaction and resolution parity open.
  Reference behavior: How to resolve when the same session is edited on multiple devices. Reference choices: last-write-wins (Last write wins (newest version)), keep-both (Keep both copies), manual (Manual resolution).
  Source: [settings-sections/remoteStorageSettings.ts:196](../../../obsidian-ai/src/settings-sections/remoteStorageSettings.ts#L196); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T22/T31/T32.

- [ ] **RS07 — Sync Direction** — **Wired.** both/upload/download choices reach sync; verify each direction and cancellation/errors.
  Reference behavior: Control whether to upload, download, or sync both ways. Reference choices: both (↕️ Both ways), upload (⬆️ Upload only), download (⬇️ Download only).
  Source: [settings-sections/remoteStorageSettings.ts:217](../../../obsidian-ai/src/settings-sections/remoteStorageSettings.ts#L217); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T22/T31/T32.

- [ ] **RS08 — Allow Session Deletions** — **Different.** Flag reaches engine; standalone label describes remote-to-local deletion while reference says automatic deletions more broadly. Verify both directions before equivalence.
  Reference behavior: When off, sync will never delete sessions automatically. Sessions missing on one side are kept or downloaded instead.
  Source: [settings-sections/remoteStorageSettings.ts:233](../../../obsidian-ai/src/settings-sections/remoteStorageSettings.ts#L233); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T22/T31/T32.

- [ ] **RS09 — WebDAV URL** — **Wired.** Persisted URL reaches adapter; validation/normalization/error details differ and need endpoint checks.
  Reference behavior: Your Nextcloud/ownCloud WebDAV endpoint.
  Source: [settings-sections/remoteStorageSettings.ts:254](../../../obsidian-ai/src/settings-sections/remoteStorageSettings.ts#L254); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T22/T31/T32.

- [ ] **RS10 — Username** — **Wired.** Persisted username reaches adapter; test authentication failures and export behavior.
  Source: [settings-sections/remoteStorageSettings.ts:277](../../../obsidian-ai/src/settings-sections/remoteStorageSettings.ts#L277); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T22/T31/T32.

- [ ] **RS11 — Password / App Token** — **Different.** Form value stays in memory; source saves credentials in settings. Compare replacement/retention and secure host storage without assuming a policy choice.
  Reference behavior: For Nextcloud, generate an app-specific token in Settings → Security.
  Source: [settings-sections/remoteStorageSettings.ts:297](../../../obsidian-ai/src/settings-sections/remoteStorageSettings.ts#L297); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T22/T31/T32.

- [ ] **RS12 — Path Prefix** — **Wired.** Persisted prefix reaches sync identity/cache; cross-prefix isolation needs verification.
  Reference behavior: Directory under which sessions are stored.
  Source: [settings-sections/remoteStorageSettings.ts:322](../../../obsidian-ai/src/settings-sections/remoteStorageSettings.ts#L322); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T22/T31/T32.

- [ ] **RS13 — Connection** — **Different.** Test connection action exists, but exact preflight validation and error detail differ from the source PROPFIND helper.
  Reference behavior: Test your WebDAV configuration before syncing. 🧪 Test Connection
  Source: [settings-sections/remoteStorageSettings.ts:343](../../../obsidian-ai/src/settings-sections/remoteStorageSettings.ts#L343); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T22/T31/T32.

- [ ] **RS14 — No backend selected** — **Missing.** Source none state exists; standalone defaults to WebDAV and offers no none radio.
  Source: [settings-sections/remoteStorageSettings.ts:133](../../../obsidian-ai/src/settings-sections/remoteStorageSettings.ts#L133); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T22/T31/T32.

- [ ] **RS15 — WebDAV backend** — **Wired.** Selectable backend and adapter exist; endpoint acceptance open.
  Source: [settings-sections/remoteStorageSettings.ts:134](../../../obsidian-ai/src/settings-sections/remoteStorageSettings.ts#L134); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T22/T31/T32.

- [ ] **RS16 — S3 backend choice** — **Placeholder in source.** Both show unavailable S3; retain source placeholder as an item, not a delivered capability.
  Source: [settings-sections/remoteStorageSettings.ts:135](../../../obsidian-ai/src/settings-sections/remoteStorageSettings.ts#L135); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T22/T31/T32.

- [ ] **RS17 — Custom REST backend choice** — **Placeholder in source.** Both show unavailable custom backend; retained without exclusion.
  Source: [settings-sections/remoteStorageSettings.ts:136](../../../obsidian-ai/src/settings-sections/remoteStorageSettings.ts#L136); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T22/T31/T32.

- [ ] **RS18 — Sync now** — **Wired.** Manual action wired; progress, conflicts, errors and reload behavior differ.
  Source: [settings-sections/remoteStorageSettings.ts:389](../../../obsidian-ai/src/settings-sections/remoteStorageSettings.ts#L389); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T22/T31/T32.

- [ ] **RS19 — Last sync timestamp** — **Missing.** No equivalent persisted last-sync readout in standalone form.
  Source: [settings-sections/remoteStorageSettings.ts:421](../../../obsidian-ai/src/settings-sections/remoteStorageSettings.ts#L421); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T22/T31/T32.

- [ ] **RS20 — Sync dialog: Review plan before moving data** — **Missing.** Source Settings Sync Now opens examination before confirmation; standalone starts sync without equivalent review.
  Source: [modals/SyncProgressModal.ts:190](../../../obsidian-ai/src/modals/SyncProgressModal.ts#L190); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T22/T31/T32.

- [ ] **RS21 — Sync dialog: Change direction and re-examine** — **Missing.** Independent direction choice refreshes preview; persisted direction alone is not equivalent.
  Source: [modals/SyncProgressModal.ts:193](../../../obsidian-ai/src/modals/SyncProgressModal.ts#L193); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T22/T31/T32.

- [ ] **RS22 — Sync dialog: Rebuild sync index** — **Missing.** Settings sync caller supplies onRebuildIndex and re-examines stores; no standalone Settings action.
  Source: [modals/SyncProgressModal.ts:215](../../../obsidian-ai/src/modals/SyncProgressModal.ts#L215); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T22/T31/T32.

- [ ] **RS23 — Sync dialog: Confirm reviewed sync plan** — **Missing.** Confirm preview before work begins; separate from initial Settings entry.
  Source: [modals/SyncProgressModal.ts:210](../../../obsidian-ai/src/modals/SyncProgressModal.ts#L210); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T22/T31/T32.

- [ ] **RS24 — Sync dialog: Cancel/close review** — **Missing.** Closing before confirmation cancels without moving data.
  Source: [modals/SyncProgressModal.ts:224](../../../obsidian-ai/src/modals/SyncProgressModal.ts#L224); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T22/T31/T32.

- [ ] **RS25 — Sync dialog: Progress, summary and activity log** — **Missing.** No corresponding progress/activity modal in standalone sync.
  Source: [modals/SyncProgressModal.ts:522](../../../obsidian-ai/src/modals/SyncProgressModal.ts#L522); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T22/T31/T32.

- [ ] **RS26 — Sync dialog: Cancel running sync** — **Missing.** Call engine cancellation and disable cancellation while settling.
  Source: [modals/SyncProgressModal.ts:529](../../../obsidian-ai/src/modals/SyncProgressModal.ts#L529); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T22/T31/T32.

- [ ] **RS27 — Sync dialog: Continue sync in background** — **Missing.** Source progress modal can close while work continues; no corresponding action.
  Source: [modals/SyncProgressModal.ts:538](../../../obsidian-ai/src/modals/SyncProgressModal.ts#L538); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T22/T31/T32.

- [ ] **RS28 — Sync dialog: Close completed sync** — **Missing.** Completion action separate from cancellation.
  Source: [modals/SyncProgressModal.ts:549](../../../obsidian-ai/src/modals/SyncProgressModal.ts#L549); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T22/T31/T32.


## Updates

- [ ] **UP01 — Check for updates on startup** — **Disabled here.** Control rendered disabled; no standalone host updater attached. Android/desktop behavior remains to implement or decide, not excluded.
  Source: [settings-sections/updaterSettings.ts:23](../../../obsidian-ai/src/settings-sections/updaterSettings.ts#L23); inspected counterpart: [HostSettingsSections.tsx](../../apps/standalone/src/screens/HostSettingsSections.tsx). Owner: T21/T18/T31/T32.

- [ ] **UP02 — Release channel** — **Different.** Disabled Stable-only selector; reference offers stable and dev. Both choices retained in required behavior.
  Reference behavior: Reference choices: stable (Stable), dev (Dev (pre-release)).
  Source: [settings-sections/updaterSettings.ts:34](../../../obsidian-ai/src/settings-sections/updaterSettings.ts#L34); inspected counterpart: [HostSettingsSections.tsx](../../apps/standalone/src/screens/HostSettingsSections.tsx). Owner: T21/T18/T31/T32.

- [ ] **UP03 — Auto-install stable updates** — **Disabled here.** Disabled control; reference stable auto-install and dev confirmation behavior need host implementation mapping.
  Reference behavior: Automatically install stable updates without prompting. Disabled by default; downloaded files are backed up before installation. Dev builds always require confirmation.
  Source: [settings-sections/updaterSettings.ts:47](../../../obsidian-ai/src/settings-sections/updaterSettings.ts#L47); inspected counterpart: [HostSettingsSections.tsx](../../apps/standalone/src/screens/HostSettingsSections.tsx). Owner: T21/T18/T31/T32.

- [ ] **UP04 — Available branch builds** — **Missing.** No Browse builds action; retain reference published-branch build browsing/installation capability with host owner.
  Reference behavior: Browse and install published development builds from any branch.
  Source: [settings-sections/updaterSettings.ts:108](../../../obsidian-ai/src/settings-sections/updaterSettings.ts#L108); inspected counterpart: [HostSettingsSections.tsx](../../apps/standalone/src/screens/HostSettingsSections.tsx). Owner: T21/T18/T31/T32.

- [ ] **UP05 — Current installed version/channel** — **Missing.** No current version/channel readout in standalone Updates.
  Source: [settings-sections/updaterSettings.ts:72](../../../obsidian-ai/src/settings-sections/updaterSettings.ts#L72); inspected counterpart: [HostSettingsSections.tsx](../../apps/standalone/src/screens/HostSettingsSections.tsx). Owner: T21/T18/T31/T32.

- [ ] **UP06 — Manual check now** — **Disabled here.** Button disabled without host updater; reference checking state and outcomes retained.
  Source: [settings-sections/updaterSettings.ts:87](../../../obsidian-ai/src/settings-sections/updaterSettings.ts#L87); inspected counterpart: [HostSettingsSections.tsx](../../apps/standalone/src/screens/HostSettingsSections.tsx). Owner: T21/T18/T31/T32.

- [ ] **UP07 — Last update-check result/time** — **Missing.** No standalone last-check readout.
  Source: [settings-sections/updaterSettings.ts:99](../../../obsidian-ai/src/settings-sections/updaterSettings.ts#L99); inspected counterpart: [HostSettingsSections.tsx](../../apps/standalone/src/screens/HostSettingsSections.tsx). Owner: T21/T18/T31/T32.

- [ ] **UP08 — Build browser: Build list, branch, commit and publication time** — **Missing.** List available published builds with identity; no matching standalone browser.
  Source: [updater/PluginUpdater.ts:514](../../../obsidian-ai/src/updater/PluginUpdater.ts#L514); inspected counterpart: [HostSettingsSections.tsx](../../apps/standalone/src/screens/HostSettingsSections.tsx). Owner: T21/T18/T31/T32.

- [ ] **UP09 — Build browser: Install selected branch build** — **Missing.** Download/install selected build, show busy/failure state and reload; platform contract unresolved.
  Source: [updater/PluginUpdater.ts:605](../../../obsidian-ai/src/updater/PluginUpdater.ts#L605); inspected counterpart: [HostSettingsSections.tsx](../../apps/standalone/src/screens/HostSettingsSections.tsx). Owner: T21/T18/T31/T32.

- [ ] **UP10 — Build browser: Loading/empty/error build states** — **Missing.** Preserve loading, no-build and load-failure behavior.
  Source: [updater/PluginUpdater.ts:590](../../../obsidian-ai/src/updater/PluginUpdater.ts#L590); inspected counterpart: [HostSettingsSections.tsx](../../apps/standalone/src/screens/HostSettingsSections.tsx). Owner: T21/T18/T31/T32.


## Chat Commands

- [ ] **CC01 — !help** — **Wired.** Listed and handled by local dispatcher; verify it never sends a provider request and compare output.
  Source: [lib/builtinCommands.ts:9](../../../obsidian-ai/src/lib/builtinCommands.ts#L9); inspected counterpart: [localCommands.ts](../../src/lib/localCommands.ts). Owner: T22/T25/T26.

- [ ] **CC02 — !debug** — **Wired.** Listed and handled by local dispatcher; verify it never sends a provider request and compare output.
  Source: [lib/builtinCommands.ts:13](../../../obsidian-ai/src/lib/builtinCommands.ts#L13); inspected counterpart: [localCommands.ts](../../src/lib/localCommands.ts). Owner: T22/T25/T26.

- [ ] **CC03 — !debug help** — **Wired.** Listed and handled by local dispatcher; verify it never sends a provider request and compare output.
  Source: [lib/builtinCommands.ts:17](../../../obsidian-ai/src/lib/builtinCommands.ts#L17); inspected counterpart: [localCommands.ts](../../src/lib/localCommands.ts). Owner: T22/T25/T26.

- [ ] **CC04 — !debug history** — **Wired.** Listed and handled by local dispatcher; verify it never sends a provider request and compare output.
  Source: [lib/builtinCommands.ts:21](../../../obsidian-ai/src/lib/builtinCommands.ts#L21); inspected counterpart: [localCommands.ts](../../src/lib/localCommands.ts). Owner: T22/T25/T26.

- [ ] **CC05 — !debug tokens** — **Different.** Standalone reports rough transcript estimate/budget/tool-call counts; compare reference model-request breakdown.
  Source: [lib/builtinCommands.ts:25](../../../obsidian-ai/src/lib/builtinCommands.ts#L25); inspected counterpart: [localCommands.ts](../../src/lib/localCommands.ts). Owner: T22/T25/T26.

- [ ] **CC06 — !debug context** — **Different.** Standalone returns attachment metadata only; selected resource context is not included.
  Source: [lib/builtinCommands.ts:30](../../../obsidian-ai/src/lib/builtinCommands.ts#L30); inspected counterpart: [localCommands.ts](../../src/lib/localCommands.ts). Owner: T22/T25/T26.

- [ ] **CC07 — !debug compact** — **Disabled here.** Standalone reports unavailable; reference runs validated compaction. Retain as an open capability.
  Source: [lib/builtinCommands.ts:35](../../../obsidian-ai/src/lib/builtinCommands.ts#L35); inspected counterpart: [localCommands.ts](../../src/lib/localCommands.ts). Owner: T22/T25/T26.


## Backup & Restore

- [ ] **BR01 — Export settings** — **Different.** Uses Super Chat JSON format and host document export, omitting credentials. Export coverage omits some Settings categories; compare every category and format.
  Reference behavior: Save your settings as a JSON file in the vault config folder. API keys and passwords are redacted by default.
  Source: [settings-sections/exportImport.ts:47](../../../obsidian-ai/src/settings-sections/exportImport.ts#L47); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T30/T22/T31/T32.

- [ ] **BR02 — Export with secrets** — **Disabled here.** Visible disabled action. Reference exports secrets explicitly; secure host export remains an unresolved capability, not excluded.
  Reference behavior: ⚠️ Export including API keys and passwords. Only use this for personal backups — never share this file.
  Source: [settings-sections/exportImport.ts:66](../../../obsidian-ai/src/settings-sections/exportImport.ts#L66); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T30/T22/T31/T32.

- [ ] **BR03 — Import settings** — **Different.** Only accepts super-chat-settings v1; reference Obsidian Settings bundle is not accepted. Credential import forced off; migration and partial failure semantics open.
  Reference behavior: Load settings from a previously exported JSON file in your vault.
  Source: [settings-sections/exportImport.ts:91](../../../obsidian-ai/src/settings-sections/exportImport.ts#L91); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T30/T22/T31/T32.

- [ ] **BR04 — Import saved chats** — **Wired.** JSON/JSONL parsing and ID collision copies are wired; verify schema/migration/round trips and no tool execution.
  Reference behavior: Import Chat History JSON or JSONL exports. Existing sessions with matching IDs are kept; imported chats are added as separate copies.
  Source: [settings-sections/exportImport.ts:136](../../../obsidian-ai/src/settings-sections/exportImport.ts#L136); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T30/T22/T31/T32.

- [ ] **BR05 — Chat storage format** — **Different.** Chat archive format selects export format only; it does not select durable legacy/JSONL storage. Reference storage-format choice remains unmatched.
  Reference behavior: Reference choices: legacy (Legacy (data.json)), jsonl (JSONL (split sessions)).
  Source: [settings-sections/exportImport.ts:173](../../../obsidian-ai/src/settings-sections/exportImport.ts#L173); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T30/T22/T31/T32.

- [ ] **BR06 — Session backup count** — **Missing.** No rolling session backup-count setting. Clear-history recovery copy and memory recovery are different mechanisms.
  Reference behavior: Number of rolling backups to keep of data.json before writes.
  Source: [settings-sections/exportImport.ts:191](../../../obsidian-ai/src/settings-sections/exportImport.ts#L191); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T30/T22/T31/T32.

- [ ] **BR07 — Migrate chat data** — **Missing.** Reference shows migration only when legacy data is detected. No equivalent standalone migration action. Record host format differences; adaptation decision remains open.
  Reference behavior: Convert legacy chat data in data.json to the new JSONL format.
  Source: [settings-sections/exportImport.ts:219](../../../obsidian-ai/src/settings-sections/exportImport.ts#L219); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T30/T22/T31/T32.

- [ ] **BR08 — Clear all chat history** — **Different.** Confirmation, recovery snapshot, deletion and reload exist; reference confirmation/storage handling differ. Verify recovery completeness.
  Reference behavior: Permanently delete all saved chat sessions. This frees up storage space.
  Source: [settings-sections/exportImport.ts:246](../../../obsidian-ai/src/settings-sections/exportImport.ts#L246); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T30/T22/T31/T32.

- [ ] **BR09 — Cancel clear-history confirmation** — **Wired.** window.confirm cancellation exists; custom modal behavior differs.
  Source: [settings-sections/exportImport.ts:268](../../../obsidian-ai/src/settings-sections/exportImport.ts#L268); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T30/T22/T31/T32.

- [ ] **BR10 — Confirm clear all history** — **Different.** Standalone saves one recovery copy then deletes/reloads; verify failure atomicity.
  Source: [settings-sections/exportImport.ts:273](../../../obsidian-ai/src/settings-sections/exportImport.ts#L273); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T30/T22/T31/T32.

- [ ] **BR11 — Legacy persistent storage option** — **Missing.** Standalone only has export archive choice, not persistent storage-format selection.
  Source: [settings-sections/exportImport.ts:179](../../../obsidian-ai/src/settings-sections/exportImport.ts#L179); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T30/T22/T31/T32.

- [ ] **BR12 — Split JSONL persistent storage option** — **Missing.** Persistent JSONL and corruption-isolation behavior unmatched by export dropdown.
  Source: [settings-sections/exportImport.ts:180](../../../obsidian-ai/src/settings-sections/exportImport.ts#L180); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T30/T22/T31/T32.

- [ ] **BR13 — Choose Settings export from vault** — **Different.** Reference fuzzy-selects chat-lab-settings*.json from vault; standalone uses native file input and different schema.
  Source: [settings-sections/exportImport.ts:115](../../../obsidian-ai/src/settings-sections/exportImport.ts#L115); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T30/T22/T31/T32.

- [ ] **BR14 — Choose chat archive from vault** — **Different.** Reference fuzzy-selects JSON/JSONL files, excluding Settings bundles; standalone file input differs.
  Source: [settings-sections/exportImport.ts:157](../../../obsidian-ai/src/settings-sections/exportImport.ts#L157); inspected counterpart: [DataManagementSections.tsx](../../apps/standalone/src/screens/DataManagementSections.tsx). Owner: T30/T22/T31/T32.


## Debug Mode

- [ ] **DB01 — Enable debug mode** — **Different.** Persisted export enablement and dependent toggles exist; reference also shows chat Debug mode active indicator, not established here.
  Reference behavior: When enabled, the chat shows a Debug mode active indicator and exports can include the selected telemetry details.
  Source: [settings-sections/debugMode.ts:20](../../../obsidian-ai/src/settings-sections/debugMode.ts#L20); inspected counterpart: [ToolsDiagnosticsSections.tsx](../../apps/standalone/src/screens/ToolsDiagnosticsSections.tsx). Owner: T29/T22.

- [ ] **DB02 — Provider usage** — **Different.** Selection exists; actual provider telemetry capture not established.
  Source: [settings-sections/debugMode.ts:64](../../../obsidian-ai/src/settings-sections/debugMode.ts#L64); inspected counterpart: [ToolsDiagnosticsSections.tsx](../../apps/standalone/src/screens/ToolsDiagnosticsSections.tsx). Owner: T29/T22.

- [ ] **DB03 — Request estimates** — **Wired.** Selection exists and estimator data is used when recorded.
  Source: [settings-sections/debugMode.ts:69](../../../obsidian-ai/src/settings-sections/debugMode.ts#L69); inspected counterpart: [ToolsDiagnosticsSections.tsx](../../apps/standalone/src/screens/ToolsDiagnosticsSections.tsx). Owner: T29/T22.

- [ ] **DB04 — Per-step request breakdown** — **Different.** Selection exists but complete per-step capture/schema parity is open.
  Source: [settings-sections/debugMode.ts:74](../../../obsidian-ai/src/settings-sections/debugMode.ts#L74); inspected counterpart: [ToolsDiagnosticsSections.tsx](../../apps/standalone/src/screens/ToolsDiagnosticsSections.tsx). Owner: T29/T22.

- [ ] **DB05 — Tool details** — **Different.** Standalone omits arguments/results and reports selected sizes; reference includes arguments/status. Preserve difference for decision.
  Source: [settings-sections/debugMode.ts:79](../../../obsidian-ai/src/settings-sections/debugMode.ts#L79); inspected counterpart: [ToolsDiagnosticsSections.tsx](../../apps/standalone/src/screens/ToolsDiagnosticsSections.tsx). Owner: T29/T22.

- [ ] **DB06 — Context metadata** — **Different.** Standalone selects attachment references, reference selected context references are broader.
  Source: [settings-sections/debugMode.ts:84](../../../obsidian-ai/src/settings-sections/debugMode.ts#L84); inspected counterpart: [ToolsDiagnosticsSections.tsx](../../apps/standalone/src/screens/ToolsDiagnosticsSections.tsx). Owner: T29/T22.

- [ ] **DB07 — Model and timing** — **Different.** Field selection exists; runtime population and provider identity need verification.
  Source: [settings-sections/debugMode.ts:89](../../../obsidian-ai/src/settings-sections/debugMode.ts#L89); inspected counterpart: [ToolsDiagnosticsSections.tsx](../../apps/standalone/src/screens/ToolsDiagnosticsSections.tsx). Owner: T29/T22.


## Diagnostics

- [ ] **DG01 — Debug log level** — **Wired.** off/error/info/debug persist and feed structured log capture. Verify which runtime events reach the log.
  Reference behavior: Choose how much runtime information the plugin records. Reference choices: off (Off), error (Errors only), info (Info), debug (Debug).
  Source: [settings-sections/diagnostics.ts:132](../../../obsidian-ai/src/settings-sections/diagnostics.ts#L132); inspected counterpart: [ToolsDiagnosticsSections.tsx](../../apps/standalone/src/screens/ToolsDiagnosticsSections.tsx). Owner: T29/T30/T31/T32.

- [ ] **DG02 — Debug log max size (MB)** — **Different.** Standalone clamps 0.1–100 MB; source accepts positive float/fallback 5. JSON entry size retention differs from file truncation.
  Reference behavior: Maximum size for the debug log file. When exceeded, the file is truncated to keep the most recent entries.
  Source: [settings-sections/diagnostics.ts:152](../../../obsidian-ai/src/settings-sections/diagnostics.ts#L152); inspected counterpart: [ToolsDiagnosticsSections.tsx](../../apps/standalone/src/screens/ToolsDiagnosticsSections.tsx). Owner: T29/T30/T31/T32.

- [ ] **DG03 — Debug log retention** — **Different.** Standalone counts/clamps entries 1–10000; reference approximates retained log lines. Rotation semantics differ.
  Reference behavior: Approximate number of log lines to retain before rotation.
  Source: [settings-sections/diagnostics.ts:168](../../../obsidian-ai/src/settings-sections/diagnostics.ts#L168); inspected counterpart: [ToolsDiagnosticsSections.tsx](../../apps/standalone/src/screens/ToolsDiagnosticsSections.tsx). Owner: T29/T30/T31/T32.

- [ ] **DG04 — Memory snapshot interval (seconds)** — **Wired.** Both clamp 60–3600 and persist; standalone snapshot timer consumes this value. Logging-off/error-only behavior requires parity checks.
  Reference behavior: Record a baseline heap and DOM snapshot at this interval. Minimum 60 seconds; Errors-only logging still keeps these baseline metrics, while Off disables them.
  Source: [settings-sections/diagnostics.ts:182](../../../obsidian-ai/src/settings-sections/diagnostics.ts#L182); inspected counterpart: [ToolsDiagnosticsSections.tsx](../../apps/standalone/src/screens/ToolsDiagnosticsSections.tsx). Owner: T29/T30/T31/T32.

- [ ] **DG05 — Refresh metrics** — **Different.** Combined refresh/data-health action exists; metric set is smaller than source, itemized below.
  Reference behavior: Update the diagnostic numbers above.
  Source: [settings-sections/diagnostics.ts:367](../../../obsidian-ai/src/settings-sections/diagnostics.ts#L367); inspected counterpart: [ToolsDiagnosticsSections.tsx](../../apps/standalone/src/screens/ToolsDiagnosticsSections.tsx). Owner: T29/T30/T31/T32.

- [ ] **DG06 — Export diagnostics** — **Different.** Standalone exports IDs/counts/runtime/debugSettings; reference includes broader redacted settings/usage/storage metadata. No full export-schema parity established.
  Reference behavior: Download a JSON file with plugin diagnostics, settings (redacted), and session metadata for debugging or benchmark fixtures.
  Source: [settings-sections/diagnostics.ts:384](../../../obsidian-ai/src/settings-sections/diagnostics.ts#L384); inspected counterpart: [ToolsDiagnosticsSections.tsx](../../apps/standalone/src/screens/ToolsDiagnosticsSections.tsx). Owner: T29/T30/T31/T32.

- [ ] **DG07 — Check data health** — **Different.** Checks session/message structure only. Reference also checks assets, Settings, index/transcripts, draft attachments and memory; preserve expanded scope below.
  Reference behavior: Inspect plugin assets, settings, session indexes and transcripts, attachment drafts, and saved AI memory. This check does not change files.
  Source: [settings-sections/dataHealth.ts:28](../../../obsidian-ai/src/settings-sections/dataHealth.ts#L28); inspected counterpart: [ToolsDiagnosticsSections.tsx](../../apps/standalone/src/screens/ToolsDiagnosticsSections.tsx). Owner: T29/T30/T31/T32.

- [ ] **DG08 — Repair chat data** — **Disabled here.** Visible disabled button; reference opens preview/schedule workflow. Review, backups, restart and unindexed recovery remain mapped below.
  Reference behavior: Preview safe transcript repairs and choose whether to recover valid unindexed chats. Repairs are backed up and applied after Obsidian restarts.
  Source: [settings-sections/dataHealth.ts:121](../../../obsidian-ai/src/settings-sections/dataHealth.ts#L121); inspected counterpart: [ToolsDiagnosticsSections.tsx](../../apps/standalone/src/screens/ToolsDiagnosticsSections.tsx). Owner: T29/T30/T31/T32.

- [ ] **DG09 — JS Heap Used** — **Wired.** Displayed only when runtime exposes performance.memory; unavailable state shown otherwise.
  Source: [settings-sections/diagnostics.ts:222](../../../obsidian-ai/src/settings-sections/diagnostics.ts#L222); inspected counterpart: [ToolsDiagnosticsSections.tsx](../../apps/standalone/src/screens/ToolsDiagnosticsSections.tsx). Owner: T29/T30/T31/T32.

- [ ] **DG10 — JS Heap Total** — **Missing.** Collected in exported runtime heap object but no equivalent Settings readout.
  Source: [settings-sections/diagnostics.ts:223](../../../obsidian-ai/src/settings-sections/diagnostics.ts#L223); inspected counterpart: [ToolsDiagnosticsSections.tsx](../../apps/standalone/src/screens/ToolsDiagnosticsSections.tsx). Owner: T29/T30/T31/T32.

- [ ] **DG11 — JS Heap Limit** — **Missing.** Collected in exported runtime heap object but no equivalent Settings readout.
  Source: [settings-sections/diagnostics.ts:224](../../../obsidian-ai/src/settings-sections/diagnostics.ts#L224); inspected counterpart: [ToolsDiagnosticsSections.tsx](../../apps/standalone/src/screens/ToolsDiagnosticsSections.tsx). Owner: T29/T30/T31/T32.

- [ ] **DG12 — DOM Nodes** — **Wired.** Standalone corresponding metric exists; verify counts and refresh behavior.
  Source: [settings-sections/diagnostics.ts:225](../../../obsidian-ai/src/settings-sections/diagnostics.ts#L225); inspected counterpart: [ToolsDiagnosticsSections.tsx](../../apps/standalone/src/screens/ToolsDiagnosticsSections.tsx). Owner: T29/T30/T31/T32.

- [ ] **DG13 — Chat Sessions** — **Wired.** Standalone corresponding metric exists; verify counts and refresh behavior.
  Source: [settings-sections/diagnostics.ts:226](../../../obsidian-ai/src/settings-sections/diagnostics.ts#L226); inspected counterpart: [ToolsDiagnosticsSections.tsx](../../apps/standalone/src/screens/ToolsDiagnosticsSections.tsx). Owner: T29/T30/T31/T32.

- [ ] **DG14 — Total Messages** — **Wired.** Standalone corresponding metric exists; verify counts and refresh behavior.
  Source: [settings-sections/diagnostics.ts:227](../../../obsidian-ai/src/settings-sections/diagnostics.ts#L227); inspected counterpart: [ToolsDiagnosticsSections.tsx](../../apps/standalone/src/screens/ToolsDiagnosticsSections.tsx). Owner: T29/T30/T31/T32.

- [ ] **DG15 — LLM Usage (estimated)** — **Missing.** No equivalent Settings aggregate estimated usage metric.
  Source: [settings-sections/diagnostics.ts:228](../../../obsidian-ai/src/settings-sections/diagnostics.ts#L228); inspected counterpart: [ToolsDiagnosticsSections.tsx](../../apps/standalone/src/screens/ToolsDiagnosticsSections.tsx). Owner: T29/T30/T31/T32.

- [ ] **DG16 — Estimated input / output** — **Missing.** No Settings input/output aggregate metric.
  Source: [settings-sections/diagnostics.ts:229](../../../obsidian-ai/src/settings-sections/diagnostics.ts#L229); inspected counterpart: [ToolsDiagnosticsSections.tsx](../../apps/standalone/src/screens/ToolsDiagnosticsSections.tsx). Owner: T29/T30/T31/T32.

- [ ] **DG17 — Completed responses** — **Missing.** No equivalent completed-response metric.
  Source: [settings-sections/diagnostics.ts:230](../../../obsidian-ai/src/settings-sections/diagnostics.ts#L230); inspected counterpart: [ToolsDiagnosticsSections.tsx](../../apps/standalone/src/screens/ToolsDiagnosticsSections.tsx). Owner: T29/T30/T31/T32.

- [ ] **DG18 — Plugin Storage** — **Different.** Browser origin storage estimate differs from plugin-folder total.
  Source: [settings-sections/diagnostics.ts:235](../../../obsidian-ai/src/settings-sections/diagnostics.ts#L235); inspected counterpart: [ToolsDiagnosticsSections.tsx](../../apps/standalone/src/screens/ToolsDiagnosticsSections.tsx). Owner: T29/T30/T31/T32.

- [ ] **DG19 — Storage Breakdown** — **Missing.** No per-file/category storage breakdown.
  Source: [settings-sections/diagnostics.ts:236](../../../obsidian-ai/src/settings-sections/diagnostics.ts#L236); inspected counterpart: [ToolsDiagnosticsSections.tsx](../../apps/standalone/src/screens/ToolsDiagnosticsSections.tsx). Owner: T29/T30/T31/T32.

- [ ] **DG20 — Usage by model** — **Missing.** No equivalent Settings model-usage bars/aggregate list.
  Source: [settings-sections/diagnostics.ts:234](../../../obsidian-ai/src/settings-sections/diagnostics.ts#L234); inspected counterpart: [ToolsDiagnosticsSections.tsx](../../apps/standalone/src/screens/ToolsDiagnosticsSections.tsx). Owner: T29/T30/T31/T32.

- [ ] **DG21 — Export data-health report** — **Missing.** No separate report action with full findings/omission counts/limits; generic diagnostics includes narrower structural health list.
  Source: [settings-sections/dataHealth.ts:92](../../../obsidian-ai/src/settings-sections/dataHealth.ts#L92); inspected counterpart: [ToolsDiagnosticsSections.tsx](../../apps/standalone/src/screens/ToolsDiagnosticsSections.tsx). Owner: T29/T30/T31/T32.

- [ ] **DG22 — Data-health findings and limitations** — **Different.** Standalone findings are session/message structure only; preserve source assets/settings/index/transcript/draft/memory checks and omitted/limitation reporting.
  Source: [settings-sections/dataHealth.ts:72](../../../obsidian-ai/src/settings-sections/dataHealth.ts#L72); inspected counterpart: [ToolsDiagnosticsSections.tsx](../../apps/standalone/src/screens/ToolsDiagnosticsSections.tsx). Owner: T29/T30/T31/T32.

- [ ] **DG23 — Repair: Repair preview and progress** — **Disabled here.** Read-only scan, counts, progress and proposed safe changes. Standalone repair entry is disabled and no nested equivalent is connected.
  Source: [modals/DataRepairModal.ts:62](../../../obsidian-ai/src/modals/DataRepairModal.ts#L62); inspected counterpart: [ToolsDiagnosticsSections.tsx](../../apps/standalone/src/screens/ToolsDiagnosticsSections.tsx). Owner: T29/T30/T31/T32.

- [ ] **DG24 — Repair: Choose unindexed chats to recover** — **Disabled here.** Independent chat checkboxes with title/message counts and skipped reasons. Standalone repair entry is disabled and no nested equivalent is connected.
  Source: [modals/DataRepairModal.ts:215](../../../obsidian-ai/src/modals/DataRepairModal.ts#L215); inspected counterpart: [ToolsDiagnosticsSections.tsx](../../apps/standalone/src/screens/ToolsDiagnosticsSections.tsx). Owner: T29/T30/T31/T32.

- [ ] **DG25 — Repair: Review files requiring manual repair** — **Disabled here.** Retain skipped paths/reasons and findings limits. Standalone repair entry is disabled and no nested equivalent is connected.
  Source: [modals/DataRepairModal.ts:254](../../../obsidian-ai/src/modals/DataRepairModal.ts#L254); inspected counterpart: [ToolsDiagnosticsSections.tsx](../../apps/standalone/src/screens/ToolsDiagnosticsSections.tsx). Owner: T29/T30/T31/T32.

- [ ] **DG26 — Repair: Schedule selected repairs** — **Disabled here.** Apply after restart; original verification and backups are required reference behavior. Standalone repair entry is disabled and no nested equivalent is connected.
  Source: [modals/DataRepairModal.ts:101](../../../obsidian-ai/src/modals/DataRepairModal.ts#L101); inspected counterpart: [ToolsDiagnosticsSections.tsx](../../apps/standalone/src/screens/ToolsDiagnosticsSections.tsx). Owner: T29/T30/T31/T32.

- [ ] **DG27 — Repair: Cancel scheduled repairs** — **Disabled here.** Reference can undo scheduling before restart. Standalone repair entry is disabled and no nested equivalent is connected.
  Source: [modals/DataRepairModal.ts:97](../../../obsidian-ai/src/modals/DataRepairModal.ts#L97); inspected counterpart: [ToolsDiagnosticsSections.tsx](../../apps/standalone/src/screens/ToolsDiagnosticsSections.tsx). Owner: T29/T30/T31/T32.

- [ ] **DG28 — Repair: Repair backup information** — **Disabled here.** Record where originals are backed up and failures surfaced. Standalone repair entry is disabled and no nested equivalent is connected.
  Source: [modals/DataRepairModal.ts:275](../../../obsidian-ai/src/modals/DataRepairModal.ts#L275); inspected counterpart: [ToolsDiagnosticsSections.tsx](../../apps/standalone/src/screens/ToolsDiagnosticsSections.tsx). Owner: T29/T30/T31/T32.

## Destination-only controls and unresolved contracts

Super Chat also exposes message-time/token-estimate preferences, manual memory
entry/category/tag editing, staged-memory promotion, recovery-copy restore,
chat archive export, diagnostic-log export and app reload actions. These are
existing additions; they do not count as substitutes for unmatched reference
controls. No deletion or expansion of these additions is decided here.

Cross-cutting acceptance includes save timing (immediate versus explicit Save),
defaults, validation, failed-save rollback, busy/cancel states, keyboard/focus,
search discovery of conditional controls, reload persistence, per-host credential
and file handling, and export/import/sync coverage of every setting. Source
labels and descriptions are not proof that their underlying feature works;
conditional/placeholder behaviors require their own source/runtime trace.

## Next comparison work

Use this ledger to inspect each unresolved setting's consumer and focused tests,
then implement the agreed mapping under existing owners. Do not replace missing
controls with a blanket platform exclusion. In particular, keep separate the
context-loader budget, full request budget, response reserve, history retention,
semantic compaction and result replay limits. Preserve the reference choices
for providers/authentication, prompt inspection, tags, memory, credential
exchange, update channels/build browsing, storage migration and repair while
working out host-specific contracts.
