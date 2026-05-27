# Plugins

kei-lisp can be extended with **plugins** that register additional
Lisp-callable functions. Plugins live in separate npm packages and are
attached to an interpreter instance at runtime via
`LispInterpreter.use(plugin)`.

This is the mechanism used by packages such as `kei-lisp-graphics`,
which add canvas-drawing functions usable from Lisp source.

## Quick start

```ts
import { Cons, InterpretedSymbol, LispInterpreter } from 'kei-lisp';
import type { KeiLispPlugin, LispValue, PluginContext } from 'kei-lisp';

class GreetPlugin implements KeiLispPlugin {
  readonly name = 'greet';
  readonly #symbols = new Set([InterpretedSymbol.of('greet')]);

  has(symbol: InterpretedSymbol): boolean {
    return this.#symbols.has(symbol);
  }

  apply(_symbol: InterpretedSymbol, args: Cons, _ctx: PluginContext): LispValue {
    return `Hello, ${String(args.car)}!`;
  }
}

const interpreter = new LispInterpreter();
interpreter.use(new GreetPlugin());
interpreter.evalString('(greet "world")'); // => "Hello, world!"
```

## The `KeiLispPlugin` interface

```ts
interface KeiLispPlugin {
  readonly name: string;
  has(symbol: InterpretedSymbol): boolean;
  apply(symbol: InterpretedSymbol, args: Cons, ctx: PluginContext): LispValue;
}
```

- **`name`** — identifier used for diagnostics.
- **`has(symbol)`** — return `true` if your plugin handles the given
  symbol. Called once per `(symbol ...)` evaluation.
- **`apply(symbol, args, ctx)`** — invoked when `has` returned `true`.
  `args` is a `Cons` containing the already-evaluated arguments
  (the interpreter evaluates them on your behalf, matching built-in
  function semantics).

## The `PluginContext`

```ts
interface PluginContext {
  environment: Table;
  streamManager: StreamManager;
  depth: number;
  eval(form: LispValue): LispValue;
}
```

- **`environment`** — the current variable binding scope.
- **`streamManager`** — the interpreter's I/O / spy / trace streams.
- **`depth`** — current call depth (for spy indentation).
- **`eval(form)`** — re-enter the evaluator with the same environment
  and stream manager. Use this when your plugin needs to evaluate a
  sub-form (for instance, when it received a lambda as an argument).

## Dispatch rules

Inside `Evaluator.eval`, `(symbol ...)` calls are routed in this order:

1. **Special form** (`if`, `let`, `defun`, ...) — handled by Evaluator.
2. **Plugin chain** — plugins are consulted in registration order;
   the first plugin whose `has(symbol)` returns `true` handles the call.
3. **Built-in / user function** — falls through to `Applier`, which
   tries `Applier.buildInFunctions` then the current environment.

If two plugins register the same symbol, the **first one registered
wins**. Plugins cannot override core special forms or `Applier`
built-ins (the special-form check runs before the plugin chain, and the
plugin chain runs before the user-function lookup but is short-circuited
by `has`).

## Packaging a plugin

A plugin package typically:

1. Lists `kei-lisp` as a `peerDependency` (so the host app pins one
   interpreter version).
2. Exports a class implementing `KeiLispPlugin`.
3. Accepts any plugin-specific configuration (canvas element, API
   credentials, etc.) via constructor arguments.

`package.json` (excerpt):

```json
{
  "peerDependencies": { "kei-lisp": "^2.2.0" },
  "main": "dist/index.cjs",
  "module": "dist/index.js",
  "types": "dist/index.d.ts"
}
```

Usage from a downstream app:

```ts
import { LispInterpreter } from 'kei-lisp';
import { MyPlugin } from 'my-kei-lisp-plugin';

const interpreter = new LispInterpreter();
interpreter.use(new MyPlugin(/* config */));
```
