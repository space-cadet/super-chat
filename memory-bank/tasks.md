# Memory Bank — super-chat

**Start here:** [Super Chat Master Delivery Plan](master-plan.md) — ordered delivery,
full feature checklist, existing task owners, evidence, and next work.

*Created: 2026-05-19 11:15:00 IST*
*Last Updated: 2026-11-18 14:25:11 IST*

## Overview

A complete, embeddable chat application and reusable runtime. `super-chat`
owns chat mechanics and UI. Obsidian, fixture and standalone hosts provide
data and platform capabilities. Arxivite host adoption is retired.

## Final Merge Reconciliation — 2026-09-07

The preserved shared implementation is committed as `b46731a` and `f9822cc`,
with documentation/interface reconciliation in `6054c69`, CI alignment in
`81226f8`, and inbound-context review fixes in `1eee16a`. The branch was merged
into `main` as `a4ded8d`. TypeScript, 18 Vitest files / 156 tests, package and
demo builds, `git diff --check`, and GitHub Build & Test passed. No task is
closed by this session; T22/INFRA-1/T19/T25 remain open for their broader
acceptance criteria, and Arxivite adoption remains a separate consumer step.

## Completed Tasks

| ID | Title | Status | Priority | Started | Completed | Details |
|----|-------|--------|----------|---------|-----------|---------|
| T1 | Project Bootstrap & Memory Bank Init | ✅ | HIGH | 2026-05-19 | 2026-05-19 | [Details](tasks/T1.md) |
| T2 | Core Types & StreamEvent Union | ✅ | HIGH | 2026-05-19 | 2026-05-19 | [Details](tasks/T2.md) |
| T3 | AgentLoop — Manual Tool Calling Loop | ✅ | HIGH | 2026-05-19 | 2026-05-19 | [Details](tasks/T3.md) |
| T4 | ToolExecutor & Approval Framework | ✅ | HIGH | 2026-05-19 | 2026-05-19 | [Details](tasks/T4.md) |
| T5 | Adapter Interfaces (LLM, Tool, RAG, Persistence) | ✅ | HIGH | 2026-05-19 | 2026-05-19 | [Details](tasks/T5.md) |
| T9 | ChatEngine Core | ✅ | HIGH | 2026-05-19 | 2026-05-19 | [Details](tasks/T9.md) |
| T11 | Build System & npm Publish | ✅ | HIGH | 2026-05-19 | 2026-05-19 | [Details](tasks/T11.md) |
| T12 | React Hooks (useChat, useAgent) | ✅ | HIGH | 2026-05-19 | 2026-05-19 | [Details](tasks/T12.md) |
| T20 | Fix ChatEngine Real-Time Streaming | ✅ | CRITICAL | 2026-06-20 | 2026-06-20 | [Details](tasks/T20.md) |
| T14 | Port chimera-chat React UI into super-chat | ✅ | HIGH | 2026-06-20 | 2026-06-20 | [Details](tasks/T14.md) |
| T10 | Demo App & Real-World Tests | ✅ | HIGH | 2026-06-20 | 2026-06-20 | [Details](tasks/T10.md) |
| T17 | Retired Arxivite Intermediate-Path Default | ✅ | HIGH | 2026-06-20 | 2026-08-31 | [Details](tasks/T17.md) |

## Pending Tasks

| ID | Title | Status | Priority | Dependencies | Details |
|----|-------|--------|----------|--------------|---------|
| INFRA-1 | Unified super-chat Application Platform Program | 🔄 | CRITICAL | T14, T20 | [Details](tasks/INFRA-1.md) |
| T21 | npm Release & GitHub CI/CD | 🔄 | HIGH | — | [Details](tasks/T21.md) |
| T22 | super-chat Core Host Platform Workstream | 🔄 | CRITICAL | INFRA-1, T14, T20 | [Details](tasks/T22.md) |
| T13 | Tool Result Formatting (Superseded) | ❌ | MEDIUM | T25, T16 | [Details](tasks/T13.md) |
| T6 | Multi-Agent Orchestrator — Many-Body Agent System | 🔄 **PHASE A COMPLETE** | **HIGH** | T3, T5 | [Details](tasks/T6.md) |
| T7 | Mention Parser & Routing | ⬜ | MEDIUM | T6 | [Details](tasks/T7.md) |
| T8 | React UI Components (PendingToolCard, ToolResultCard) | 🔄 | MEDIUM | T4 | [Details](tasks/T8.md) |
| T15 | Extract obsidian-ai Agentic Capabilities | 🔄 | HIGH | T22 | [Details](tasks/T15.md) |
| T16 | Shared Agentic RAG and Evidence Runtime | 🔄 | CRITICAL | T15, T22 | [Details](tasks/T16.md) |
| T18 | Migrate obsidian-ai to Obsidian Host | ⬜ | HIGH | T15, T21, T22 | [Details](tasks/T18.md) |
| T19 | Retired Arxivite super-chat Host Harness | ❌ | HIGH | T16, T21, T22 | [Details](tasks/T19.md) |
| T25 | Shared Agentic Tool Runtime and Built-in Provider | 🔄 | CRITICAL | T15, T22 | [Details](tasks/T25.md) |
| T26 | Three-Tier Memory and AI Pruning | 🔄 | HIGH | T15, T22 | [Details](tasks/T26.md) |
| T27 | PDF, Image, and Markdown Attachments | 🔄 | HIGH | T15, T22 | [Details](tasks/T27.md) |
| T28 | Provider Profiles and Fast Model Switching | 🔄 | HIGH | T15, T21, T22 | [Details](tasks/T28.md) |
| T29 | Shared Diagnostics | ⬜ | HIGH | T15, T22 | [Details](tasks/T29.md) |
| T30 | Session Export and Import | 🔄 | HIGH | T21, T22 | [Details](tasks/T30.md) |
| T31 | Standalone Desktop App and Host | 🔄 | HIGH | INFRA-1, T22, T21 | [Details](tasks/T31.md) |
| T32 | Standalone Android App and Host | 🔄 | HIGH | INFRA-1, T22, T21 | [Details](tasks/T32.md) |

## Status Summary

- **Completed**: 12 full task records (including T17 retired/superseded)
- **In Progress**: 14 (T6 later phases; INFRA-1 program; T8 React UI; T15 extraction; T16 agentic RAG; T21 publishing; T22 core platform; T25 tools; T26 memory; T27 attachments; T28 provider profiles; T30 archive exchange; T31 desktop host; T32 Android host)
- **Pending**: 3 (T7, T18, T29)
- **Superseded**: 2 (T13; T19 Arxivite host migration)
- **Total**: 31 task records including INFRA-1

## Current Phase

**Phase 1 — Initial Core and UI** is complete, but the current UI and engine do
not yet form the complete host-driven application.

**Phase 2 — Publishing Infrastructure** remains in progress under T21.

**Current Program**: INFRA-1 Unified super-chat Application Platform.

**Current Workstream**: the master plan starts with usable mobile chat under
T22/T8/T28/T32, then durable conversation behavior and the remaining reference
features. T15 maintains the source-to-feature comparison. Existing T25–T30 tasks
retain their feature ownership; no duplicate task tree is created.

T22 also owns the canonical public interface-component catalog. T19 is
retained as the historical record of the Arxivite host experiment and no
longer tracks an active product migration. Arxivite T102/T102a now own its
native chatbot parity work in the Arxivite repository.

T31 and T32 own the standalone desktop and Android host features respectively.
Their current shell/build baseline is implemented; host-contract integration,
durability, release signing, and broader platform acceptance remain tracked in
the platform tasks and INFRA-1 phases.
