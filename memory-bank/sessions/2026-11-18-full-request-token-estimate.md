# T15/T22 Full Request Token Estimate — 2026-11-18

*Date: 2026-11-18 18:56:49 IST*
*Branch: `main`*
*Source commit: `c006a6a245918b772e35859a794378cfe4f99d84`*
*Obsidian-AI reference commit: `7b7e73560281e11e4a9a68faafc0b2f692c75b4d`*

## Ported behavior

- Added `showFullRequestTokens` to the standalone Chat preferences, defaulting
  on to match Obsidian-AI.
- Added a neutral `request-token-estimate` stream event and forwarded it through
  both text-only and tool-assisted replies to the React hook.
- The standalone adapter estimates the prepared model messages after adding
  the selected system instructions and memory. The composer displays that
  estimate while the matching chat is streaming.
- Kept the number labelled as an estimate. Provider-reported usage remains a
  separate field and is not synthesized from this count. Other hosts can emit
  the same event from their adapter boundary.

## Remaining work

Only prepared-message tokens are estimated here; this does not claim to match
provider billing or model tokenization. Provider usage, per-step breakdown,
model/timing details, and the remaining Settings controls stay open in the
master plan and Settings inventory.

## Checks

No tests, typechecks, builds, or device checks were run for this code slice.
