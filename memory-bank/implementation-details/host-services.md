# Host Services for super-chat

*Created: 2026-08-31 23:19:22 IST*
*Last Updated: 2026-08-31 23:19:22 IST*
*Program: INFRA-1 Phase 2*

## What This Is

A host is the product that runs `super-chat`. For example, Arxivite is a host
because it knows about papers, Supabase, and its signed-in user. Obsidian AI is
a host because it knows about the vault, notes, and the editor.

The host gives `super-chat` only the small services it needs. `super-chat`
still owns the chat screen, streaming, sessions, tools, approvals, and other
shared chat behavior.

The public types are in `src/contracts/host.ts`. Consumers can import them
from `super-chat/contracts` or from the main `super-chat` export.

## How to Build a Host

Start with a name, an ID, and an empty set of services:

```ts
const host: SuperChatHost = {
  id: "arxivite",
  name: "Arxivite",
  capabilities: {},
};
```

Then add only the services that product can genuinely provide. Do not add a
placeholder service that throws an error. If the product cannot do something,
leave that service out.

```ts
host.capabilities.retrieval = {
  id: "arxivite.retrieval",
  kind: "retrieval",
  retrieve: async (request, context) => {
    // Ask Arxivite's existing paper search for results.
    return [];
  },
};
```

## Available Services

| Service | What the host provides | What super-chat keeps doing |
|---|---|---|
| identity | Current signed-in person | Uses that identity in the chat experience |
| persistence | Read and write saved chats | Decides when chats are saved and restored |
| credentials | Securely read provider credentials | Uses credentials to configure a provider |
| tools | Product actions, such as reading a note | Shows tools, asks for approval, and records results |
| retrieval | Search results, such as papers or notes | Decides when to search and displays citations |
| documents | Read or write a document | Builds the chat action and approval flow |
| navigation | Open a paper, note, session, or settings page | Chooses when a chat action should navigate |
| notifications | Show a product message | Chooses when to report chat state |
| lifecycle | Start, stop, or report visibility | Stops active chat work safely |

## Important Rules

- Keep product APIs inside the product. Do not pass an Obsidian `App`, a raw
  Supabase client, or an Electron object into `super-chat`.
- Give each service a stable, non-empty ID, such as `arxivite.retrieval`.
- Tool descriptions include whether a tool reads, writes, deletes, or contacts
  an outside service. They also state whether approval is always needed.
- A write service is optional. A host that only reads data must not pretend it
  can write.
- The `signal` in the operation context tells a host that a user stopped the
  request. Respect it where the product API allows cancellation.
- The `requestId` lets logs connect related work without exposing private data.

## Checking a Host

Use the built-in checks while building an adapter:

```ts
const report = validateHostContract(host);

if (!report.valid) {
  console.error(report.issues);
}
```

The check catches empty host/service IDs, duplicate service IDs, and services
stored under the wrong name. It does not call product APIs or write data.

## What Is Not Done Yet

This phase defines the public shapes and checks them. It does not yet make
`ChatEngine` run through a host. That comes next, in INFRA-1 Phase 3 and Phase
4, when we define session saving and prove a complete fixture host.

