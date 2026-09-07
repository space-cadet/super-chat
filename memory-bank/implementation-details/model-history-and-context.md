# Model History and Message Context

*Created: 2026-09-07 01:29:34 IST*

## Purpose

Super-chat keeps two related but separate records:

- the visible conversation shown to the user;
- the message context sent with the next provider request.

The second record may contain tool calls and tool results that do not belong
in the ordinary visible conversation. It must still be complete and valid
when a session is continued after reload.

## Decisions

### Preserve human sender identity

When a host delivers a message from another user, super-chat keeps the
conversation content in normal chronological context and preserves the host's
sender ID and display metadata on the visible message. The shared runtime does
not infer identity from message text, and it does not turn a remote human
message into a new assistant or agent role. Product routing and membership
remain host responsibilities.

### Keep every tool call

One provider response may contain several tool calls. Super-chat must collect
and retain every call, execute each call according to its policy, and add every
result to the next message context. It must not keep only the last call.

The observed single-call retention problem in `obsidian-ai` is a defect to fix
in `obsidian-ai`. It is not behavior to copy into super-chat.

### Keep call and result IDs together

Every tool result must carry the ID of the call that produced it. When history
is rebuilt, a small check should confirm that each result refers to a real
call. This is a data-validity check, not a new manager or coordination system.

### Follow the existing provider conversion

Super-chat should follow the message conversion already proven in
`obsidian-ai`. The shared runtime keeps one internal message format; the
provider adapter converts it to the format required by the selected SDK.
Hosts do not repeat this conversion.

Arxivite remains responsible for provider/model selection, credentials, and
provider policy. Super-chat receives the selected model and prepares valid
messages for it.

### Keep the existing token estimate

The `obsidian-ai` token estimator is the starting point. It should be reused
unless tests show a real problem. Context limits may be supplied by the
selected model or provider, but a new tokenizer system is not part of the
first implementation.

### Keep complete results, shorten the copy sent to the provider

The complete tool result remains available for the visible conversation,
persistence, and audit. If it is too large for the next request, the copy used
in message context may be shortened and must include a clear marker saying
that content was omitted.

If the shortened copy still cannot fit, super-chat must stop before sending
the request and show a clear, recoverable error. It must not silently discard
the newest result.

### Start with simple context selection

The first policy is chronological history with valid tool-call/result groups,
subject to the existing context limit. More elaborate selection by relevance,
priority, or age should be added only after a real conversation demonstrates
that the simple policy is insufficient.

### Defer larger context systems

Do not introduce a new compaction framework, exact-tokenizer service, or broad
context-management layer as part of this work. Add those only when a measured
problem justifies the extra code and rules.

## First Tests

- one provider response containing several tool calls;
- one result for each call, with correct IDs after history reconstruction;
- provider conversion for text, tool calls, and tool results;
- preservation of the complete result while the message-context copy is
  shortened;
- a clear failure when even the shortened newest result cannot fit;
- reload and replay using the same valid message context.
