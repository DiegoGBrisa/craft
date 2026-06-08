# Agent guide

## Library overview

`craft` is a TypeScript CLI for installing version-matched agent skills from
npm packages into repositories. It is published as `@diegogbrisa/craft`, exposes
the `craft` binary, is ESM-only, targets Node 20+, and currently supports the
`ts-match` skill flow:

```sh
craft ts-match skill install
craft ts-match skill update
craft ts-match skill status
```

Craft writes installed skills to `.agents/skills` in the target repository.

## Package commands

Use `pnpm` for this repository. Prefer the narrowest command that validates your
change before running the full release preflight.

- `pnpm build` - clean and compile `src` to `dist`.
- `pnpm typecheck` - run TypeScript checks for source, tests, and scripts.
- `pnpm test` - typecheck, build, and run the Vitest suite.
- `pnpm pack:check` - build and inspect the publish tarball contents.
- `pnpm release:preflight` - run tests, package validation, and production audit.
- `pnpm release:verify-tag -- vX.Y.Z` - verify a release tag matches `package.json`.
- `pnpm release:verify-unpublished` - verify the current package version is not on npm.

## Release commits

This repo uses release-please. The next version is determined from Conventional
Commit messages on `main`. Before committing changes that should or should not
bump the package version, read `docs/agents/release-commits.md`.

Use these commit types deliberately:

- `feat: ...` for user-visible additions. This creates a minor release.
- `fix: ...` for user-visible bug fixes. This creates a patch release.
- `type(scope)!: ...` or a `BREAKING CHANGE:` footer for breaking changes. This
  creates a major release.
- `docs:`, `test:`, `chore:`, `ci:`, `build:`, and `refactor:` for non-release
  work unless the commit includes a breaking change.

Do not manually edit `package.json` version, `.release-please-manifest.json`, or
`CHANGELOG.md` for normal releases. Release-please owns those files through its
release PR. Manual edits are only for explicit release recovery or when the user
asks for a manual bump.

## Validation expectations

For source changes, run `pnpm test`. For changes that affect packaging,
publishing, release scripts, or package metadata, run `pnpm release:preflight`
and the relevant release guards.
