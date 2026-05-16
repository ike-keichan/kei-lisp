import { Cons } from '../../value/Cons/index.js';
import { InterpretedSymbol } from '../../value/InterpretedSymbol/index.js';
import { IntStream } from '../IntStream/index.js';
import { NextState } from '../NextState/index.js';
import type { LispValue } from '../../types/index.js';

const PEEKCOUNT = 10;
const SYNTAX_ERROR = 'Syntax Error!';

/**
 * @class
 * @classdesc Class that performs parsing (syntactic analysis).
 * @author Keisuke Ikeda
 * @this {Parser}
 */
export class Parser {
  stream: Iterator<string>;
  token: LispValue;
  tokenString: string;
  states: Map<number, Map<string, NextState>>;
  state: number;
  nexts: Array<string | null>;

  /**
   * Constructor.
   * @param aString the string to parse
   */
  constructor(aString: string) {
    this.stream = aString[Symbol.iterator]();
    this.token = null;
    this.tokenString = '';
    this.states = new Map();
    this.state = 0;
    this.nexts = Array.from({ length: PEEKCOUNT + 1 }, (): string | null => null);
    this.initializeStateTransitionTable();
    let count = 0;
    while (count++ < PEEKCOUNT) {
      this.nextChar();
    }
  }

  /**
   * Returns whether this is the last element.
   */
  atEnd(): boolean {
    return this.peekChar() == null;
  }

  /**
   * Concatenates the current character into the token string.
   */
  concatCharacter(): null {
    this.tokenString = this.tokenString.concat(String(this.nexts[0]));
    return null;
  }

  /**
   * Parses a single character of the input string.
   */
  input(aCharacter: string | null = this.nextChar()): LispValue {
    // Following the original: throws TypeError on .has when inputs is undefined.
    const inputs = this.states.get(this.state) as Map<string, NextState>;

    // Following the original: throws TypeError on codePointAt when aCharacter is null.
    const codePoint = (aCharacter as string).codePointAt(0) ?? 0;
    const aNumber = inputs.has(String(codePoint))
      ? (inputs.get(String(codePoint)) as NextState).next(this)
      : (inputs.get(String(128)) as NextState).next(this);

    if (aNumber < 0) {
      throw new Error(SYNTAX_ERROR);
    }
    this.state = aNumber;

    return this.token;
  }

  /**
   * Returns the next character to be parsed from the input string.
   */
  nextChar(): string | null {
    let aCharacter: string | null = null;
    try {
      const aNumber = (this.stream.next().value as string | undefined)?.codePointAt(0) ?? -1;
      if (aNumber >= 0) {
        aCharacter = String.fromCodePoint(aNumber);
      }
    } catch {
      throw new Error('Read Error!');
    }

    let count = 0;
    while (count < PEEKCOUNT) {
      this.nexts[count] = this.nexts[count + 1];
      count++;
    }
    this.nexts[count] = aCharacter;

    return this.nexts[0];
  }

  /**
   * Determines and returns the next token.
   */
  nextToken(): LispValue {
    this.token = null;
    let token: LispValue = null;

    while (!this.atEnd()) {
      if (this.state === 0 && token != null) {
        break;
      }
      token = this.input();
    }
    if (this.atEnd() && this.state !== 0) {
      throw new Error(SYNTAX_ERROR);
    }
    this.tokenString = '';

    return token;
  }

  /**
   * Instantiates and returns a NextState.
   */
  nextState(aNumber: number | null, aString: string | null): NextState {
    return new NextState(aNumber, aString);
  }

  /**
   * Parses the given string and returns the result.
   */
  static parse(aString: string): LispValue {
    return new Parser(aString).nextToken();
  }

  /**
   * Returns the next character if one exists.
   */
  peekChar(aNumber: number = 1): string | null {
    if (aNumber > this.nexts.length) {
      throw new Error('Read Error!');
    }
    return this.nexts[aNumber];
  }

  /**
   * Concatenates characters; invoked from NextState.
   */
  concat(): null {
    this.concatCharacter();
    return null;
  }

