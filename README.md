# Prodify

Prodify is a repository-local CLI for managing canonical agent guidance in `.prodify/` and generating compatibility files for supported coding agents.

## What It Does

- bootstraps a canonical `.prodify/` workspace with `prodify init`
- generates managed compatibility files for supported agents
- keeps generated files synchronized with canonical source files
- checks repository health and drift with `prodify doctor`

## Current Support

Implemented targets:
- Codex → `AGENTS.md`
- Claude → `CLAUDE.md`
- Copilot → `.github/copilot-instructions.md`
- OpenCode → `.opencode/AGENTS.md`

## CLI Commands

```sh
node ./src/index.js --help
```

Command surface:
- `prodify init`
- `prodify install --agent <target> [--force]`
- `prodify sync [--agent <target>] [--force]`
- `prodify doctor`

## Basic Flow

1. Initialize canonical files:

```sh
node ./src/index.js init
```

2. Install an agent target:

```sh
node ./src/index.js install --agent codex
```

3. Edit canonical files under `.prodify/`.

4. Regenerate managed targets:

```sh
node ./src/index.js sync
```

5. Validate repo health:

```sh
node ./src/index.js doctor
```

## Development

Run the test suite:

```sh
npm test
```

The implementation lives primarily in:
- `src/`
- `assets/presets/default/`
- `tests/`
- `docs/`

## License

This project is licensed under the Apache License 2.0. See [LICENSE](./LICENSE).
