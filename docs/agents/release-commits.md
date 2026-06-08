# Release Commit Convention

Craft uses release-please to bump versions automatically. Release-please reads
Conventional Commit messages on `main`, opens a release PR, and updates:

```txt
package.json
pnpm-lock.yaml
CHANGELOG.md
.release-please-manifest.json
```

Merging that release PR creates the `vX.Y.Z` tag and publishes through
`.github/workflows/release-please.yml`.

## Commit Types That Bump Versions

Use `feat:` when the change adds user-visible CLI behavior or package
capability. This creates a minor release.

Examples:

```txt
feat: add craft upgrade
feat: support installing the ts-match skill
feat(ts-match): add skill status command
```

Use `fix:` when the change fixes broken user-visible behavior. This creates a
patch release.

Examples:

```txt
fix: preserve local skill edits during update
fix: allow upgrade dry-run without pnpm on PATH
fix(ts-match): report missing package with a clear error
```

Use a breaking-change marker when users must change how they invoke or consume
the CLI. This creates a major release.

Examples:

```txt
feat!: rename skill install command
```

```txt
feat: change skill metadata format

BREAKING CHANGE: existing metadata files must be regenerated.
```

## Commit Types That Do Not Bump Versions

Use non-release commit types for work that should not produce a new npm version:

```txt
docs: update release instructions
test: cover upgrade package manager detection
chore: add release-please versioning
ci: update release workflow validation
build: adjust TypeScript config
refactor: simplify command parser
```

Only use `refactor:` when behavior is intentionally unchanged. If a refactor
fixes a user-facing bug, use `fix:`. If it adds capability, use `feat:`.

## Agent Decision Guide

Before committing, classify the user-visible outcome:

- New CLI command, new flag, new supported package, or new install capability:
  use `feat:`.
- Existing command now works where it previously failed: use `fix:`.
- Documentation, tests, CI, release tooling, or internal cleanup with unchanged
  behavior: use a non-release type.
- Public behavior becomes incompatible: use a breaking-change marker.

Do not hide release-worthy changes inside `chore:` or `refactor:` commits. If a
single task includes both release-worthy source changes and supporting docs or
tests, the commit message should use the release-worthy type.

## Manual Release Recovery

For normal releases, do not edit release files manually. If the user explicitly
requests manual recovery:

1. Count unreleased `feat:` and `fix:` commits since the last published version
   or release tag.
2. Apply semver: breaking change > feature > fix.
3. Update `package.json`, `.release-please-manifest.json`, and `CHANGELOG.md`.
4. Run `pnpm release:verify-tag -- vX.Y.Z`.
5. Run `pnpm release:verify-unpublished`.
6. Run `pnpm release:preflight`.
