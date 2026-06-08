# craft

Install version-matched agent skills from packages into repositories.

```sh
pnpm dlx @diegogbrisa/craft help
```

## ts-match skill

```sh
craft ts-match skill install
craft ts-match skill update
craft ts-match skill status
```

The package is currently published-ready as `@diegogbrisa/craft` while the
unscoped `craft` npm name is unavailable. The installed binary is still `craft`.

The `ts-match` skill commands read the installed `@diegogbrisa/ts-match`
package in the current repository and install the bundled `SKILL.md` for that
exact package version into:

```txt
.agents/skills/ts-match/SKILL.md
.agents/skills/ts-match/metadata.json
```

Use `--force` with `install` or `update` to overwrite a locally edited skill.

## Development

```sh
pnpm install
pnpm test
pnpm pack:check
```
