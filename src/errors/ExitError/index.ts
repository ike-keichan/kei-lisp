/**
 * @class
 * @classdesc Error class representing a graceful exit triggered by a Lisp (exit) call. Catch it at the REPL or library boundary to run cleanup before terminating.
 * @author Keisuke Ikeda
 * @this {ExitError}
 */
export class ExitError extends Error {
  /**
   * Constructor.
   * @constructor
   */
  constructor() {
    super('Exit');
    this.name = 'ExitError';
  }
}
