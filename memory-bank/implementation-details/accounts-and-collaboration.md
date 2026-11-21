# Standalone Accounts and Collaborative Conversations

*Created: 2026-11-21 00:15:07 IST*
*Last Updated: 2026-11-21 15:31:01 IST*
*Status: Local single-owner login and data scoping implemented; native acceptance partial; remote collaboration deferred*
*Owners: T33 accounts/backend; T22 shared lifecycle/messaging; INFRA-1 program*

## Current state — 2026-11-21

Super Chat currently has one local account on one Android device. Local login,
owner-scoped storage and service access are implemented. No hosted authentication,
remote user system or remote collaboration has been added. The latest APK was
installed and launched on `.128`; on-device ownership-flow and toolbar interaction
checks remain open. The implementation record is below; see also
[Android evidence](standalone-android.md).

## Longer-term product goal

The product may later support conversations among people and AI. Obsidian-AI's
one-user/multiple-agent behavior is user-confirmed; its multiple-user behavior
has not been tested. Neon + Clerk were explored, but no hosted stack was selected
or provisioned. Relay and authenticated collaboration are not part of the current
local-app work.

## Requirement and current decision

Keep the current app simple: one local owner and local data. Requirements for
future hosted accounts or shared conversations remain deferred and must not be
treated as implemented or required for the current setup. The original
ownership inventory and future-stage design below document the reasoning and
possible later work; the implementation record at the end is the current source
for local behavior.

## Global ownership model and local-first implementation

### Confirmed scope and proposed defaults

The user requested a global ownership review, then authorized a local login
without remote authentication. That slice is implemented. Password recovery,
at-rest encryption and broader account lifecycle behavior remain open; see the
implementation section below for actual local behavior and limits.

Local login is the current implementation slice. No hosted authentication or
collaboration is required for it. The local verifier is not encryption; password
recovery and broader account lifecycle behavior remain open.

### Identity: names, authentication and ownership

```text
local person (stable user ID)
    +--> private records and local store scope
    +--> optional verified remote account link, later
    +--> conversation membership, later

installation/device ID
    +--> device preferences and platform secret references

conversation ID
    +--> authorized members and roles
    +--> shared messages/files/AI participants
```

Persist the local ID once; changing a username, resetting a login session or
adding a remote sign-in method must not silently create a new data owner.
A local login proves access within that installation; a future remote account
link needs independent verification. Matching display names on two devices do
not establish one person. Do not merge stores on that basis. Agent ID, provider
profile ID, credential reference and device ID have separate meanings.

Here ownership means application responsibility and permission to read, change,
share, export and delete data. Record creator/sender independently from current
access. AI responses belong to the conversation's stored history, with the
agent and initiating user attributed; agents are not human account owners.

### Complete data inventory and recommended scopes

