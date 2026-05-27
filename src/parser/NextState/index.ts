import { ParseError } from '../../errors/ParseError/index.js';
import type { Parser } from '../Parser/index.js';

/**
 * @class
 * @classdesc Class that holds the next state.
 * @author Keisuke Ikeda
 * @this {NextState}
 */
export class NextState extends Object {
  /**
   * The parser whose method will be invoked. Set on each call to `next`.
   */
  automaton: Parser | null = null;
  /**
   * The fallback state number returned when no method is configured (or as the initial value).
   */
  nextState: number | null;
  /**
   * Cached reference to the resolved method (kept as `unknown` because lookup happens by name).
   */
  method: unknown;
  /**
   * The name of the parser method to invoke, or null if only `nextState` should be returned.
   */
  methodName: string | null;

  /**
   * Constructor.
   * @constructor
   * @param aNumber the fallback state number (or null)
   * @param aString the parser method name to invoke (or null)
   */
  constructor(aNumber: number | null, aString: string | null) {
    super();
    this.nextState = aNumber;
    this.method = null;
    this.methodName = aString;
  }

  /**
   * Invokes the method corresponding to the input character and returns the resulting token number.
   * @param anAutomaton the parser to invoke the method on
   * @return the next state number
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
