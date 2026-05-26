# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Common Lisp-compatible numeric predicates: `evenp` / `oddp` / `zerop`
  / `plusp` / `minusp`. All return `t` / `nil`; non-numbers and (for
  `evenp` / `oddp`) non-integers return `nil` rather than throwing,
  matching the existing `integerp` / `numberp` style.
- Common Lisp-compatible arithmetic functions:
  - `expt` — `(expt B E)` raises B to the exponent E
  - `truncate` / `floor` / `ceiling` — integer rounding (toward zero /
    negative infinity / positive infinity respectively)
  - `min` / `max` — variadic, returns the smallest / largest argument

  Note: `1+` / `1-` are not yet supported. They require parser extension
  to tokenize `1+` / `1-` as symbols rather than as a number followed by
  an operator.

### Documentation

- Annotated kei-lisp-specific or non-CL-standard built-ins in
  `docs/built-in-functions.md` with a **(kei-lisp specific)** note so
  users can spot differences from Common Lisp at a glance. Covered
  entries: `=`, `==`, `~=`, `~~`, `//`, `floatp` (range-check semantics),
  `doublep`, `bind`, `exit`, `gc`, `set-allq`. Added a legend explaining
  the convention at the top of the reference.

### Added (callback-based list operations)

- Higher-order list functions that take a function as the first argument:
  - `reduce` — left-fold with optional initial value (`(reduce fn list)`
    or `(reduce fn list init)`)
  - `every` — t if predicate is non-nil for all elements (vacuous truth
    for empty list)
  - `some` — first non-nil result, or nil
  - `find` — first element equal (`eq`) to item, or nil
  - `mapcan` — map + concatenate the returned lists (non-cons / nil
    results contribute nothing)
  - `sort` — non-destructive sort using a 2-arg predicate

  All accept the positional argument form only; CL's keyword arguments
  (`:test` / `:key` / `:from-end` / `:initial-value` etc.) are not
  supported. See `docs/built-in-functions.md` for per-function
  deviations.

### Added (string + sequence)

- String functions: `string-upcase` / `string-downcase` / `string-trim` /
  `substring` / `concatenate`. `string-trim` and `concatenate` deviate
  slightly from CL semantics (trim takes no character bag; concatenate
  takes no type designator); see `docs/built-in-functions.md` for
  details.
- Sequence functions that work on both lists and strings: `elt` /
  `subseq` / `count`. `subseq` returns a list when given a list and a
  string when given a string.
- **`length` now also accepts strings** (returns code point count) in
  addition to lists. Previously a list-only Lisp lambda; now an Applier
  built-in.
- `format` / `eval` are now also registered in the root environment, so
  they can be referenced as values (`(setq f format)` no longer errors).
  Previously only callable in operator position.

## [2.1.0] - 2026-05-26

### Added

- Split `LispInterpreter` into a programmatic interpreter and a separate
  `Repl` class. `Repl` wraps `LispInterpreter` and owns the readline I/O.
- New error types under `src/errors/`:
  - `KeiLispError` — base class for parse / eval failures
  - `ParseError` — thrown by the parser on malformed input
  - `EvalError` — thrown by the evaluator / applier on Lisp-level failures
- Regrouped `src/` directories: `src/interpreter/` (LispInterpreter, Repl)
  and `src/errors/` (KeiLispError family + relocated ExitError).
- `.github/PULL_REQUEST_TEMPLATE.md` for consistent PR descriptions.
- `CONTRIBUTING.md` documents the release-line branch workflow and branch
  creation responsibilities (maintainer-only for version branches).
- Documented the `Cons.isNot*` negation predicates (`isNotCons` /
  `isNotList` / `isNotNil` / `isNotSymbol`) in `docs/api.md`.

### Changed

- **`(gc)` now returns an association list of post-GC memory statistics**
  in bytes: `((heap-used . N) (heap-total . N) (rss . N))`. Use `assoc`
  to extract a specific entry: `(cdr (assoc 'heap-used (gc)))`. Previously
  returned `t`.
- **`LispInterpreter.parse` return type narrowed from `LispValue` to
  `Cons`**. Library users no longer need an `as Cons` cast (the result is
  always a `Cons`, possibly `Cons.nil`, because the source is wrapped in
  an outer list before parsing).
- **Bundler migrated from `tsup` to `tsdown`** (Rolldown-based). `tsup`
  is no longer actively maintained and its README directs new projects to
  `tsdown`. Output layout (`dist/index.js` / `dist/index.cjs` /
  `dist/index.d.ts` / `dist/index.d.cts` / `dist/cli.cjs`) is preserved
  via `fixedExtension: false`, so the `package.json` `exports` field and
  consumers are unaffected.

### Changed (Breaking)

- **Removed `LispInterpreter.run()`** — REPL is now started via
  `new Repl().run()` (import `Repl` from `kei-lisp`).
- **`LispInterpreter.parse` / `eval` / `evalString` / `evalAll` now throw
  on failure** instead of returning `Cons.nil` and writing to stderr.
  Library users should catch `KeiLispError` (or its subclasses
  `ParseError` / `EvalError`); `ExitError` remains a sibling so a
  catch-all `KeiLispError` handler does not swallow `(exit)` requests.
- `Repl.run` catches `KeiLispError` and prints `*** <Name>: <message> ***`
  to preserve the previous interactive behavior; any non-Lisp error
  propagates.
- `ExitError` moved from `src/runtime/ExitError/` to `src/errors/ExitError/`.
  The package-level import (`import { ExitError } from 'kei-lisp'`) is
  unaffected.

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
