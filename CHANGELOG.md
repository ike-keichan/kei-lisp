# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-05-22

### Changed

- **Migrated implementation from JavaScript to TypeScript** with strict mode
  and `@typescript-eslint/strictTypeChecked` ruleset
- Restructured source layout into layer-based grouping:
  - `src/parser/` (Parser / IntStream / NextState)
  - `src/runtime/` (Evaluator / Applier / Table / StreamManager / ExitError)
  - `src/value/` (Cons / InterpretedSymbol / Loop)
  - `src/LispInterpreter/` (facade) at root
- Migrated build tool from webpack to tsup (CJS + ESM dual output)
- Migrated package manager from npm + Makefile to pnpm
- Switched Node.js version management to nodenv (requires Node.js >= 24)
- Restructured as npm-publishable package (library + CLI)
- Migrated test framework to vitest with co-located test files
  (`<ClassName>/index.test.ts` per class)
- Switched ESLint to flat config (v10) with sonarjs / unicorn / security plugins
- Moved documentation files to `docs/` directory (atoms / cons /
  built-in-functions / api)
- Translated all source comments and test descriptions to English
- Routed all interpreter diagnostic output to `console.error` (stderr) while
  keeping value/print output on stdout
- Refactored CLI: version is now read from `package.json` via JSON import
  (`resolveJsonModule`); unknown arguments exit with code 1

### Added

- TypeScript type definitions (`.d.ts`)
- `src/index.ts` as library entry point with named exports
- `src/cli.ts` as CLI entry point
- **`LispInterpreter.evalString(source)`** — evaluate a source string and
  return the last expression's result (for programmatic library use)
- **`LispInterpreter.evalAll(source)`** — evaluate multiple expressions and
  return all results as an array
- **`ExitError`** class — thrown when Lisp code calls `(exit)`, allowing
  library consumers to catch and handle gracefully instead of `process.exit()`
- **`Table.toString()`** — returns `"#<Environment>"` (Common Lisp convention)
  instead of the inherited `"[object Map]"`
- **`LispValue`** type alias exported for TypeScript consumers
- Centralized diagnostic message templates in `src/constants/`
- Shared type definitions in `src/types/`
- Runnable usage examples in `examples/` (`basic-eval.ts`, `exit-handling.ts`)
- `CONTRIBUTING.md` with setup, layout, scripts, and PR conventions
- `docs/api.md` with full TypeScript / library API reference
- Comprehensive test suite (12 files, 370 tests) covering all public APIs
  and regression coverage for fixed bugs
- MIT License

### Fixed

- **`InterpretedSymbol.compareTo`** — `charCodeAt` was called without parens
  (returning the function reference and producing `NaN`); fixed to `charCodeAt(0)`
- **`Table.clone`** — `this.keys` was iterated without parens (TypeError on
  call); fixed to `this.keys()`
- **`Table.setIfExit`** — fixed Common Lisp `setq` shadowing violation where
  `(let ((x 1)) (let ((x 2)) (setq x 100)))` would corrupt the outer `x`.
  Now respects lexical scoping correctly.
- **`Applier.format_AUX`** — `~Na` / `~-Na` (width-specified) format directives
  crashed with TypeError due to `value.length()` (calling a property as a method).
  Now functions correctly: `(format "~5a" "hi")` outputs `"hi   "`.
- **Parser** — non-ASCII characters (emoji, Japanese, etc.) in string
  literals are now preserved correctly (changed from `charCodeAt` /
  high-surrogate-only handling to `codePointAt` / Unicode-aware)

### Removed

- **`ramda`** dependency — replaced with standard `Function.prototype.apply`
  and direct method dispatch
- **`expose-gc`** package dependency — replaced with
  `v8.setFlagsFromString('--expose_gc')` + `vm.runInNewContext('gc')`

## [1.0.0] - 2020-12-01

### Added

- Initial release
- Lisp interpreter running in Node.js CLI
