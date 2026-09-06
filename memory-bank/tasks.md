# Memory Bank — super-chat

*Created: 2026-05-19 11:15:00 IST*
*Last Updated: 2026-09-06 20:27:32 IST*

## Overview

A complete, embeddable chat application and reusable runtime. `super-chat`
owns chat mechanics and UI; products such as `obsidian-ai` and `arxivite`
provide data and platform capabilities through neutral host contracts.

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
| T6 | Multi-Agent Orchestrator — Many-Body Agent System | ✅ **PHASE A** | **HIGH** | T3, T5 | [Details](tasks/T6.md) |
| T7 | Mention Parser & Routing | ⬜ | MEDIUM | T6 | [Details](tasks/T7.md) |
| T8 | React UI Components (PendingToolCard, ToolResultCard) | ⬜ | MEDIUM | T4 | [Details](tasks/T8.md) |
| T15 | Extract obsidian-ai Agentic Capabilities | 🔄 | HIGH | T22 | [Details](tasks/T15.md) |
| T16 | Shared Agentic RAG and Evidence Runtime | 🔄 | CRITICAL | T15, T22 | [Details](tasks/T16.md) |
| T18 | Migrate obsidian-ai to Obsidian Host | ⬜ | HIGH | T15, T21, T22 | [Details](tasks/T18.md) |
| T19 | Make Arxivite a super-chat Tool Host | ⬜ | HIGH | T16, T21, T22 | [Details](tasks/T19.md) |
| T25 | Shared Agentic Tool Runtime and Built-in Provider | ⬜ | CRITICAL | T15, T22 | [Details](tasks/T25.md) |
| T26 | Three-Tier Memory and AI Pruning | ⬜ | HIGH | T15, T22 | [Details](tasks/T26.md) |
| T27 | PDF, Image, and Markdown Attachments | ⬜ | HIGH | T15, T22 | [Details](tasks/T27.md) |
| T28 | Provider Profiles and Fast Model Switching | ⬜ | HIGH | T15, T21, T22 | [Details](tasks/T28.md) |
| T29 | Shared Diagnostics | ⬜ | HIGH | T15, T22 | [Details](tasks/T29.md) |
| T30 | Session Export and Import | ⬜ | HIGH | T21, T22 | [Details](tasks/T30.md) |

## Status Summary

- **Completed**: 12 full task records (including T17 retired/superseded)
- **In Progress**: 5 (INFRA-1 program; T15 extraction; T16 agentic RAG; T21 publishing; T22 core platform)
- **Pending**: 11 (T6 Phase B, T7, T8, T18, T19, T25, T26, T27, T28, T29, T30)
- **Superseded**: 1 (T13)
- **Total**: 29 task records including INFRA-1

## Current Phase

**Phase 1 — Initial Core and UI** is complete, but the current UI and engine do
not yet form the complete host-driven application.

**Phase 2 — Publishing Infrastructure** remains in progress under T21.

**Current Program**: INFRA-1 Unified super-chat Application Platform.

**Current Workstream**: T15/T25 extract the obsidian-ai agentic runtime and
tool-provider model; T16 turns that runtime into shared agentic RAG with
structured evidence. An external Arxivite test area exercises the real
chatbot tool registry through the current engine, but live provider, product
host, and UI acceptance remain open. Package compatibility must be settled
before product code is updated.
