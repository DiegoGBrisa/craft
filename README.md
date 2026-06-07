# dgb

CLI for Diego G Brisa packages.

```sh
npx dgb help
```

## ts-match skill

```sh
dgb ts-match skill install
dgb ts-match skill update
dgb ts-match skill status
```

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
npm install
npm test
npm pack --dry-run
```
