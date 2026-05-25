/**
 * @class
 * @classdesc Base class for all errors raised by kei-lisp during parsing or evaluation. Catch this to handle any Lisp-level failure without intercepting an unrelated runtime error or an `ExitError` (which signals a graceful `(exit)` and is intentionally not a subclass).
 * @author Keisuke Ikeda
 * @this {KeiLispError}
 */
export class KeiLispError extends Error {
  /**
   * Constructor.
   * @constructor
   * @param message human-readable diagnostic message
   */
  constructor(message: string) {
    super(message);
    this.name = 'KeiLispError';
  }
}