| Data | Source state during initial audit | Recommended ownership/access | Lifecycle consequence |
|---|---|---|---|
| User profile and local login verifier | Absent; host identity hook exists | Single local user; verifier separate from ordinary settings/archive/sync | Create once; only authenticated profile management may change it; no secret in logs/exports |
| Chats, messages, turns, tool results, retrieved context | `persistence.ts` sessions store; full snapshots | Private user conversation now; explicit member access later | Unreadable through app before login; shared writes later require per-message arbitration |
| Tabs, drafts, draft files, scroll, search navigation | `chat-workspace` plus session fields | Private user/device view, even for a shared conversation | Never publish another person's draft or active-tab choices |
| Attachments, extracted PDF/text/images and search results | Session attachments/resolved content; search-document service | User-private until explicitly attached/shared | File access, upload, extracted text and replay all follow conversation permissions |
| Personal memory, audit, persona and recovery snapshots | `long-term-memory`, `memory-settings` | Private user, including backups | Shared AI turn receives only deliberately shared context; account cleanup includes history copies |
| Provider profiles, model defaults, custom endpoints | Provider settings keys and credential references | Private user configuration | An invited participant cannot use another user's provider simply by seeing its profile ID |
| Provider/search keys and future account tokens | Android credential plugin; some services keep session secrets | Private user plus device secret store | Stop old-user access on logout; never include values in archives or sync |
| Chat instructions, budgets, tools and integrations | `standalone.chat-preferences`, `search-documents`, integration settings | Personal defaults; conversation-specific instructions explicitly captured when needed | Distinguish preference changes from changes to a shared AI participant |
| Presentation, accordion state and diagnostics interval | Presentation/open-section and diagnostic settings keys | Device-local view/configuration; account-specific preferences where appropriate | Do not synchronize device state accidentally as shared conversation settings |
| WebDAV connection, component selections, indexes and retry/cache data | `remote-storage`, `sync-components`, identity-derived stores/cache DB | Private user + configured destination + device progress | Logout suspends sync; old retry writes cannot target another owner; remote paths must not collide |
| Logs, usage and diagnostics | Diagnostic log, telemetry and count summaries | Device metrics separate from user/session records | Avoid retaining messages/secrets; account exports and cleanup must cover user-linked logs |
| History recovery copies and import/export files | `chat-history-recovery`, sync recovery, JSON/JSONL/Markdown | Same access rules as original data; exported files become independent copies | Clearing history is not full erasure; report retained backups and external copies |
| Conversation members, invitations, roles, AI run ownership | Absent; inbound participant metadata only | Future backend-managed conversation records | Client selections cannot grant access; verify every read/write and run trigger |
| Presence/typing/read state | Legacy relay settings only in standalone | Member-visible temporary state; personal read state scoped separately | Do not use presence as identity proof or retain it as permanent chat content |

This table records the initial ownership audit, not the current implementation.
The owner-enforced local storage correction below supersedes its statements
about unscoped keys. All current data remains local to the app installation;
the login does not encrypt saved data at rest.

### Actions and the data they affect

| Action | Proposed behavior / decision needed |
|---|---|
| Initial local setup | Create user identity, associate existing data with explicit notice, and keep migration/recovery metadata; no upload |
| Sign in | Resolve identity/store context before preferences, profiles, diagnostics or chat hydration |
| Sign out / lock | Abort streaming/tools and auxiliary calls, stop sync and subscriptions, flush safe pending work or record interruption, drop app-held secrets/state; preserve durable data |
| Change display name or password | Preserve owner ID; decide password change/recovery and any encryption rekey separately |
| Link remote account later | Verify remote identity, then explicitly associate local data; preview conflicts/copies and preserve recoverability |
| Share or invite | Grant access to chosen conversation/files; personal memory, credentials, private chats and drafts stay private |
| Run an AI | Choose agent, executor/payer, shared input and tool rights; capture one idempotent run and deliver replies to authorized members |
| Edit/delete a message | Personal chats: owner action; shared chats: decide author/admin rules and revision/delete events before release |
| Leave/remove a member | Stop future access and refresh subscriptions; previously exported/downloaded copies cannot be recalled by the app |
| Clear chat history | Explain recovery copies and retain/remove them according to an explicit policy |
| Delete local profile/data | Separate from logout; cover chats/settings/memory/secrets/cache/retries/logs/recovery stores; destructive behavior requires a concrete reviewed flow |
| Delete remote account later | Revoke access and decide shared-record retention/attribution; deleting an account must not silently erase other members' history |
| Export/import or restore | Exclude verifiers/tokens/keys; imported archives create authorized local records, never remote membership or permission grants |

A single database transaction cannot revoke already-running native operations
or remote uploads. The session context must carry cancellation/lifetime through
those calls, and delayed callbacks/writes must be rejected once their session
ends. Define sign-out completion around that behavior before claiming isolation.

### Decisions to sort before each stage

- Local slice: username/display-name fields, lock method, restart policy,
  recovery/reset behavior, data left on disk, verifier location, scoped settings
  versus device settings, and explicit legacy-data association.
- Cloud slice: verified identity linking across devices, selected provider,
  offline access after expiry, token storage, migration/merge and backup strategy.
- Collaboration slice: invitation/role rules, deletion/retention, history visible
  to new members, AI triggering/executor/payer, tool authorization, shared memory
  and attachment access, access removal and encryption expectations.