  /**
   * Returns the token number for a Number-type (double-precision floating point: pseudo-Double); invoked from NextState.
   */
  doubleToken(): number {
    this.concat();
    if (this.rightParen()) {
      this.tokenToDouble();
      return 0;
    }

    return 3;
  }

  /**
   * Returns the token number for a Number-type (double-precision floating point: pseudo-Double); invoked from NextState.
   */
  doubleTokenAUX(): number {
    this.concat();
    if (this.rightParen()) {
      this.tokenToDouble();
      return 0;
    }

    return 5;
  }

  /**
   * Returns the token number for a Number-type (integer: pseudo-Integer); invoked from NextState.
   */
  integerToken(): number {
    this.concat();
    if (this.rightParen()) {
      this.tokenToInteger();
      return 0;
    }

    return 2;
  }

  /**
   * Converts the token into a list (Cons) and returns the token number for a list (Cons); invoked from NextState.
   */
  parseList(): number {
    this.skippingSpaces();
    if (this.rightParen()) {
      this.nextChar();
      this.token = Cons.nil;
    } else {
      this.token = this.parseListAUX();
    }

    return 0;
  }

  /**
   * Helper that converts the token into a list (Cons); invoked from NextState.
   */
  parseListAUX(): LispValue {
    this.skippingSpaces();
    if (this.peekChar() === '#' || this.peekChar() === '%') {
      while (this.peekChar() !== '\n') {
        this.nextChar();
      }
      this.nextChar();
      this.skippingSpaces();
    }
    if (this.rightParen()) {
      this.nextChar();
      return Cons.nil;
    } else if (this.peekChar() === '.') {
      this.nextChar();
      this.state = 0;
      const cdr = this.nextToken();
      this.skippingSpaces();
      if (!this.rightParen()) {
        throw new Error(SYNTAX_ERROR);
      }
      this.nextChar();

      return cdr;
    } else {
      this.state = 0;
      return new Cons(this.nextToken(), this.parseListAUX());
    }
  }

  /**
   * Recognizes a quote, wraps the token into a list (Cons), and returns the token number; invoked from NextState.
   */
  quote(): number {
    const anObject = new Cons(this.nextToken(), Cons.nil);
    this.token = new Cons(InterpretedSymbol.of('quote'), anObject);

    return 0;
  }

  /**
   * Returns the token number for a quote or for a 0-origin String-type (pseudo-Character); invoked from NextState.
   */
  quoteOrChar(): number {
    let aNumber = this.peekChar() === '\\' ? 3 : 2;
    aNumber = this.peekChar(aNumber) === "'" ? 11 : this.quote();

    return aNumber;
  }

  /**
   * Detects a right parenthesis (')', ']', '}') and returns the result; invoked from NextState.
   */
  rightParen(): boolean {
    return this.peekChar() === ')' || this.peekChar() === ']' || this.peekChar() === '}';
  }

  /**
   * Returns the token number for a sign symbol ('+', '-'); invoked from NextState.
   */
  sign(): number {
    this.concat();
    if (this.rightParen()) {
      this.tokenToInteger();
      return 0;
    }

    return 7;
  }

  /**
   * Skips whitespace; invoked from NextState.
   */
  skippingSpaces(): null {
    while (
      this.nexts[1] === String.fromCodePoint(9) ||
      this.nexts[1] === String.fromCodePoint(10) ||
      this.nexts[1] === String.fromCodePoint(11) ||
      this.nexts[1] === String.fromCodePoint(12) ||
      this.nexts[1] === String.fromCodePoint(13) ||
      this.nexts[1] === String.fromCodePoint(32)
    ) {
      this.nextChar();
    }

    return null;
  }

  /**
   * Returns the token number for an InterpretedSymbol; invoked from NextState.
   */
  symbolToken(): number {
    this.concat();
    if (this.rightParen()) {
      this.tokenToSymbol();
      return 0;
    }

    return 8;
  }

  /**
   * Converts the token into a 0-origin String-type (pseudo-Character); invoked from NextState.
   */
  tokenToCharacter(): null {
    this.token = this.tokenString.charAt(0);
    return null;
  }

