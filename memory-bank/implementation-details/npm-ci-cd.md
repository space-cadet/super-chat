# Implementation: GitHub CI/CD & npm Publishing

*Created: 2026-06-20 12:10:00 IST*

## Workflow Design

### Trigger Strategy

```
Every push/PR ──→ build-and-test job
                    ├── TypeScript typecheck
                    ├── Unit tests (vitest)
                    ├── Build package (tsup)
                    └── Upload artifacts

Tag push (v*) ──→ release job
                    ├── Download artifacts
                    └── Create GitHub Release

Tag push (v*) ──→ publish-npm job
                    ├── Build package
                    └── npm publish --access public
```

### Why This Design?

1. **Separate build from publish**: Build happens in `build-and-test`, artifacts uploaded, then `release` and `publish-npm` download them. This ensures the exact same build is released and published.

2. **Tag-based releases**: Using `npm version` creates a tag, which triggers the release. No manual GitHub release creation needed.

3. **Parallel jobs**: `release` and `publish-npm` run in parallel after `build-and-test` succeeds. Faster pipeline.

## Secrets Configuration

### Required Secrets

| Secret | Where | How to Get |
|--------|-------|-----------|
| `NPM_TOKEN` | GitHub repo → Settings → Secrets | `npm token create` or npm website → Access Tokens |
| `GITHUB_TOKEN` | Auto-provided | No action needed |

### Setting NPM_TOKEN

1. Go to https://www.npmjs.com/settings/tokens
2. Create "Granular Access Token" with:
   - Packages and Scopes: `super-chat`
   - Permissions: Publish
3. Copy token
4. Go to https://github.com/space-cadet/super-chat/settings/secrets/actions
5. Click "New repository secret"
6. Name: `NPM_TOKEN`
7. Value: paste token

## Package.json Publishing Configuration

```json
{
  "name": "super-chat",
  "version": "0.1.0",
  "files": ["dist", "README.md", "LICENSE"],
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js", "require": "./dist/index.cjs" },
    "./react": { "types": "./dist/react/index.d.ts", "import": "./dist/react/index.js", "require": "./dist/react/index.cjs" }
  },
  "prepublishOnly": "npx tsup"
}
```

### Key Points

- `files`: Only includes `dist/` (built), `README.md`, `LICENSE`. Source code not published.
- `exports`: Dual entry points — core and `/react` subpath.
- `prepublishOnly`: Runs `tsup` before publish. Uses `npx` not `pnpm` because CI may not have pnpm in PATH during publish.
- `.npmignore` not needed — `files` whitelist is sufficient.

## Versioning Strategy

| Version | Meaning | When to Use |
|---------|---------|------------|
| 0.1.0 | Initial release | Already published (if done) |
| 0.2.0 | Minor feature | After T14/T20 (streaming + React UI) |
| 0.2.1 | Patch fix | Bug fixes |
| 1.0.0 | Stable API | After T17/T18/T19 (integrations complete) |

## Dry-Run Results

```bash
$ npm publish --dry-run
npm notice package: super-chat@0.1.0
npm notice Tarball Contents: 20 files, 8.0 MB unpacked
npm notice package size: 1.6 MB
npm notice Publishing to https://registry.npmjs.org (dry-run)
+ super-chat@0.1.0
```

✅ Package name available
✅ Build succeeds
✅ Tarball contains correct files

## Troubleshooting

### "npm ERR! need auth"
- **Cause**: Not logged in locally
- **Fix**: `npm login` or use CI with `NPM_TOKEN`

### "ERR_PNPM_IGNORED_BUILDS"
- **Cause**: pnpm blocked esbuild scripts
- **Fix**: Use `npx tsup` instead of `pnpm build` in `prepublishOnly`

### "Repository URL normalized"
- **Cause**: npm auto-fixes `repository.url`
- **Fix**: Run `npm pkg fix` to update package.json

## Files
- `.github/workflows/build-release.yml` — CI/CD workflow
- `package.json` — Publishing config
- `LICENSE` — MIT license
