# Provider Profiles and Fast Model Switching

## Current Source State — 2026-11-18

The optional `provider-profiles` host capability returns profile names, provider
IDs, default models, and the default profile ID; it never returns credentials.
The host owns profile storage and the credential reference. The shared engine
stores `llmProfileId`, `llmProvider`, and `llmModel` on each chat session and
passes that selection to every text or tool-capable request.

`SuperChatApp` loads the host's default before creating the first session,
hydrates missing or removed profile selections, and listens for profile
changes. The shared chat UI offers a profile picker and editable model field.
Selecting another tab restores that conversation's selection. Profile/model
changes are blocked while the shared engine is streaming.

The standalone host stores multiple provider profiles and a default in its
existing local settings store. It keeps each profile's API key in the host
credential capability. The former single-provider setting migrates on first
read to one profile without moving or exposing its protected key. The settings
screen supports add, edit, duplicate, remove, default selection, provider
connection checks, model suggestions, and manual model entry.

The source passed shared-library typecheck/build, standalone typecheck, and the
Android debug build. Cross-host tests, a device UI check, credential saving,
and a live provider request remain unverified; T28 stays in progress.

## Switching Flow

```text
chat profile/model picker
      |
      +--> session stores profile ID + provider + model
      |
      v
each request resolves the session selection through the host provider adapter

settings profile list + default
      |
      +--> new chats inherit the default
      +--> provider keys stay in host credential storage
```

## Dependencies

```text
host provider-profile capability --> chat picker --> session selection
               |                            |
               v                            v
     protected credential store      per-turn request options
                                            |
                                            v
                                  host LLM adapter/model factory
```

Secrets remain in host credential stores. Sessions contain identifiers and
provider-neutral history, never raw API keys.

## Later Android evidence — 2026-11-18

The toolbar and connection-test fixes were built and installed on the OPPO
CPH2661IN at `.108` during this session. User screenshots `142484.jpg` and
`142490.jpg` show OpenRouter selected and live assistant replies to Hello and
supersymmetry questions. This establishes basic live chat; the exact effective
model is not established by the clipped field. Independent chat/model switching,
credential survival after restart, and tool execution still need checks.

The screenshots also show truncated provider/model controls and a clipped
composer placeholder. Remaining improvements and all reference feature groups
are tracked in the [master plan](../master-plan.md).