  /**
   * Converts the token into a Number-type (double-precision floating point: pseudo-Double); invoked from NextState.
   */
  tokenToDouble(): null {
    this.token = Number(this.tokenString);
    return null;
  }

  /**
   * Converts the token into a Number-type (double-precision floating point: pseudo-Double); invoked from NextState.
   */
  tokenToDoubleAUX(): null {
    this.concat();
    this.token = Number(this.tokenString);
    return null;
  }

  /**
   * Converts the token into a Number-type (integer: pseudo-Integer); invoked from NextState.
   */
  tokenToInteger(): null {
    const aCharacter = this.tokenString[0];
    if (aCharacter === '+') {
      this.tokenString = this.tokenString.slice(1);
    }
    this.token = Number(this.tokenString);
    return null;
  }

  /**
   * Converts the token into a String-type; invoked from NextState.
   */
  tokenToString(): null {
    this.token = this.tokenString;
    return null;
  }

  /**
   * Converts the token into an InterpretedSymbol; invoked from NextState.
   */
  tokenToSymbol(): null {
    this.token = InterpretedSymbol.of(this.tokenString);
    if (this.token === InterpretedSymbol.of('nil')) {
      this.token = Cons.nil;
    }
    return null;
  }

  /**
   * Builds the lookup table that maps character codes to their corresponding methods (tokens).
   */
  initializeStateTransitionTable(): null {
    let aTable = new Map<string, NextState>();
    for (const index of IntStream.rangeClosed(0, 8))
      aTable.set(String(index), this.nextState(-1, null));
    for (const index of IntStream.rangeClosed(9, 13))
      aTable.set(String(index), this.nextState(0, null));
    for (const index of IntStream.rangeClosed(14, 31))
      aTable.set(String(index), this.nextState(-1, null));
    aTable.set(String(32), this.nextState(0, null));
    aTable.set(String(33), this.nextState(8, 'symbolToken'));
    aTable.set(String(34), this.nextState(9, null));
    aTable.set(String(35), this.nextState(1, null));
    aTable.set(String(36), this.nextState(8, 'symbolToken'));
    aTable.set(String(37), this.nextState(1, null));
    aTable.set(String(38), this.nextState(8, 'symbolToken'));
    aTable.set(String(39), this.nextState(-1, 'quoteOrChar'));
    aTable.set(String(40), this.nextState(-1, 'parseList'));
    aTable.set(String(41), this.nextState(-1, null));
    aTable.set(String(42), this.nextState(8, 'symbolToken'));
    aTable.set(String(43), this.nextState(7, 'sign'));
    aTable.set(String(44), this.nextState(8, 'symbolToken'));
    aTable.set(String(45), this.nextState(7, 'sign'));
    aTable.set(String(46), this.nextState(-1, null));
    aTable.set(String(47), this.nextState(8, 'symbolToken'));
    for (const index of IntStream.rangeClosed(48, 57))
      aTable.set(String(index), this.nextState(2, 'integerToken'));
    for (const index of IntStream.rangeClosed(58, 90))
      aTable.set(String(index), this.nextState(8, 'symbolToken'));
    aTable.set(String(91), this.nextState(-1, 'parseList'));
    aTable.set(String(92), this.nextState(-1, null));
    aTable.set(String(93), this.nextState(-1, null));
    aTable.set(String(94), this.nextState(8, 'symbolToken'));
    aTable.set(String(95), this.nextState(8, 'symbolToken'));
    aTable.set(String(96), this.nextState(0, 'quote'));
    for (const index of IntStream.rangeClosed(97, 122))
      aTable.set(String(index), this.nextState(8, 'symbolToken'));
    aTable.set(String(123), this.nextState(-1, 'parseList'));
    aTable.set(String(124), this.nextState(8, 'symbolToken'));
    aTable.set(String(125), this.nextState(-1, null));
    aTable.set(String(126), this.nextState(8, 'symbolToken'));
    aTable.set(String(127), this.nextState(-1, null));
    aTable.set(String(128), this.nextState(-1, null));
    this.states.set(0, aTable);

    aTable = new Map<string, NextState>();
    for (const index of IntStream.rangeClosed(0, 8))
      aTable.set(String(index), this.nextState(-1, null));
    aTable.set(String(10), this.nextState(0, null));
    aTable.set(String(13), this.nextState(0, null));
    for (const index of IntStream.rangeClosed(14, 31))
      aTable.set(String(index), this.nextState(-1, null));
    aTable.set(String(127), this.nextState(-1, null));
    aTable.set(String(128), this.nextState(1, null));
    this.states.set(1, aTable);

    aTable = new Map<string, NextState>();
    for (const index of IntStream.rangeClosed(9, 13))
      aTable.set(String(index), this.nextState(0, 'tokenToInteger'));
    aTable.set(String(32), this.nextState(0, 'tokenToInteger'));
    aTable.set(String(46), this.nextState(3, 'doubleToken'));
    for (const index of IntStream.rangeClosed(48, 57))
      aTable.set(String(index), this.nextState(2, 'integerToken'));
    aTable.set(String(69), this.nextState(4, 'concat'));
    aTable.set(String(101), this.nextState(4, 'concat'));
    aTable.set(String(128), this.nextState(-1, null));
    this.states.set(2, aTable);

    aTable = new Map<string, NextState>();
    for (const index of IntStream.rangeClosed(9, 13))
      aTable.set(String(index), this.nextState(0, 'tokenToDouble'));
    aTable.set(String(32), this.nextState(0, 'tokenToDouble'));
    for (const index of IntStream.rangeClosed(48, 57))
      aTable.set(String(index), this.nextState(3, 'doubleToken'));
    aTable.set(String(68), this.nextState(0, 'tokenToDoubleAUX'));
    aTable.set(String(69), this.nextState(4, 'concat'));
    aTable.set(String(100), this.nextState(0, 'tokenToDoubleAUX'));
    aTable.set(String(101), this.nextState(4, 'concat'));
    aTable.set(String(128), this.nextState(-1, null));
    this.states.set(3, aTable);

    aTable = new Map<string, NextState>();
    aTable.set(String(43), this.nextState(6, 'concat'));
    aTable.set(String(45), this.nextState(6, 'concat'));
    for (const index of IntStream.rangeClosed(48, 57))
      aTable.set(String(index), this.nextState(5, 'doubleTokenAUX'));
    aTable.set(String(128), this.nextState(-1, null));
    this.states.set(4, aTable);

    aTable = new Map<string, NextState>();
    for (const index of IntStream.rangeClosed(9, 13))
      aTable.set(String(index), this.nextState(0, 'tokenToDouble'));
    aTable.set(String(32), this.nextState(0, 'tokenToDouble'));
    for (const index of IntStream.rangeClosed(48, 57))
      aTable.set(String(index), this.nextState(5, 'doubleTokenAUX'));
    aTable.set(String(128), this.nextState(-1, null));
    this.states.set(5, aTable);

    aTable = new Map<string, NextState>();
    for (const index of IntStream.rangeClosed(48, 57))
      aTable.set(String(index), this.nextState(5, 'doubleTokenAUX'));
    aTable.set(String(128), this.nextState(-1, null));
    this.states.set(6, aTable);

    aTable = new Map<string, NextState>();
    for (const index of IntStream.rangeClosed(9, 13))
      aTable.set(String(index), this.nextState(0, 'tokenToSymbol'));
    aTable.set(String(32), this.nextState(0, 'tokenToSymbol'));
    aTable.set(String(33), this.nextState(8, 'symbolToken'));
    for (const index of IntStream.rangeClosed(35, 38))
      aTable.set(String(index), this.nextState(8, 'symbolToken'));
    for (const index of IntStream.rangeClosed(42, 45))
      aTable.set(String(index), this.nextState(8, 'symbolToken'));
    aTable.set(String(47), this.nextState(8, 'symbolToken'));
    for (const index of IntStream.rangeClosed(48, 57))
      aTable.set(String(index), this.nextState(2, 'integerToken'));
    for (const index of IntStream.rangeClosed(58, 90))
      aTable.set(String(index), this.nextState(8, 'symbolToken'));
    aTable.set(String(94), this.nextState(8, 'symbolToken'));
    aTable.set(String(95), this.nextState(8, 'symbolToken'));
    for (const index of IntStream.rangeClosed(97, 122))
      aTable.set(String(index), this.nextState(8, 'symbolToken'));
    aTable.set(String(124), this.nextState(8, 'symbolToken'));
    aTable.set(String(126), this.nextState(8, 'symbolToken'));
    aTable.set(String(128), this.nextState(-1, null));
    this.states.set(7, aTable);

    aTable = new Map<string, NextState>();
    for (const index of IntStream.rangeClosed(9, 13))
      aTable.set(String(index), this.nextState(0, 'tokenToSymbol'));
    aTable.set(String(32), this.nextState(0, 'tokenToSymbol'));
    aTable.set(String(33), this.nextState(8, 'symbolToken'));
    for (const index of IntStream.rangeClosed(35, 38))
      aTable.set(String(index), this.nextState(8, 'symbolToken'));
    for (const index of IntStream.rangeClosed(42, 45))
      aTable.set(String(index), this.nextState(8, 'symbolToken'));
    aTable.set(String(47), this.nextState(8, 'symbolToken'));
    for (const index of IntStream.rangeClosed(48, 57))
      aTable.set(String(index), this.nextState(8, 'symbolToken'));
    for (const index of IntStream.rangeClosed(58, 90))
      aTable.set(String(index), this.nextState(8, 'symbolToken'));
    aTable.set(String(94), this.nextState(8, 'symbolToken'));
    aTable.set(String(95), this.nextState(8, 'symbolToken'));
    for (const index of IntStream.rangeClosed(97, 122))
      aTable.set(String(index), this.nextState(8, 'symbolToken'));
    aTable.set(String(124), this.nextState(8, 'symbolToken'));
    aTable.set(String(126), this.nextState(8, 'symbolToken'));
    aTable.set(String(128), this.nextState(-1, null));
    this.states.set(8, aTable);

    aTable = new Map<string, NextState>();
    for (const index of IntStream.rangeClosed(0, 31))
      aTable.set(String(index), this.nextState(-1, null));
    aTable.set(String(34), this.nextState(0, 'tokenToString'));
    aTable.set(String(92), this.nextState(10, null));
    aTable.set(String(127), this.nextState(-1, null));
    aTable.set(String(128), this.nextState(9, 'concat'));
    this.states.set(9, aTable);

    aTable = new Map<string, NextState>();
    for (const index of IntStream.rangeClosed(0, 31))
      aTable.set(String(index), this.nextState(-1, null));
    aTable.set(String(127), this.nextState(-1, null));
    aTable.set(String(128), this.nextState(9, 'concat'));
    this.states.set(10, aTable);

    aTable = new Map<string, NextState>();
    for (const index of IntStream.rangeClosed(32, 38))
      aTable.set(String(index), this.nextState(12, 'concat'));
    for (const index of IntStream.rangeClosed(40, 91))
      aTable.set(String(index), this.nextState(12, 'concat'));
    aTable.set(String(92), this.nextState(13, null));
    for (const index of IntStream.rangeClosed(93, 126))
      aTable.set(String(index), this.nextState(12, 'concat'));
    aTable.set(String(128), this.nextState(-1, null));
    this.states.set(11, aTable);

    aTable = new Map<string, NextState>();
    aTable.set(String(39), this.nextState(0, 'tokenToCharacter'));
    aTable.set(String(128), this.nextState(-1, null));
    this.states.set(12, aTable);

    aTable = new Map<string, NextState>();
    for (const index of IntStream.rangeClosed(32, 38))
      aTable.set(String(index), this.nextState(12, 'concat'));
    for (const index of IntStream.rangeClosed(40, 126))
      aTable.set(String(index), this.nextState(12, 'concat'));
    aTable.set(String(128), this.nextState(-1, null));
    this.states.set(13, aTable);

    return null;
  }
}
