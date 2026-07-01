import type { Cons } from '../value/Cons/index.js';
import type { InterpretedSymbol } from '../value/InterpretedSymbol/index.js';
import type { StreamManager } from '../runtime/StreamManager/index.js';
import type { Table } from '../runtime/Table/index.js';
import type { LispValue } from '../types/index.js';

/**
 * Context passed to a plugin's `apply` call. Holds the live interpreter state
 * needed to perform recursive evaluation or to read / write the environment.
 */
export type PluginContext = {
  /**
   * The current variable binding environment.
   */
  environment: Table;
  /**
   * The stream manager that owns the interpreter's I/O / spy / trace streams.
   */
  streamManager: StreamManager;
  /**
   * The current call depth (used for spy indentation).
   */
  depth: number;
  /**
   * Re-evaluates the given form using the current environment / stream manager / depth.
   * Use this to evaluate a sub-form (e.g. when the plugin received a lambda value).
   * @param form the form to evaluate
   * @return the evaluation result
   */
  eval(form: LispValue): LispValue;
};

/**
 * A kei-lisp plugin contributes additional Lisp-callable functions to the
 * interpreter. Register one with `LispInterpreter.use(plugin)`. When the
 * evaluator encounters `(symbol ...)` and `symbol` is not a special form,
 * registered plugins are consulted in registration order; the first plugin
 * whose `has(symbol)` returns true handles the call.
 *
 * Arguments are pre-evaluated by the interpreter before being passed to
 * `apply`, matching the calling convention of built-in functions.
 */
export type KeiLispPlugin = {
  /**
   * Plugin identifier, used for diagnostics and collision messages.
   */
  readonly name: string;
  /**
   * Returns true if this plugin handles the given symbol.
   * @param symbol the call symbol to check
   * @return true if `apply` should be called for this symbol
   */
  has(symbol: InterpretedSymbol): boolean;
  /**
   * Applies the plugin function to the (already-evaluated) arguments.
   * @param symbol the call symbol
   * @param args the evaluated argument list (a Cons, possibly Cons.nil)
   * @param ctx the interpreter context for recursive evaluation
   * @return the result value
   */
  apply(symbol: InterpretedSymbol, args: Cons, ctx: PluginContext): LispValue;
};
