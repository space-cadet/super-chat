# T15/T22 Previous-Message Context Limit — 2026-11-18

*Date: 2026-11-18 19:01:32 IST*
*Branch: `main`*
*Source commit: `c006a6a245918b772e35859a794378cfe4f99d84`*
*Obsidian-AI reference commit: `7b7e73560281e11e4a9a68faafc0b2f692c75b4d`*

## Ported behavior

- Added the Obsidian-AI `maxContextMessages` preference to standalone Chat
  settings, with the source default of 10.
- Passed the limit through shared `ChatSettings` and request options for both
  text-only and tool-assisted turns.
- Applied it in the standalone Vercel adapter's existing
  `buildBudgetedHistory` implementation. One extra slot is allowed for the
  current user message, matching the source's separate previous-history and
  current-message inputs.
- Older transcript messages stay saved; the cap only limits the model request.

## Remaining work

The other context and compaction controls in the Settings inventory remain open.
This standalone setting is not evidence that other hosts apply the cap.

## Checks

`git diff --check` passed. No tests, typechecks, builds, or device checks were
run for this code slice.