These are tracked product decisions. Recommendations in this document do not
represent accepted defaults for the later cloud/collaboration slices.

### Ordered delivery and evidence

1. **Local ownership design:** recorded here and implemented for the current
   single-owner app.
2. **Local login and owner enforcement:** implemented; browser checks passed.
   Android installation is confirmed, but detailed login/logout and interruption
   behavior still needs device acceptance.
3. **Future hosted accounts and collaboration:** deferred. Two-user delivery,
   permissions and recovery are not implemented.

At the original design checkpoint no source was changed. The later local account
implementation and its remaining acceptance are recorded below.

## Proposed structure (later hosted stage)

```text
shared chat UI and engine (T22; agent behavior T6/T15)
        |
        +--> standalone account lifecycle (T33)
        |       +--> Clerk: proposed authentication/session provider
        |       +--> account-scoped local storage and cache
        |
        +--> authenticated standalone backend (T33)
                +--> verify session and conversation permissions
                +--> Neon: proposed durable conversation database
                +--> authorized message delivery (approach undecided)

Android authentication/storage integration: T32i
Desktop authentication/storage integration: T31i
Obsidian: its own host identity and vault persistence
```

Clerk/Neon SDKs and tokens stay in the standalone host/backend implementation.
Shared contracts expose neutral identity, persistence and messaging operations.
A username is display metadata; permissions use verified stable user IDs.
Application sign-in and AI-provider sign-in are separate account relationships.

## Proposed records and ownership

| Record | Purpose |
|---|---|
| users | Internal stable user ID and unique Clerk subject mapping; profile metadata separate from access rules |
| conversations | Durable conversation ID, creator, kind and lifecycle state |
| conversation_members | Verified human membership, role and access state |
| conversation_agents | Agent identity, execution owner and permitted capabilities; credential values excluded |
| messages / message events | Stable message ID, conversation, verified sender, ordering, edits/deletions and turn linkage |
| AI runs | Trigger message, executing participant, status and idempotency key to prevent duplicate model calls |
| user settings and local caches | Per-account private settings, drafts/tabs and sync progress |
| attachments | Owner/conversation access and references; storage service undecided |

These are proposed responsibilities, not an implemented database schema.
Use account IDs for private data and conversation membership for shared data.
Separate agent identity, provider profile identity, human account and device.

## Account lifecycle and migration

- Resolve account state before opening its store or hydrating an engine.
- Scope local sessions, drafts, tabs, memory/audit/persona, provider profiles,
  credentials, settings, search/cache entries, WebDAV state and retry queues.
- On sign-out or switching, cancel active work, detach subscriptions, dispose
  the old engine/cache, and prevent late callbacks or queued writes from
  affecting the next account. Token refresh must not create a new data owner.
- Preserve existing anonymous local data until the user explicitly chooses
  whether to associate/upload it. Keep a recoverable migration record.
- Decide local use without login, offline access after session expiry, retained
  device copies on sign-out, and account deletion before implementing policy.
- Server operations derive the user from a verified token and check membership;
  client-supplied sender IDs and UI selections cannot grant access.

## Conversation lifecycle and delivery

- Map a durable remote conversation ID to a local engine session, independently
  of the currently active tab. Membership and selected AI participants persist.
- The engine owns each client's chat state and persistence scheduling. The
  backend arbitrates shared durable messages and concurrent updates; replacing
  a whole conversation from each client must not overwrite another sender.
- Use stable IDs, idempotent writes, explicit order/cursors and reconnect fetch
  of missed events. Represent pending, acknowledged and failed sends clearly.
- Deliver AI replies and human messages through the same authorized history.
  Define edit/delete permissions and recovery of interrupted AI turns.
- Presence and typing are temporary events. Saved history and WebDAV backup/sync
  retain distinct purposes and explicit conflict/deletion rules.
- Decide AI triggering on remote input and one execution owner per run. A
  client running an AI with its own key is an option, not an accepted default.
  Define payer, cancellation authority, duplicate prevention and recovery.
- Private memory, vault/file tools and credentials require explicit sharing
  rules. Shared conversation membership alone does not expose them.
