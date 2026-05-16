# kei-lisp

[![npm version](https://img.shields.io/npm/v/kei-lisp.svg)](https://www.npmjs.com/package/kei-lisp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen.svg)](https://nodejs.org/)

A Lisp interpreter implemented in TypeScript.

## Installation

### CLI

```sh
npm install -g kei-lisp
```

### Library

```sh
npm install kei-lisp
```

## Usage

### CLI

Start the interactive REPL:

```sh
kei-lisp
```

Options:

```sh
kei-lisp --version  # Show version
kei-lisp --help     # Show help
```

### Library

```ts
// ESM (TypeScript / Modern Node)
import { LispInterpreter, Cons, ExitError } from 'kei-lisp';

// CommonJS
const { LispInterpreter, Cons, ExitError } = require('kei-lisp');
```

#### REPL mode

```ts
const interpreter = new LispInterpreter();
interpreter.run(); // Starts an interactive REPL on stdin/stdout
```

#### Programmatic evaluation

```ts
const interpreter = new LispInterpreter();

// Evaluate a source string and return the last expression's result
const result = interpreter.evalString('(+ 1 2 3)');
console.log(Cons.toString(result)); // => "6"

// Evaluate multiple expressions and get all results as an array
const results = interpreter.evalAll('(setq x 10) (* x x)');
console.log(results); // => [10, 100]
```

#### Handling `(exit)` gracefully

```ts
import { LispInterpreter, ExitError } from 'kei-lisp';

const interpreter = new LispInterpreter();
try {
  interpreter.evalString('(exit)');
} catch (error) {
  if (error instanceof ExitError) {
    // User code called (exit) — clean shutdown
    console.log('Lisp program requested exit');
  } else {
    throw error;
  }
}
```

Available exports:

| Export              | Description                                                   |
| ------------------- | ------------------------------------------------------------- |
| `LispInterpreter`   | Main interpreter class (REPL + programmatic API)              |
| `Cons`              | Cons cell (pair) data type with type predicates               |
| `InterpretedSymbol` | Lisp symbol data type (interned)                              |
| `ExitError`         | Thrown when `(exit)` is evaluated; catch to handle gracefully |

## Reference

- [Atom](./docs/README_Atom.md)
- [Cons](./docs/README_Cons.md)
- [Function](./docs/README_Function.md)

## Examples

### example1

```
>> 1
1
>> -1.2
-1.2
>> a
a
>> nil
nil
```

### example2

```
>> ()
nil
>> (+ 1 2)
3
>> (+ 1 2.3)
3.3
>> (+ 1.2 3)
4.2
>> (+ 1.2 3.4)
4.6
>> (+ 1.2 -3.4)
-2.2
```

### example3

```
>> '(1 . 2)
(1 . 2)
>> '(1 . 2.3)
(1 . 2.3)
>> '(1.2 . 3)
(1.2 . 3)
>> '(1.2 . 3.4)
(1.2 . 3.4)
>> '(1 . nil)
(1)
>> '(nil . 1)
(nil . 1)
>> '(1.2 nil)
(1.2)
>> '(nil 1.2)
(nil 1.2)
```

### example4

```
>> (car '(1 (2 (3 (4 5) 6) 7 (8 9))))
1
>> (cdr '(1 (2 (3 (4 5) 6) 7 (8 9))))
((2 (3 (4 5) 6) 7 (8 9)))
>> (+ (- (* 1 2) (* 3 4)) (- (* 5 6) (* 7 8)))
-36
>> (+
     1
  2
      )(+ (- (* 1 2) (* 3 4)) (- (* 5 6) (* 7 8)))(
   -
   4
3

)
3
-36
1
```

### example5

```
>> (defun tasu (a b) (+ a b))
tasu
>> (tasu 7 8)
15
```

## Development

### Requirements

- [nodenv](https://github.com/nodenv/nodenv) (Node.js version management)
- Node.js >= 24.0.0 (see `.node-version`)
- [pnpm](https://pnpm.io/)

### Setup

```sh
git clone https://github.com/ike-keichan/kei-lisp.git
cd kei-lisp
pnpm install
pnpm dev
```

### Scripts

| Command           | Description                           |
| ----------------- | ------------------------------------- |
| `pnpm build`      | Build for distribution                |
| `pnpm dev`        | Build and run                         |
| `pnpm start`      | Run built CLI                         |
| `pnpm test`       | Run tests                             |
| `pnpm test:watch` | Run tests in watch mode               |
| `pnpm check`      | Run all checks (format/lint/spell)    |
| `pnpm fix`        | Auto-fix format and lint issues       |
| `pnpm clean`      | Remove build artifacts                |
| `pnpm wipe`       | Remove build artifacts + node_modules |
| `pnpm doc`        | Generate API documentation            |

## License

[MIT](./LICENSE)
