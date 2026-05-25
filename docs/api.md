# API Reference

TypeScript / JavaScript API for embedding kei-lisp as a library.

For Lisp **language** documentation, see [atoms](./atoms.md),
[cons](./cons.md), and [built-in functions](./built-in-functions.md).

## Exports

```ts
import { LispInterpreter, Repl, Cons, InterpretedSymbol, ExitError } from 'kei-lisp';
import type { LispValue } from 'kei-lisp';
```

## `LispInterpreter`

The main interpreter class. One instance owns one Lisp environment.

### `new LispInterpreter()`

Construct a new interpreter with an empty top-level environment
(pre-populated with built-in functions and special-form symbols).

```ts
const interpreter = new LispInterpreter();
```

### `interpreter.evalString(source: string): LispValue`

Parse `source`, evaluate all top-level expressions, and return the value
of the last expression. If `source` is empty, returns `Cons.nil`.

```ts
const result = interpreter.evalString('(+ 1 2 3)'); // 6
interpreter.evalString('(setq x 10) (* x x)'); // 100 (last value)
```

### `interpreter.evalAll(source: string): LispValue[]`

Parse `source`, evaluate all top-level expressions, and return all
results as an array.

```ts
interpreter.evalAll('(+ 1 2) (* 3 4)'); // [3, 12]
interpreter.evalAll(''); // []
```

### `interpreter.eval(expr: LispValue): LispValue`

Evaluate a single already-parsed expression. Use `parse` first if your
input is a string.

```ts
const ast = interpreter.parse('(+ 1 2)') as Cons;
interpreter.eval(ast.car); // 3
```

### `interpreter.parse(source: string): LispValue`

Parse `source` into an AST (a `Cons` containing each top-level
expression). Returns `Cons.nil` on parse failure.

```ts
const ast = interpreter.parse('(+ 1 2) (- 3 4)');
```

## `Repl`

Interactive REPL wrapper around `LispInterpreter`. Reads from
`process.stdin`, writes to `process.stdout`.

### `new Repl(interpreter?: LispInterpreter)`

Construct a REPL. If `interpreter` is omitted, a new
`LispInterpreter` is created internally.

```ts
new Repl().run();
// or with a customized interpreter
const interpreter = new LispInterpreter();
new Repl(interpreter).run();
```

### `repl.run(): void`

Start the REPL loop. Blocks until end-of-input or `(exit)` is called.

## `Cons`

Cons cell — the fundamental compound data type. Used for pairs and
lists.

### Static members

| Member               | Description                                       |
| -------------------- | ------------------------------------------------- |
| `Cons.nil`           | Singleton representing the empty list / nil value |
| `Cons.isCons(v)`     | Type predicate; `true` for non-nil Cons           |
| `Cons.isNil(v)`      | Type predicate; `true` for `Cons.nil`             |
| `Cons.isList(v)`     | `true` for any Cons (including nil)               |
| `Cons.isAtom(v)`     | `true` for non-Cons values                        |
| `Cons.isNumber(v)`   | Type predicate for primitive numbers              |
| `Cons.isString(v)`   | Type predicate for primitive strings              |
| `Cons.isSymbol(v)`   | Type predicate for `InterpretedSymbol`            |
| `Cons.isTable(v)`    | Type predicate for `Table` (environment)          |
| `Cons.toString(v)`   | Convert any `LispValue` to its display string     |
| `Cons.parse(src)`    | Parse a source string into an AST                 |
| `Cons.cloneValue(v)` | Deep clone a `LispValue`                          |

### Instance methods

| Method            | Description                                     |
| ----------------- | ----------------------------------------------- |
| `c.car`           | First element                                   |
| `c.cdr`           | Rest                                            |
| `c.add(v)`        | Append a value (mutates, returns this)          |
| `c.length()`      | Number of elements (returns `0` for nil)        |
| `c.nth(n)`        | n-th element (1-origin)                         |
| `c.last()`        | Last Cons cell                                  |
| `c.nconc(other)`  | Destructively concatenate another list          |
| `c.clone()`       | Deep copy                                       |
| `c.equals(other)` | Structural equality                             |
| `c.toString()`    | Display string                                  |
| `c.loop()`        | Returns a `Loop` iterator (usable in `for..of`) |

### Type narrowing example

```ts
const value: LispValue = interpreter.evalString('(list 1 2 3)');
if (Cons.isCons(value)) {
  // TypeScript narrows `value` to `Cons` here
  console.log(value.car); // 1
}
```

## `InterpretedSymbol`

Interned Lisp symbol. Each unique name maps to exactly one instance.

### `InterpretedSymbol.of(name: string): InterpretedSymbol`

Get the interned symbol for `name`. Same `name` returns the same
instance.

```ts
const a = InterpretedSymbol.of('foo');
const b = InterpretedSymbol.of('foo');
console.log(a === b); // true (interned)
```

### `symbol.name: string`

The print name of the symbol.

### `symbol.toString(): string`

Returns the print name (same as `.name`).

## `ExitError`

Subclass of `Error` thrown when Lisp code calls `(exit)`. Catch it to
prevent the host process from being terminated.

```ts
import { LispInterpreter, ExitError } from 'kei-lisp';

try {
  new LispInterpreter().evalString(userCode);
} catch (error) {
  if (error instanceof ExitError) {
    // Lisp program requested exit — clean up gracefully
    return;
  }
  throw error;
}
```

### Properties

| Property  | Value                |
| --------- | -------------------- |
| `name`    | `'ExitError'`        |
| `message` | `'Exit'`             |
| `stack`   | Standard Error stack |

## `LispValue` type

The union type representing any Lisp value:

```ts
type LispValue = Cons | InterpretedSymbol | Table | number | string | null;
```

- `number` and `string` are primitive JS types
- `null` is used as an internal sentinel (different from Lisp `nil`,
  which is `Cons.nil`)
- `Table` is internal to the interpreter (not normally constructed by
  library users)

Use the `Cons.is*` type predicates to narrow this union.
