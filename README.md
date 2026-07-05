# kei-lisp

[![CI](https://github.com/ike-keichan/kei-lisp/actions/workflows/ci.yml/badge.svg)](https://github.com/ike-keichan/kei-lisp/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/kei-lisp.svg)](https://www.npmjs.com/package/kei-lisp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen.svg)](https://nodejs.org/)

A Lisp interpreter implemented in TypeScript. Use it from the command line as
an interactive REPL, or embed it in your application as a library and extend
it with [plugins](./docs/plugins.md) such as
[kei-lisp-plugin-graphics](https://github.com/ike-keichan/kei-lisp-plugin-graphics).

> [!WARNING]
> This is a **toy / hobby project** built for learning and experimentation.
> **Use in production (or any other serious product) is not recommended.**
> APIs may change without notice, and maintenance and support are provided
> on a best-effort basis only.
>
> It is also a **personal project**: issue reports (bugs, questions, ideas)
> are welcome, but external pull requests are generally **not accepted** —
> see [CONTRIBUTING.md](./CONTRIBUTING.md).

_You can write and run kei-lisp in the browser with
[**kei-lisp-web**](https://ike-keichan.github.io/kei-lisp-web/)._

## Features

- Common Lisp-inspired syntax (`setq`, `defun`, `let`, `cond`, ...)
- Macros: `defmacro` with backquote/unquote (`` ` ``, `,`, `,@`) and `macroexpand`
- Control flow: `catch` / `throw`, `error` / `handler-case`, and tail call
  optimization (deep tail recursion runs in constant stack space)
- Numeric tower: arbitrary-precision integers (bignum), exact rationals
  (`(/ 1 2)` → `1/2`), and floats with CL-style contagion
- Data structures: hash tables (`make-hash-table` / `gethash`) and vectors
  (`vector` / `aref`), plus keyword symbols (`:foo`)
- Runtime reader and file loading: `read-from-string` and `load`
- CLI tool **and** embeddable library with a [plugin mechanism](./docs/plugins.md)
- ESM and CommonJS dual output with TypeScript types
- Zero runtime dependencies

## Installation

```sh
# npm
npm install kei-lisp        # as a library
npm install -g kei-lisp     # as a CLI tool

# yarn
yarn add kei-lisp

# pnpm
pnpm add kei-lisp
```

Requires **Node.js >= 24**.

## Quick start

### CLI

```sh
$ kei-lisp
>> (+ 1 2 3)
6
>> (defun square (x) (* x x))
square
>> (square 7)
49
>> (exit)
Bye!
```

```sh
kei-lisp --version  # Show version
kei-lisp --help     # Show help
```

### Library

```ts
import { LispInterpreter, Cons } from 'kei-lisp';

const interpreter = new LispInterpreter();
const result = interpreter.evalString('(+ 1 2 3)');
console.log(Cons.toString(result)); // "6"
```

CommonJS is also supported:

```js
const { LispInterpreter, Cons } = require('kei-lisp');
```

## API

| Export              | Description                                                |
| ------------------- | ---------------------------------------------------------- |
| `LispInterpreter`   | Programmatic interpreter (parse / eval / environment)      |
| `Repl`              | Interactive REPL on stdin / stdout                         |
| `Cons`              | Cons cell (pair) data type with type predicates            |
| `InterpretedSymbol` | Lisp symbol (interned)                                     |
| `Rational`          | Exact ratio of integers (`(/ 1 2)` → `1/2`)                |
| `Numeric`           | Numeric-tower arithmetic helpers (`Numeric.toFloat`, ...)  |
| `HashTable`         | Mutable hash table (`make-hash-table`)                     |
| `Vector`            | Mutable one-dimensional vector (`vector` / `make-array`)   |
| `KeiLispError`      | Base class for parse / eval failures (subclass of `Error`) |
| `ParseError`        | Thrown on parse failure (subclass of `KeiLispError`)       |
| `EvalError`         | Thrown on evaluation failure (subclass of `KeiLispError`)  |
| `ExitError`         | Thrown when `(exit)` is evaluated; catch to handle exit    |

### `LispInterpreter`

```ts
const interpreter = new LispInterpreter();

// Evaluate source and return the last expression's result
// (Lisp integers come back as bigint — see docs/api.md)
interpreter.evalString('(+ 1 2)'); // 3n

// Evaluate multiple expressions and return all results
interpreter.evalAll('(setq x 10) (* x x)'); // [10n, 100n]
```

### `Repl`

```ts
import { Repl } from 'kei-lisp';

// Start an interactive REPL on stdin/stdout
new Repl().run();
```

### Error handling

`evalString`, `evalAll`, `eval`, and `parse` throw on failure. Catch the
errors at the boundary; `ExitError` is intentionally separate from the
`KeiLispError` family so a generic Lisp-error catch does not swallow it.

```ts
import { LispInterpreter, KeiLispError, ExitError } from 'kei-lisp';

const interpreter = new LispInterpreter();
try {
  interpreter.evalString(userInput);
} catch (error) {
  if (error instanceof ExitError) {
    // Lisp called (exit) — graceful shutdown
    return;
  }
  if (error instanceof KeiLispError) {
    // ParseError or EvalError — display to user and continue
    console.error(`${error.name}: ${error.message}`);
    return;
  }
  throw error;
}
```

## Examples

### Arithmetic

```lisp
(+ 1 2 3)   ;; => 6
(- 10 3)    ;; => 7
(* 4 5)     ;; => 20
(/ 100 4)   ;; => 25
(/ 1 2)     ;; => 1/2 (exact rational)
(mod 10 3)  ;; => 1
```

### Lists

```lisp
(list 1 2 3)            ;; => (1 2 3)
(car (list 1 2 3))      ;; => 1
(cdr (list 1 2 3))      ;; => (2 3)
(cons 0 (list 1 2 3))   ;; => (0 1 2 3)
(length (list 1 2 3))   ;; => 3
```

### Defining functions

```lisp
(defun factorial (n)
  (if (= n 0) 1 (* n (factorial (- n 1)))))

(factorial 10)  ;; => 3628800
```

### Conditionals and bindings

```lisp
(if (= 1 1) "yes" "no")                       ;; => "yes"
(cond ((= 1 2) "a") ((= 1 1) "b") (t "c"))    ;; => "b"
(let ((x 10) (y 20)) (+ x y))                 ;; => 30
```

Runnable TypeScript examples live in [`examples/`](./examples/):

```sh
pnpm build  # build the package once
node --experimental-strip-types examples/basic-eval.ts
node --experimental-strip-types examples/exit-handling.ts
```

## Provided Lisp functions

| Category             | Symbols                                                                                                                            |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Arithmetic           | `+`, `-`, `*`, `/`, `mod`, `abs`, `expt`, `sqrt`, `floor`, `ceiling`, `round`, `truncate`, `min`, `max`, `1+`, `1-`, ...           |
| Comparison / logic   | `=`, `==`, `<`, `<=`, `>`, `>=`, `and`, `or`, `not`                                                                                |
| Predicates           | `numberp`, `integerp`, `floatp`, `rationalp`, `consp`, `listp`, `stringp`, `symbolp`, `null`, `eq`, `equal`, `zerop`, ...          |
| Lists                | `car`, `cdr`, `cons`, `list`, `length`, `nth`, `append`, `reverse`, `assoc`, `member`, `mapcar`, `find`, `position`, `remove`, ... |
| Data structures      | `make-hash-table`, `gethash`, `remhash`, `vector`, `make-array`, `aref`, `svref`, ...                                              |
| Variables and places | `setq`, `setf`, `incf`, `decf`, `push`, `pop`, `getf`, `destructuring-bind`, `gensym`                                              |
| Functions and macros | `defun`, `lambda`, `apply`, `defmacro`, `` ` `` / `,` / `,@`, `macroexpand`, `defstruct`                                           |
| Control flow         | `if`, `cond`, `case`, `when`, `unless`, `do`, `dolist`, `catch`, `throw`, `error`, `handler-case`                                  |
| I/O and formatting   | `format`, `print`, `princ`, `terpri`, `with-output-to-string`, `read-from-string`, `load`                                          |
| System               | `exit`, `gc`, `time`, `trace`, `notrace`                                                                                           |

See [`docs/built-in-functions.md`](./docs/built-in-functions.md) for the full
reference with signatures and examples.

## Reference

- [kei-lisp-web](https://ike-keichan.github.io/kei-lisp-web/) — interactive kei-lisp playground
- [API Reference](./docs/api.md) — TypeScript / JavaScript library API
- [Atoms](./docs/atoms.md) — numbers (integer / rational / float), symbols, keywords, strings, nil
- [Cons](./docs/cons.md) — pairs and lists
- [Built-in Functions](./docs/built-in-functions.md) — every Lisp function and special form
- [Plugin Guide](./docs/plugins.md) — how to add Lisp-callable functions from external packages
- [kei-lisp-plugin-graphics](https://github.com/ike-keichan/kei-lisp-plugin-graphics) — Canvas2D drawing plugin

## Development

```sh
git clone https://github.com/ike-keichan/kei-lisp.git
cd kei-lisp
pnpm install
pnpm start
```

Requires [pnpm](https://pnpm.io/) and Node.js 24+
(see [`.node-version`](./.node-version) for the exact version).

| Command              | Description                                |
| -------------------- | ------------------------------------------ |
| `pnpm build`         | Build for distribution (CJS + ESM + types) |
| `pnpm start`         | Run the built CLI                          |
| `pnpm test`          | Run tests                                  |
| `pnpm test:coverage` | Run tests with coverage report             |
| `pnpm test:watch`    | Run tests in watch mode                    |
| `pnpm check`         | Run all checks (format, lint, spell, ...)  |
| `pnpm fix`           | Auto-fix format and lint issues            |

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the branch policy and PR flow.

## License

[MIT](./LICENSE)
