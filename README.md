# kei-lisp

[![npm version](https://img.shields.io/npm/v/kei-lisp.svg)](https://www.npmjs.com/package/kei-lisp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen.svg)](https://nodejs.org/)

A Lisp interpreter implemented in JavaScript.

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

```js
// ESM
import { LispInterpreter } from 'kei-lisp';

// CommonJS
const { LispInterpreter } = require('kei-lisp');

const interpreter = new LispInterpreter();
interpreter.run();
```

Available exports:

| Export              | Description                |
| ------------------- | -------------------------- |
| `LispInterpreter`   | Main interpreter class     |
| `Cons`              | Cons cell (pair) data type |
| `InterpretedSymbol` | Lisp symbol data type      |

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
| `pnpm doc`        | Generate JSDoc                        |

## License

[MIT](./LICENSE)