- Invitations, removing members, deletion versus leaving a conversation,
  retention and any end-to-end encryption requirement remain product decisions.

## Obsidian-AI review and reuse boundary

Reference checkout: `/Users/deepak/code/obsidian-ai`, commit
`7b7e73560281e11e4a9a68faafc0b2f692c75b4d`. Source was reviewed read-only;
existing unrelated Memory Bank edits were preserved. No tests or two-client
runtime checks were run in this review.

Reuse coherent source groups under T15's compatibility contract:

- `src/agent/Orchestrator.ts`: agent selection, sequential/parallel dispatch,
  debate, context attribution, attachment replay and tools. Sequential replies
  enter the next agent's working context. User-confirmed one-user/many-agent
  operation is distinct from unverified remote-human operation.
- `src/agent/ParticipantRouter.ts`: composition of agent dispatch and remote
  human delivery, including an orchestrator-free human-only path.
- `src/sync/SyncAdapter.ts`: transport-neutral message/presence interface;
  adapt it to authenticated conversations rather than assuming it is complete.

Observed gaps in current source:

| Finding | Evidence | Required Super Chat work |
|---|---|---|
| Router sends the human prompt; yielded AI responses are appended locally without relay sends in the reviewed group path | `ParticipantRouter.ts:60`, `turnLifecycle.ts:530` | Shared delivery of every AI reply |
| Incoming relay messages append to the active tab without starting AI dispatch | `ChatApp.tsx:770` | Explicit conversation mapping and remote-input trigger policy |
| Selected remote users only enable sending; relay broadcasts to the whole room | `ParticipantRouter.ts:60`, `relay/server.js:58` | Backend-enforced membership and recipients |
| Room is global settings and connection follows active session | `ChatApp.tsx:741` | Stable remote conversation/session routing |
| Usernames are supplied by clients; relay has no auth or durable history | `relay/server.js` | Verified identity, permissions and stored history |
| Reconnect opens a socket without an outbox or missed-message replay; inbound callback appends without ID dedup | `WebSocketSyncAdapter.ts:150`, `ChatApp.tsx:770` | Idempotent delivery, recovery and deduplication |
| Debate calls Orchestrator directly, bypassing ParticipantRouter | `turnLifecycle.ts:503` | Consistent delivery across dispatch modes |

Router tests mock transport; orchestrator tests cover attribution/context and
agent/tool behavior. They do not establish two-client messaging acceptance.
Reference owners are T16/T16a/T16b, T40, T43 and T46. T40 leaves cross-device
acceptance open; T43 defers Phase 5, while `multi-user-agent-chat.md` claims all
five phases complete. Retain that discrepancy as a documentation finding and
use source plus the user's runtime evidence. Do not change the reference repo
or inherit its completion claims. Its account-free LAN relay decision is
specific to Obsidian's environment.

## Feasibility evidence and open checks

Official documentation checked in this session (2026-11-21 IST):

