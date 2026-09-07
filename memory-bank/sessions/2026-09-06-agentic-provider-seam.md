# Agentic Provider Seam — 2026-09-06

## Decision

Survey `obsidian-ai` before extracting behavior. Keep the first shared change
small: compose host tool capabilities and propagate cancellation through the
existing engine-owned approval and execution path. Do not copy the 31-tool
catalog or create a second agent/runtime manager in this slice.

## Read-only Survey

The `obsidian-ai` source at `b40eab1` contains the mature behavioral reference:

- `src/agent/toolRegistry.ts` defines the canonical built-in catalog, risk and
  availability mapping, provider normalization, collision checks, and schema
  validation.
- `src/agent/ToolExecutor.ts` resolves the same descriptors used by the model,
  validates arguments, checks cancellation, applies mutation locks, and routes
  built-in and provider handlers.
- `src/agent/ChatTurnCoordinator.ts` supplies one React-free tool-enabled turn
  path for native and OpenResponses providers.
- `src/context/modelHistory.ts` and `src/context/contextBudget.ts` preserve
  valid tool-call/result pairs while applying request budgets.
- The built-in catalog currently contains 31 tools. Obsidian-specific handlers,
  vault access, memory storage, settings, and session search remain product
  responsibilities.

## Implementation

- `SuperChatHost.capabilities.tools` accepts one or several tool capabilities.
- Host validation flattens composed capabilities and checks each capability
  independently.
- `HostToolAdapter` resolves each tool name once, routes calls to the owning
  capability, rejects duplicate names, and forwards the active abort signal.
- `ToolAdapter`, `ToolExecutor`, `AgentLoop`, and `ChatEngine` now preserve the
  signal through adapter-backed tool execution.
- Existing single-provider adapters remain compatible.

## Verification

- TypeScript: passed.
- Vitest: 16 files, 145 tests passed.
- Package ESM/CJS/declaration build: passed.
- Arxivite harness TypeScript: passed.
- Arxivite engine integration: 3 tests passed.
- `git diff --check`: passed.
- Arxivite readiness: not green because the external checkout already has
  unrelated dirty PDF/catalog/translator changes and an untracked `.pnpm-store`.
  Those changes were preserved.

## Next

Add characterization coverage for one read-only and one approval-required
Obsidian capability through an external harness. Then extract only the shared
descriptor/execution behavior needed by that slice. Full catalog, structured
evidence, retry/audit parity, and live product-host acceptance remain later
work.

## Memory Bank Closeout — 2026-09-06 20:27:32 IST

- Updated the existing `INFRA-1`, `T22`, and `T25` records; no new task or implementation document was needed.
- Recorded the provider-seam edit chunk and refreshed the task registry, active context, session cache, and edit history.
- The current source and Memory Bank changes remain on `fix/arxivite-package-build` for commit and push.
