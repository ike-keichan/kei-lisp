import { Cons } from '../../value/Cons/index.js';
import type { LispValue } from '../../types/index.js';

/**
 * @class
 * @classdesc Internal control-flow signal raised by the Lisp `throw` special
 * form and intercepted by a dynamically enclosing `catch` with an `eq` tag.
 * Deliberately not part of the `KeiLispError` hierarchy: it is not an error
 * condition, so `handler-case` must not intercept it. A `throw` with no
 * matching `catch` is converted into an `EvalError` at the interpreter
 * boundary.
 * @author Keisuke Ikeda
 * @this {ThrowSignal}
 */
export class ThrowSignal extends Error {
  /**
   * The catch tag, compared by identity (`eq`).
   */
  tag: LispValue;
  /**
   * The value carried to the matching `catch`.
   */
  value: LispValue;

  /**
   * Constructor.
   * @constructor
   * @param tag the catch tag
   * @param value the value carried to the matching catch
   */
  constructor(tag: LispValue, value: LispValue) {
    super(`There is no catch for tag ${Cons.toString(tag)}`);
    this.name = 'ThrowSignal';
    this.tag = tag;
    this.value = value;
  }
}
