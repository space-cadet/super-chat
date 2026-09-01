# Arxivite integration workspace

This folder is reserved for the Arxivite integration work around `super-chat`.

The Arxivite repository remains unchanged while this workspace is being
prepared. Integration experiments, external harnesses, compatibility notes,
and migration planning can be kept here until the product-repository changes
are explicitly authorized.

## Current test

The integration tests perform these read-only checks:

- audits the real Arxivite checkout, its active feature-flag path, and its
  pinned `packages/super-chat` submodule;
- validates a disposable Arxivite-shaped host against the current neutral
  `super-chat` host and retrieval contracts.
- loads Arxivite's real chatbot `ToolRegistry` and `registerChatbotTools`
  implementation;
- sends a real registered Arxivite tool through the current `ChatEngine` using
  an adapter kept in this folder;
- carries a retrieved paper source through the current engine and reloads it
  from the test persistence store.

`arxiviteExternalAdapter.ts` is deliberately test-only. It translates the
existing Arxivite registry shape into the current `super-chat` host shape. The
database-backed Arxivite retrieval classes are replaced by deterministic test
implementations, so the checks do not need credentials or a live Supabase
project.

Run it from this folder with:

```text
node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts
```

The current run is 6 passing tests. This is still not full product integration:
the current Arxivite source does not mount `SuperChatApp`, and the test runner
does not start the Arxivite UI or call a live LLM provider.
