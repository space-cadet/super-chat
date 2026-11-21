# Obsidian-AI reference toolbar and overflow

*Updated: 2026-11-21 15:31:01 IST*
*Owners: T22 / T15, with T25 / T28 / T30 / T32.*

Implemented the reference nine-button order: new chat, history, search,
models (CPU/count), agents (people/badge), sync, zen, Settings and overflow.
A compact provider/model chip sits below. Account header is hidden on Chat;
Settings retains account/sign-out access. Overflow uses grouped white rows in
a bottom sheet with the reference labels: rename, auto-name, generate tags,
auto-approve, room members, relay, export and update check.

## Layout and visual treatment

The chat account bar is hidden to reclaim vertical space; Settings still exposes
the account and sign-out action. The nine-button toolbar stays on one row, with
a compact provider/model chip beneath it. The action buttons use a light neutral
style, with teal for the active agent control and a violet count badge/model
accent. The existing dusk-blue and coral bottom navigation remains in place to
echo the app icon. The grouped overflow uses a rounded bottom sheet with a grab
handle. Browser inspection at 393px showed all nine actions without horizontal
page overflow.

The user explicitly deferred relay: Connect relay remains greyed out; no remote
chat networking was added. Room members shows the local state and zero remote
members. Models and agents have separate pickers; selected profiles, roster and
per-profile model overrides are saved in canonical conversation fields.
Selected agents run sequentially through the existing engine with one visible
user message, attributed replies, normal tools/approvals and cancellation that
stops subsequent agents. Missing local profiles block sending explicitly.

Rename and manual tagging use real engine/LLM paths. Auto-name and auto-approve
preferences persist in the owner-scoped chat preferences. Auto-approve updates
the active loop and can release waiting approvals. Zen retains a visible exit.
Sync opens the existing configuration/run form without starting uploads or
requiring a remote setup. Check for Updates performs an actual public GitHub
release lookup, with no-public-release and HTTP error feedback. No updater or
automatic installer is claimed. Import remains available from the model picker;
export uses the existing archive modal and canonical serializer.

Evidence: shared suite 265 tests / 38 files passed before the final live-approval
case; final affected core/agent/UI set passed 56 tests; final core/action set
passed 5 tests; final two UI tests cover model/agent selections and overrides.
Standalone suite 18 tests / 8 files passed. Shared and standalone typechecks,
Android debug build and whitespace checks passed. Browser at 393px showed all
nine buttons with no horizontal page overflow. Sync form opening, auto-name
reload persistence, grouped menu and actual update-check response were observed.
No public release was found in that browser check. Preview images are in
`.playwright-mcp/reference-toolbar.png` and `reference-overflow.png`.

APK: `apps/standalone/android/app/build/outputs/apk/debug/app-debug.apk`;
SHA-256 `d22f1289ded3696ff55bd02972e7f007a493d293af75c51aaafc716cea0e07f8`.
This APK was installed and launched on `.128`; detailed device evidence is in
[standalone Android](standalone-android.md). Visual and interaction acceptance
of the toolbar on-device, live multi-provider requests and configured remote
sync remain unverified. No remote configuration was needed or added.

Obsidian-AI transfer acceptance and the deferred Markdown-import issue are
recorded in [data parity](obsidian-ai-data-parity.md).
