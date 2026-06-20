# Edit Chunk — 2026-06-20 (Afternoon)

## Session: T21 — npm Release & GitHub CI/CD

### T21: npm Release & GitHub CI/CD
**Scope**: Repository publishing infrastructure
**What**: Created LICENSE, GitHub Actions workflow, comprehensive README, npm config
**Files Created**:
- `LICENSE` — MIT License, Copyright 2026 Deepak Vaid
- `.github/workflows/build-release.yml` — Three jobs: build-and-test, release, publish-npm
- `memory-bank/tasks/T21.md` — Task specification
- `memory-bank/implementation-details/npm-ci-cd.md` — Implementation docs

**Files Modified**:
- `README.md` — Complete rewrite: features, quick starts, architecture, adapters, examples
- `package.json` — `prepublishOnly: "npx tsup"`, keywords, author, repository
- `memory-bank/tasks.md` — Added T21, updated status counts
- `memory-bank/activeContext.md` — Updated current state

**CI/CD Workflow**:
- Build & Test job: Runs on every push/PR — typecheck, test, build, upload artifacts
- Release job: Runs on tag `v*` — Creates GitHub Release with dist/, README, LICENSE
- Publish job: Runs on tag `v*` — Publishes to npm via `NPM_TOKEN` secret

**npm Status**:
- Dry-run passed ✅ (package name available, 20 files, 1.6MB tarball)
- `prepublishOnly` script uses `npx tsup` (works in CI without pnpm)
- Ready to publish after `NPM_TOKEN` secret configured

**Still Needed**:
- Configure `NPM_TOKEN` in GitHub repo settings
- Push a version tag to test end-to-end

## How to Publish
```bash
npm version minor  # bump version, create tag
git push origin main --tags  # triggers CI
```

## Decision Log
- Used `npx tsup` in `prepublishOnly` instead of `pnpm build` because CI may not have pnpm in PATH during publish step
- Included only `dist/`, `README.md`, `LICENSE` in published files (source excluded)
- Three parallel jobs after build-and-test: release + publish-npm
- Version strategy: 0.1.0 → 0.2.0 for first real release (T14/T20 are significant)
