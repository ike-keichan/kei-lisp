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
pnpm start   # Runs the built CLI (REPL)
```

## Project layout

```
src/
├── parser/                  # Source → AST
│   ├── Parser/index.ts (+ index.test.ts)
│   ├── IntStream/
│   └── NextState/
├── runtime/                 # Evaluation engine (eval/apply, env, I/O, exit)
│   ├── Evaluator/
│   ├── Applier/
│   ├── Table/               # Environment frame
│   ├── StreamManager/       # I/O stream management
│   └── ExitError/           # (exit) signal
├── value/                   # Lisp value types
│   ├── Cons/
│   ├── InterpretedSymbol/
│   └── Loop/                # Cons iterator
├── interpreter/             # Public facades (library + REPL)
│   ├── LispInterpreter/     # Programmatic interpreter (parse / eval / env)
│   └── Repl/                # Interactive REPL on stdin / stdout
├── constants/               # Diagnostic message templates
├── types/                   # Shared TypeScript types (LispValue, ...)
├── cli.ts                   # CLI entry point
└── index.ts                 # Library entry point (named exports)

configs/eslint/              # Per-plugin ESLint configurations
configs/cspell/              # cspell project dictionaries
docs/                        # User-facing language reference
examples/                    # Runnable usage examples (tsx)
```

Code modules live as `<DirName>/index.ts`. Grouping directories
(`parser/`, `runtime/`, `value/`, `interpreter/`) do not have their own
`index.ts`. PascalCase directories are single classes; lowercase
directories group multiple related classes.

## Scripts

| Command           | Description                                |
| ----------------- | ------------------------------------------ |
| `pnpm build`      | Build for distribution (CJS + ESM + types) |
| `pnpm start`      | Run the built CLI                          |
| `pnpm test`       | Run the test suite                         |
| `pnpm test:watch` | Run tests in watch mode                    |
| `pnpm doc`        | Generate API documentation with TypeDoc    |
| `pnpm check`      | Run all checks (format / lint / spell)     |
| `pnpm fix`        | Auto-fix format and lint issues            |

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

## Branch strategy

kei-lisp bundles several features into one minor release using
**release-line branches** (`v2.1`, `v2.2`, ...), then merges them into
`main` at release time.

```
feature/* ──┐
feature/* ──┤── vX.Y (release line) ──→ main ──→ tag vX.Y.0 ──→ npm
feature/* ──┘
                                        hotfix/* ──→ main (direct, urgent only)
```

| Branch                | Purpose                                             | Lifetime                        |
| --------------------- | --------------------------------------------------- | ------------------------------- |
| `main`                | Latest released state. Always tag-ready             | Permanent                       |
| `vX.Y` (release line) | Integrates multiple features for the next minor     | Until release; merged & deleted |
| `feature/*`           | A single logical change targeting the active `vX.Y` | Until merged                    |
| `hotfix/*`            | Urgent fix targeting `main` directly                | Until merged                    |
| `vX` (maintenance)    | Security/critical fixes for an older major          | Permanent (long-lived)          |

### Branch creation responsibilities

| Branch type           | Created by          | When                                                              |
| --------------------- | ------------------- | ----------------------------------------------------------------- |
| `vX.Y` (release line) | **Maintainer only** | When planning a minor release that bundles 2+ features            |
| `vX` (maintenance)    | **Maintainer only** | Right after the next major (`v(X+1).0.0`) is tagged               |
| `hotfix/*`            | **Maintainer only** | When a critical bug needs a patch to a released version           |
| `feature/*`           | Anyone              | Anytime, branching from the **active release line** (e.g. `v2.1`) |

If you are unsure which base branch to target, ask in the PR description
or open a draft PR and the maintainer will guide you.

## Pull request guidelines

1. **Branch from the active release line** (e.g. `v2.1`) and use a
   descriptive branch name (e.g. `feature/add-quasiquote`,
   `fix/setq-shadowing`).
2. **Keep changes focused** — one logical change per PR.
3. **Update tests** to cover new behavior or regressions.
4. **Update documentation** (`README.md`, `CHANGELOG.md`, `docs/`) when
   public behavior changes.
5. **Pass all checks** (`pnpm check && pnpm test && pnpm build`).
6. **Commit messages** should follow the existing style:
   `<type>: <description>` (e.g. `fix:`, `feat:`, `docs:`, `test:`,
   `refactor:`, `chore:`).
7. **Fill in the PR template** (auto-loaded from
   [`.github/PULL_REQUEST_TEMPLATE.md`](./.github/PULL_REQUEST_TEMPLATE.md)).

## Release process

Releases are published to npm automatically when a `v*` tag is pushed.

### Maintainer steps

1. On the release-line branch (e.g. `v2.1`), update `CHANGELOG.md` —
   move pending entries under a new
   `## [<new-version>] - <YYYY-MM-DD>` header.
2. Bump `version` in `package.json` to match.
3. Open a PR from the release line to `main`, review, and merge.
4. On `main`, tag the merge commit and push:

   ```sh
   git tag v2.1.0
   git push origin v2.1.0
   ```

5. The [`Release` workflow](./.github/workflows/release.yml) runs:
   build → check → test → `pnpm publish --provenance --access public`
   → GitHub Release with auto-generated notes.

### Required GitHub secrets

| Secret      | Where to obtain                                  |
| ----------- | ------------------------------------------------ |
| `NPM_TOKEN` | npm → Account → Access Tokens → Granular (write) |

Set under **Repository → Settings → Secrets and variables → Actions**.

The release workflow uses OIDC (`id-token: write`) to attach
[npm provenance](https://docs.npmjs.com/generating-provenance-statements)
to published packages — no additional configuration required beyond the
permissions block already present in the workflow.

## Reporting issues

When filing a bug report, please include:

- kei-lisp version
- Node.js version
- A minimal Lisp snippet that reproduces the issue
- Expected vs. actual behavior

## License

By contributing, you agree that your contributions will be licensed under the
[MIT License](./LICENSE).
