# Contributing to kei-lisp

Thank you for your interest in contributing! This document explains how to set
up the project locally and the conventions we follow.

## Development environment

### Prerequisites

- **Node.js** 24 or later (see [`.node-version`](./.node-version))
- **[pnpm](https://pnpm.io/)** (the project uses a pnpm lockfile)
- **[nodenv](https://github.com/nodenv/nodenv)** (recommended for Node.js
  version management)

### Setup

```sh
git clone https://github.com/ike-keichan/kei-lisp.git
cd kei-lisp
pnpm install
```

### Verify your setup

```sh
pnpm check   # Runs format, lint, and spell checks
pnpm test    # Runs the test suite
pnpm build   # Builds for distribution
pnpm dev     # Builds and starts the REPL
```

## Project layout

```
src/
├── <ClassName>/
│   ├── index.ts        # Implementation
│   └── index.test.ts   # Co-located unit tests
├── cli.ts              # CLI entry point
└── index.ts            # Library entry point (named exports)
configs/eslint/         # Per-plugin ESLint configurations
docs/                   # User-facing language reference
examples/               # Runnable usage examples (tsx)
```

## Scripts

| Command           | Description                                |
| ----------------- | ------------------------------------------ |
| `pnpm build`      | Build for distribution (CJS + ESM + types) |
| `pnpm dev`        | Build and start the REPL                   |
| `pnpm start`      | Run the built CLI                          |
| `pnpm test`       | Run the test suite                         |
| `pnpm test:watch` | Run tests in watch mode                    |
| `pnpm check`      | Run all checks (format / lint / spell)     |
| `pnpm fix`        | Auto-fix format and lint issues            |
| `pnpm clean`      | Remove build artifacts                     |
| `pnpm wipe`       | Remove build artifacts and `node_modules`  |

## Coding conventions

- **TypeScript**: strict mode + `@typescript-eslint/strictTypeChecked`
- **Formatting**: Prettier (run `pnpm fix:format`)
- **Linting**: ESLint flat config with sonarjs / unicorn / security plugins
- **Spell check**: cspell (see [`cspell.json`](./cspell.json))

Before opening a pull request, please run:

```sh
pnpm check && pnpm test && pnpm build
```

## Testing

Tests are co-located with source files as `src/<ClassName>/index.test.ts` and
run with [vitest](https://vitest.dev/).

Conventions:

- One `describe` block per class (level 1) and per method (level 2)
- `it` descriptions start with a present-tense verb
  (e.g. `"returns 0"`, `"throws TypeError"`, `"is an instance of Error"`)
- One assertion per `it` when feasible
- Add a regression test when fixing a bug

## Pull request guidelines

1. **Branch from `master`** and use a descriptive branch name
   (e.g. `feature/add-quasiquote`, `fix/setq-shadowing`).
2. **Keep changes focused** — one logical change per PR.
3. **Update tests** to cover new behavior or regressions.
4. **Update documentation** (`README.md`, `CHANGELOG.md`, `docs/`) when
   public behavior changes.
5. **Pass all checks** (`pnpm check && pnpm test && pnpm build`).
6. **Commit messages** should follow the existing style:
   `<type>: <description>` (e.g. `fix:`, `feat:`, `docs:`, `test:`,
   `refactor:`).

## Reporting issues

When filing a bug report, please include:

- kei-lisp version
- Node.js version
- A minimal Lisp snippet that reproduces the issue
- Expected vs. actual behavior

## License

By contributing, you agree that your contributions will be licensed under the
[MIT License](./LICENSE).
