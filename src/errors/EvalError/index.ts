import { KeiLispError } from '../KeiLispError/index.js';

/**
 * @class
 * @classdesc Error raised when evaluation or application of a Lisp expression fails (type mismatch, unbound symbol, arity error, etc.). Subclass of `KeiLispError`.
 * @author Keisuke Ikeda
 * @this {EvalError}
 */
export class EvalError extends KeiLispError {
  /**
   * Constructor.
   * @constructor
   * @param message human-readable diagnostic message
   */
  constructor(message: string) {
    super(message);
    this.name = 'EvalError';
  }
}
