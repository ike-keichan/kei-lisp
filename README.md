# kei-lisp

[![npm version](https://img.shields.io/npm/v/kei-lisp.svg)](https://www.npmjs.com/package/kei-lisp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen.svg)](https://nodejs.org/)

A Lisp interpreter implemented in TypeScript. Use it from the command line as
an interactive REPL, or embed it in your application as a library.

## Features

- Common Lisp-inspired syntax (`setq`, `defun`, `let`, `cond`, ...)
- CLI tool **and** embeddable library
- ESM and CommonJS dual output with TypeScript types
- Zero runtime dependencies

## Installation

```sh
# Use as a CLI tool
npm install -g kei-lisp

# Use as a library
npm install kei-lisp
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
| `KeiLispError`      | Base class for parse / eval failures (subclass of `Error`) |
| `ParseError`        | Thrown on parse failure (subclass of `KeiLispError`)       |
| `EvalError`         | Thrown on evaluation failure (subclass of `KeiLispError`)  |
| `ExitError`         | Thrown when `(exit)` is evaluated; catch to handle exit    |

### `LispInterpreter`

```ts
const interpreter = new LispInterpreter();

// Evaluate source and return the last expression's result
interpreter.evalString('(+ 1 2)'); // 3

// Evaluate multiple expressions and return all results
interpreter.evalAll('(setq x 10) (* x x)'); // [10, 100]
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
pnpm exec tsx examples/basic-eval.ts
pnpm exec tsx examples/exit-handling.ts
```

## Reference

In-depth documentation of each language area:

- [API Reference](./docs/api.md) — TypeScript / JavaScript library API
- [Atoms](./docs/atoms.md) — numbers, symbols, strings, nil
- [Cons](./docs/cons.md) — pairs and lists
- [Built-in Functions](./docs/built-in-functions.md) — full Lisp reference

## Development

```sh
git clone https://github.com/ike-keichan/kei-lisp.git
cd kei-lisp
pnpm install
pnpm start
```

Requires [pnpm](https://pnpm.io/) and Node.js 24+
(see [`.node-version`](./.node-version) for the exact version).

| Command           | Description                               |
| ----------------- | ----------------------------------------- |
| `pnpm build`      | Build for distribution                    |
| `pnpm start`      | Run the built CLI                         |
| `pnpm test`       | Run tests                                 |
| `pnpm test:watch` | Run tests in watch mode                   |
| `pnpm check`      | Run all checks (format, lint, spell, ...) |
| `pnpm fix`        | Auto-fix format and lint issues           |

## License

[MIT](./LICENSE)
