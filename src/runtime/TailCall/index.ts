import type { Cons } from '../../value/Cons/index.js';
import type { LispValue } from '../../types/index.js';

/**
 * @class
 * @classdesc Internal sentinel returned from a tail-position evaluation:
 * "apply this user lambda to these (already evaluated) arguments". The
 * Applier's lambda-application loop unwinds these iteratively instead of
 * recursing, which gives kei-lisp tail call optimization (TCO). Never
 * surfaces as a Lisp value.
 * @author Keisuke Ikeda
 * @this {TailCall}
 */
export class TailCall extends Object {
  /**
   * The user lambda (a lambda Cons with its captured environment) to apply.
   */
  procedure: Cons;
  /**
   * The already-evaluated argument list.
   */
  args: LispValue;

  /**
   * Constructor.
   * @constructor
   * @param procedure the user lambda to apply
   * @param args the already-evaluated argument list
   */
  constructor(procedure: Cons, args: LispValue) {
    super();
    this.procedure = procedure;
    this.args = args;
  }
}
