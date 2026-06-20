# Session: 2026-06-20 Afternoon Session

## GitHub Actions CI Fix

**Problem**: `pnpm-workspace.yaml` had invalid content causing `ERROR: packages field missing or empty`.

**Root cause**: pnpm v11+ auto-recreates `pnpm-workspace.yaml` for single-package repos with invalid content.

**Fixes applied**:
1. Deleted `pnpm-workspace.yaml`
2. Added to `.gitignore`
3. Removed `demo/**/*` from `tsconfig.json` (TS6059 outside rootDir)
4. Fixed unused `USER_ID` import in `Orchestrator.test.ts`
5. Added `.npmrc` with `auto-install-peers=true`
6. Added `pnpm.onlyBuiltDependencies: ["esbuild"]` to `package.json`

**Result**: Build & Test passes (run ID 27867800049, 27s).

## Full-Featured Demo Implementation

**Motivation**: Basic demo only showed API key input form. User requested full tool-calling showcase.

**Features added**:
- **Provider selector**: DeepSeek, Kimi, OpenRouter, Gemini (with obsidian-ai's proven pattern)
- **Mock mode**: No API key needed, simulates LLM with deterministic tool calls
- **Connection test**: Tests API key before starting chat
- **Demo scenarios**: 🧮 Calculate, 🌤️ Weather, 📚 arXiv, 🔍 Web Search buttons
- **Visual tool flow**: Full pending → approve → result cycle
- **API keys**: Loaded from secure MacBook storage (~/.openclaw/workspace/.keys/API_Keys.md)

**Reference research**: Examined obsidian-ai's `settings.ts` and `api.ts` for:
- `ProviderType` union and `ProviderProfile` interface
- `getDefaultModel()`, `getDefaultEndpoint()`, `getProviderColor()` helpers
- `createLanguageModel()` factory with per-provider SDK initialization
- `fetchProviderModels()` per-provider model fetching

**Files modified**:
- `demo/.env.local` — API keys for 4 providers
- `demo/vite.config.ts` — Vite `define` block to inject env vars
- `demo/main.tsx` — Full demo with MockLLMAdapter, provider selector, demo scenarios

**Key technical fix**: Vite aliases changed from `../dist` to `../src` to avoid React Refresh HMR injection into pre-built bundles (root cause of blank page).

## API Keys Configured

| Provider | Key | Status |
|----------|-----|--------|
| DeepSeek | `sk-d8a2...27d5` | ✅ Active |
| Kimi | `sk-TDNz...Mfw` | ✅ Active |
| OpenRouter | `sk-or-v1...881a` | ✅ Active |
| Gemini | `AIzaSy...Rinw` | ✅ Active |

**Source**: Original `API_Keys` file from `typora-notes` (shared via Telegram on June 15, 2026).

## Open Items

- T21: Configure `NPM_TOKEN` in GitHub, push version tag
- T6 Phase B: Independent agent lifecycles
- T17: Make super-chat default in arxivite
- T15: Port obsidian-ai mature agent logic
