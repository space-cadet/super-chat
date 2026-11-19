# T15/T22 Settings Feature Port — 2026-11-18

*Date: 2026-11-18 18:27:47 IST*
*Branch: `main`*
*Source commit: `c006a6a245918b772e35859a794378cfe4f99d84`*
*Obsidian-AI reference commit: `7b7e73560281e11e4a9a68faafc0b2f692c75b4d`*

## Ported behavior

- Copied Obsidian-AI's `sessionTitle.ts` helper into `src/utils/sessionTitle.ts`.
  The cleanup and title prompt stay intact; provider requests cross through
  `LLMAdapter` and use the active session's provider/model choice. Automatic
  naming remains opt-in and uses the copied local heuristic when the model
  gives no usable title.
- Added source-style session-tag parsing and generation to the shared tag
  helper. It uses the latest eight user/assistant messages, caps each excerpt
  at 600 characters, removes context blocks and replaces code blocks, then
  normalizes at most eight saved labels. New-chat tagging is opt-in and uses
  the selected standalone profile; suggestions merge into current tags.
- Imported archives clear the automatic-tag pending flag. Existing chats with
  messages are not automatically sent for tagging. Failed or empty generation
  clears pending state as the current Obsidian-AI source does.
- Added settings for restoring saved/active chat tabs, restoring each chat's
  transcript scroll position, and setting tab-title width from 120 to 360 px.
  The restore preference is applied before workspace loading.

## Remaining work

Only the current four standalone Settings groups are represented; the source
inventory still has 13 regular and two advanced groups. Manual and bulk tag
management, global normalization UI, retention controls, context/compaction
defaults, and other inventory items remain open. T15's wider source audit is
also still open.

## Checks

No tests, typechecks, builds, or device checks were run for this code slice.
