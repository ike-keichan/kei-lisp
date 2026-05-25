import { ParseError } from '../../errors/ParseError/index.js';
import type { Parser } from '../Parser/index.js';

/**
 * @class
 * @classdesc Class that holds the next state.
 * @author Keisuke Ikeda
 * @this {NextState}
 */
export class NextState {
  automaton: Parser | null = null;
  nextState: number | null;
  method: unknown;
  methodName: string | null;

  /**
   * Constructor.
   */
  constructor(aNumber: number | null, aString: string | null) {
    this.nextState = aNumber;
    this.method = null;
    this.methodName = aString;
  }

  /**
   * Invokes the method corresponding to the input character and returns the resulting token number.
   */
  next(anAutomaton: Parser): number {
    this.automaton = anAutomaton;
    if (this.methodName == null) {
      return Number(this.nextState);
    }
    if (this.method == null) {
      try {
        this.method = (this.automaton as unknown as Record<string, unknown>)[this.methodName];
      } catch {
        throw new ParseError('Not Found Method: ' + this.methodName);
      }
    }

    let aNumber = -1;
    try {
      if (this.nextState != null) {
        aNumber = this.nextState;
      }
      const anObject = (this.automaton as unknown as Record<string, () => unknown>)[
        this.methodName
      ]();
      if (anObject != null) {
        aNumber = Number(anObject);
      }
    } catch (error) {
      // Preserve Lisp-domain parse errors; wrap anything else (e.g. TypeError from
      // a malformed grammar table) as a ParseError so library users see the same family.
      if (error instanceof ParseError) throw error;
      throw new ParseError(`Not Invoke Method: ${this.methodName}`);
    }

    return aNumber;
  }
}
