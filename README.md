# craft

Craft installs version-matched agent skills from npm packages into repositories.

It was created because some libraries need more than API docs for coding agents
to use them well. A package can ship a `SKILL.md` that teaches an agent the
library's public API, naming conventions, examples, and sharp edges. Craft copies
that skill into the current repository so local coding agents can use it as part
of their normal project context.

For now, Craft supports the `ts-match` skill and writes to `.agents/skills`.
The goal is to keep the mechanism small and package-oriented:

- the installed library version decides which skill is installed;
- the skill comes from the package already installed in the repository;
- local edits are protected unless `--force` is passed;
- the installed skill records metadata for future updates.

Craft is not a general skill registry. It is a small bridge between a package
installed in a repository and the agent skill that belongs to that package.

## Install

Craft is published-ready as `@diegogbrisa/craft` while the unscoped `craft` npm
name is unavailable. The installed binary is still `craft`.

Run it without installing globally:

```sh
pnpm dlx @diegogbrisa/craft help
```

Install it globally:

```sh
pnpm add -g @diegogbrisa/craft
```

With npm:

```sh
npm install -g @diegogbrisa/craft
```

## Usage

Install the `ts-match` skill into the current repository:

```sh
craft ts-match skill install
```

Update the installed `ts-match` skill after updating `@diegogbrisa/ts-match`:

```sh
craft ts-match skill update
```

Check what is installed:

```sh
craft ts-match skill status
```

Overwrite a locally edited skill when you intentionally want to replace it:

```sh
craft ts-match skill install --force
craft ts-match skill update --force
```

## What Gets Written

Craft reads the installed `@diegogbrisa/ts-match` package in the current
repository and copies its bundled `SKILL.md` into:

```txt
.agents/skills/ts-match/SKILL.md
.agents/skills/ts-match/metadata.json
```

The metadata file records the package name, package version, source, install
time, and skill hash. Craft uses that hash to avoid overwriting local edits by
accident.

## Version Matching

Craft does not fetch an arbitrary latest skill. It uses the package version
already installed in the repository.

If the repository has:

```txt
@diegogbrisa/ts-match@1.4.0
```

then Craft installs the `SKILL.md` bundled with `@diegogbrisa/ts-match@1.4.0`.
When the package is updated, run:

```sh
craft ts-match skill update
```

to sync the local skill to the new installed package version.

If `@diegogbrisa/ts-match` is not installed, Craft exits with a clear error
instead of guessing a version.

## Upgrade Craft

If Craft is installed globally, update it with:

```sh
craft upgrade
```

Preview the command without running it:

```sh
craft upgrade --dry-run
```

Force a package manager when needed:

```sh
craft upgrade --pnpm
craft upgrade --npm
```

`craft upgrade` detects the package manager when it can. Otherwise it prefers
`pnpm` if available and falls back to `npm`.

## Development

```sh
pnpm install
pnpm test
pnpm pack:check
```

The CLI is written in TypeScript under `src/` and compiled to `dist/`. Tests are
written with Vitest and run against the compiled `dist/cli.js` so the published
binary path is covered.

`pnpm pack:check` builds the package and verifies that the publish tarball only
contains the intended runtime files:

```txt
dist/cli.js
LICENSE
package.json
README.md
```

## Publishing

The package publishes from GitHub Actions when a GitHub release is published.
Configure npm trusted publishing for:

```txt
Package: @diegogbrisa/craft
Repository: DiegoGBrisa/craft
Workflow filename: publish.yml
Allowed action: npm publish
```

The publish workflow uses npm's GitHub Actions OIDC trusted publishing path, so
it does not require an `NPM_TOKEN` secret.

The GitHub release tag must match the package version:

```txt
package.json version 0.1.0 -> release tag v0.1.0
```

You can configure trusted publishing from npm's website. If using the npm CLI,
use a version that includes the `trust` command; npm 11.9.0 does not.

```sh
npx npm@latest trust github @diegogbrisa/craft --repo DiegoGBrisa/craft --file publish.yml --allow-publish
```