- [Clerk + Neon integration](https://clerk.com/docs/guides/development/integrations/databases/neon).
- [Clerk instance API](https://clerk.com/docs/reference/backend-api/2026-08-20/tag/instance-settings/PATCH/instance): Capacitor described as not officially supported; origin handling requires care.
- [Clerk Electron SDK](https://clerk.com/docs/reference/electron/overview): beta, with sign-in-method restrictions.
- [Neon Realtime announcement](https://neon.com/blog/neon-now-has-realtime): public beta and no RLS for that realtime path as documented at review time. Verify current support before implementation; do not assume Postgres RLS protects live subscriptions.

T32i must prove sign-in, callbacks, app restart, refresh, sign-out and account
switching on device. T31i supplies independent packaged Electron evidence.
T33/T22 must choose server-authorized Neon live queries or another delivery
service and verify access removal, reconnect recovery and two-client behavior.
The exact backend hosting, attachment storage, schemas and deployment remain open.

## Owner cross-references

T33 owns accounts/backend; T22g/h shared identity/messaging; T31i/T32i platform
acceptance; T6 agent execution behavior; T7 addressing; T15 source reuse; T26
private memory; T27 attachment access; T28 credential/execution ownership; T30
account-aware archive/export. INFRA-1 and the master plan own sequencing.

## Initial local-login checkpoint — superseded by ownership correction

Implemented first-use name/password setup, salted PBKDF2-SHA256 verifier
(600,000 iterations), sign-in after reload, visible local identity and sign-out.
The authenticated app mounts after login; its existing engine unmount disposal
stops active streaming. The host supplies the stable local ID/name for new
message attribution. Existing chats/settings remain in their original store.
Login record is stored separately by key from ordinary settings exports.
This is an app lock for testing, not encrypted data or remote authentication.
Password recovery, account changes, full owner-scoped services/storage, and
sign-out during asynchronous initialization/sync remain open. No claim of
multi-account isolation or device acceptance.

Standalone typecheck and a focused real-WebCrypto test passed (stable identity,
wrong password, overwrite prevention and no plaintext password storage). Web
production build passed, including the shared library build and standalone typecheck. No Android/desktop
installation or browser interaction check was performed.

## Owner-enforced local storage correction — 2026-11-21

The initial local-login slice left data installation-wide. The user identified
that this did not fulfill the ownership plan; this correction supersedes that
slice's storage limitations. The one-time association of existing records with
the local owner is an ownership step only. It does not convert chats to the
Obsidian-AI format, which has no migration, and it does not upload data.

- IndexedDB version 2 adds `owned-sessions` keyed by `[ownerId, id]` and
  `owned-settings` keyed by `[ownerId, key]`. All existing application settings
  paths (memory/audit/persona, drafts/workspace, logs, recovery and sync metadata)
  use the owner-required settings store; session reads/writes filter by owner.
- The login verifier alone remains in the bootstrap store and cannot be read
  through ordinary settings exports. Account creation uses an atomic transaction.
- After password verification, a single readwrite transaction associates legacy
  sessions/settings with that account and records `legacy-owner`. Repeated login
  does not copy again. Original unscoped records remain inaccessible through the
  application as recovery copies; they are not erased or encrypted.
- Chat preferences, drafts/workspace, memory/audit/persona, diagnostics/logs,
  recovery and sync metadata use owner-scoped settings. Search-document cache
  entries and PDF retrieval signals also follow the active owner lifetime.
- Each unlocked session has a revocable lifetime. Store calls require it before
  and after asynchronous work, and revoke in-flight IndexedDB transactions.
  Native/tool results from an ended session are rejected. Sign-out revokes the
  lifetime, clears cached model adapters, aborts fetch/AI signals and reloads the
  app to discard stale closures, queues and in-memory state before next login.
- Native credential references are internally prefixed with the user ID.
  Only the original local account may adopt legacy secrets; removal also removes
  the legacy source so deletion cannot resurrect a key. Sync cache identities
  now include the user ID; the transport captures its initiating login lifetime.
- Android document-picker requests retain a revocation token with pending output;
  the native plugin rejects a late picker result before writing after sign-out.
  This cancellation path has not yet been accepted on-device.
- This is app-enforced local ownership, not encryption or protection from code
  running with access to the same origin/device. Single-account UI remains;
  multiple account creation/switching and remote authentication are not provided.
  Native operations already dispatched may finish on their original device/user
  target; their results are rejected after logout. No remote write is recalled.

Verification: 16 standalone tests plus a focused credential-isolation test
passed (17 total), along with five shared host/UI tests, standalone TypeScript,
shared-library/web production build and `git diff --check`. The browser's real
IndexedDB proved signed-out denial, legacy history/settings preservation,
separation of two synthetic owner IDs with identical keys, revoked-write
rejection, repeat-login identity continuity and no duplicate migration. UI
sign-in displayed the preserved legacy chat; sign-out reloaded to login and
blocked data access. Settings export contained no login verifier. Browser
console had no errors at the accepted signed-in checkpoint. Initial preview
used the wrong working directory and was corrected before these checks.

Android/desktop native runtime, live-provider interruption and live WebDAV
interruption remain unverified. Password recovery, encrypted storage, deletion
of retained legacy recovery copies and the later remote/multi-user features
remain separate open requirements. T33 stays in progress.
