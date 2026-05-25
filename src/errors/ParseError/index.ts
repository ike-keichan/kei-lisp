import { KeiLispError } from '../KeiLispError/index.js';

/**
 * @class
 * @classdesc Error raised when the parser cannot turn a source string into an AST. Subclass of `KeiLispError`.
 * @author Keisuke Ikeda
 * @this {ParseError}
 */
export class ParseError extends KeiLispError {
  /**
   * Constructor.
   * @constructor
   * @param message human-readable diagnostic message
   */
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}
