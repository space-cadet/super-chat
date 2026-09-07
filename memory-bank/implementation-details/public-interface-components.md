# Public Interface Components

*Created: 2026-09-07 15:45:36 IST*
*Last Updated: 2026-09-07 17:32:30 IST*
*Program Owner: INFRA-1*
*Workstream: T22*

## Purpose

This is the canonical catalog of the supported boundary between `super-chat`
and product hosts. It documents the interfaces that hosts may consume or
implement, their lifecycle ownership, and their stability. Product repositories
may document their adapter mapping, but they must not redefine these contracts.

## Dependency Rule

Product hosts may import public `super-chat` entry points. `super-chat` must not
import product code, product database clients, routes, or platform types.

```text
Arxivite or another host
  -> implements SuperChatHost capabilities
  -> renders SuperChatApp
  -> depends on a pinned super-chat version or commit

super-chat
  -> owns reusable chat state, lifecycle, and UI
  -> has no dependency on a product host
```

## Public React Surface

The supported React exports are published from `super-chat/react`.

| Component or hook | Responsibility | Host input | Stability |
|---|---|---|---|
| `SuperChatApp` | Host-facing application entry point; creates and coordinates the shared engine and UI | `SuperChatHost`, initial session, and supported configuration | Public |
| `ChatApp` | Reusable chat presentation driven by shared state and actions | Shared chat state and callbacks | Public |
| `SessionSidebar` | Session list, selection, creation, archive, and delete presentation | Shared session state and actions | Public |
| `MessageBubble` | Message, source, and message-action presentation | Shared message records | Public |
| `ChatInput` | Composer and send interaction | Shared send state and callbacks | Public |
| `PendingToolCard` | Approval-required tool-call presentation | Shared approval state and actions | Public |
| `ToolResultCard` | Tool-result presentation | Shared tool results | Public |
| `MarkdownRenderer` | Shared markdown display | Markdown content | Public |
| `useChat` | React binding for `ChatEngine` state and actions | A configured engine | Public |
| `useAgent` | React binding for agent state and actions | Shared agent configuration | Public, evolving |
| `SessionTabs` | Tabs over shared session state | Shared sessions and selection actions | Public package export; not adopted by a host pin |

Importing internal component files or reaching into `src/` is unsupported.
New tab, participant, multi-user, and multi-agent UI becomes a stable public
surface only after it is committed, exported here, and covered by its owning
task and contract tests.

## Public Host Capabilities

The canonical host types are exported from `super-chat/contracts` and the main
package entry point.

| Capability | Host owns | `super-chat` owns | Stability |
|---|---|---|---|
| `identity` | Authenticated identity facts and identity changes | Use of identity in shared chat behavior | Public |
| `persistence` | Physical load, save, archive, and delete operations | When sessions are created, loaded, saved, archived, or deleted | Public |
| `credentials` | Secure credential storage and retrieval | Provider use of supplied credentials | Public |
| `tools` | One or more product tool providers and execution | Discovery, routing, approval, lifecycle, and result display | Public, evolving |
| `retrieval` | Search, document access, domain ranking, and provenance | Retrieval timing, context assembly, replay, and citation display | Public |
| `documents` | Product document reads and writes | Chat action and approval workflow | Public |
| `navigation` | Product routes and navigation implementation | Decision to request navigation | Public |
| `notifications` | Platform notification mechanism | Decision to report shared chat state | Public |
| `lifecycle` | Platform start, stop, and visibility primitives | Safe cancellation and disposal | Public |
| `messaging` | Auth, membership, authorization, transport, and routing | Generic inbound message lifecycle, sender display, deduplication, and persistence | Host capability planned; engine lifecycle implemented |

Unsupported optional capabilities are absent. Hosts must not provide dummy
implementations that fail only when called.

## Session and Persistence Boundary

`super-chat` owns canonical session IDs, active-session state, creation,
hydration, switching, in-memory unloading, streaming state, archive/delete
intent, and persistence scheduling. The host persistence capability performs
the physical operations and maps any external product identity.

There must be exactly one durable write owner in an active integration path.
Unloading a session from client memory is not deletion. Further lifecycle and
record-shape rules are canonical in
[`session-persistence.md`](session-persistence.md).

## Stability and Change Rules

- **Public** interfaces require contract tests and compatibility notes when
  their observable behavior or type shape changes.
- **Public, evolving** interfaces may gain compatible fields or behavior, but
  breaking changes still require an explicit migration record.
- **Planned** interfaces are architectural commitments, not consumable APIs.
- **Working-tree implementation** is not part of a released or pinned package
  until committed and adopted by the consumer.
- **Internal** modules may change without host migration support and must not
  be imported by hosts.
- A host-specific need must first be expressed as a neutral vertical slice.
  Product names and database types cannot enter the shared contract.

## Cross-Repository Delivery

When Arxivite or another host reveals a shared defect:

1. Record the product symptom in the host task.
2. Implement and verify the generic fix in the owning `super-chat` task.
3. Commit the shared change and record its exact commit.
4. Update the host's package version or submodule pointer.
5. Verify that exact revision in the host and record source, browser, and device
   evidence separately.

A pushed `super-chat` commit does not complete the host change. Host adoption
is complete only after the consumer pins and verifies that exact revision. The
current shared implementation commits are `b46731a` and `f9822cc`; no consumer
pin was changed here.

## Arxivite Mapping — Historical

Arxivite-specific adapter names, Supabase mappings, current pins, and product
acceptance belong in Arxivite's
`memory-bank/implementation-details/super-chat-host-integration.md`. T19 tracks
shared compatibility during the retired experiment. Arxivite T101's product
adoption work is superseded; current Arxivite parity work belongs to its native
T102/T102a records.
