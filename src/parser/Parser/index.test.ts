import { describe, expect, it } from 'vitest';

import { Cons } from '../../value/Cons/index.js';
import { InterpretedSymbol } from '../../value/InterpretedSymbol/index.js';
import { Parser } from './index.js';

describe('Parser', () => {
  describe('constructor', () => {
    it('creates a Parser from the given string', () => {
      const p = new Parser('(1 2 3)');
      expect(p.state).toBe(0);
      expect(p.tokenString).toBe('');
    });

    it('initializes the peek buffer with size PEEKCOUNT + 1', () => {
      expect(new Parser('abc').nexts.length).toBe(11);
    });
  });

  describe('atEnd', () => {
    it('returns true for empty input', () => {
      expect(new Parser('').atEnd()).toBe(true);
    });

    it('returns false while characters remain', () => {
      expect(new Parser('abc').atEnd()).toBe(false);
    });
  });

  describe('parse (static)', () => {
    it('parses an integer', () => {
      const result = Parser.parse('(42)');
      expect((result as Cons).car).toBe(42);
    });

    it('parses a floating-point number', () => {
      const result = Parser.parse('(3.14)');
      expect((result as Cons).car).toBe(3.14);
    });

    it('parses a negative number', () => {
      const result = Parser.parse('(-42)');
      expect((result as Cons).car).toBe(-42);
    });

    it('parses and interns a symbol', () => {
      const result = Parser.parse('(foo)');
      expect((result as Cons).car).toBe(InterpretedSymbol.of('foo'));
    });

    it('parses a string literal', () => {
      const result = Parser.parse('("hello")');
      expect((result as Cons).car).toBe('hello');
    });

    it('parses the list (1 2 3)', () => {
      const result = Parser.parse('((1 2 3))');
      const list = (result as Cons).car as Cons;
      expect(list.length()).toBe(3);
      expect(list.nth(2)).toBe(2);
    });

    it('parses nested lists', () => {
      const result = Parser.parse('(((1) (2 3)))');
      const outer = (result as Cons).car as Cons;
      expect((outer.nth(1) as Cons).nth(1) as number).toBe(1);
      expect((outer.nth(2) as Cons).nth(2) as number).toBe(3);
    });

    it("parses 'x as (quote x)", () => {
      const result = Parser.parse("('x)");
      const quoted = (result as Cons).car as Cons;
      expect(quoted.car).toBe(InterpretedSymbol.of('quote'));
    });

    it('interprets (quote +) as the symbol +', () => {
      const result = Parser.parse("('+)");
      const quoted = (result as Cons).car as Cons;
      expect((quoted.cdr as Cons).car).toBe(InterpretedSymbol.of('+'));
    });

    it('interprets (quote -) as the symbol -', () => {
      const result = Parser.parse("('-)");
      const quoted = (result as Cons).car as Cons;
      expect((quoted.cdr as Cons).car).toBe(InterpretedSymbol.of('-'));
    });

    it('interprets a + surrounded by whitespace as a symbol', () => {
      const result = Parser.parse('(( + ))');
      const list = (result as Cons).car as Cons;
      expect(list.nth(1)).toBe(InterpretedSymbol.of('+'));
    });

    it('preserves a string containing emoji', () => {
      const result = Parser.parse('("Hello 😀")');
      expect((result as Cons).car).toBe('Hello 😀');
    });

    it('preserves a Japanese string', () => {
      const result = Parser.parse('("こんにちは")');
      expect((result as Cons).car).toBe('こんにちは');
    });

    it('parses a function-call form', () => {
      const result = Parser.parse('((foo 1 2 3))');
      const call = (result as Cons).car as Cons;
      expect(call.car).toBe(InterpretedSymbol.of('foo'));
      expect(call.nth(4)).toBe(3);
    });

    it('tokenizes 1+ as the symbol 1+ (CL-style increment)', () => {
      const result = Parser.parse('((1+ 5))');
      const call = (result as Cons).car as Cons;
      expect(call.car).toBe(InterpretedSymbol.of('1+'));
      expect(call.nth(2)).toBe(5);
    });

    it('tokenizes 1- as the symbol 1- (CL-style decrement)', () => {
      const result = Parser.parse('((1- 5))');
      const call = (result as Cons).car as Cons;
      expect(call.car).toBe(InterpretedSymbol.of('1-'));
      expect(call.nth(2)).toBe(5);
    });

    it('tokenizes 1+2 as a single symbol (digit followed by + then symbol char)', () => {
      const result = Parser.parse("('1+2)");
      const quoted = (result as Cons).car as Cons;
      expect((quoted.cdr as Cons).car).toBe(InterpretedSymbol.of('1+2'));
    });

    it('still parses 1e+10 as a float (exponent sign in state 4)', () => {
      const result = Parser.parse('(1e+10)');
      expect((result as Cons).car).toBe(1e10);
    });
  });

  describe('quasiquote syntax', () => {
    it('parses `x as (quasiquote x)', () => {
      const result = Parser.parse('(`x)');
      const form = (result as Cons).car as Cons;
      expect(form.car).toBe(InterpretedSymbol.of('quasiquote'));
      expect((form.cdr as Cons).car).toBe(InterpretedSymbol.of('x'));
    });

    it('parses ,x as (unquote x)', () => {
      const result = Parser.parse('(,x)');
      const form = (result as Cons).car as Cons;
      expect(form.car).toBe(InterpretedSymbol.of('unquote'));
      expect((form.cdr as Cons).car).toBe(InterpretedSymbol.of('x'));
    });

    it('parses ,@x as (unquote-splicing x)', () => {
      const result = Parser.parse('(,@x)');
      const form = (result as Cons).car as Cons;
      expect(form.car).toBe(InterpretedSymbol.of('unquote-splicing'));
      expect((form.cdr as Cons).car).toBe(InterpretedSymbol.of('x'));
    });

    it('parses a backquoted list with unquote and splicing', () => {
      const result = Parser.parse('(`(a ,b ,@c))');
      expect(Cons.toString((result as Cons).car)).toBe(
        '(quasiquote (a (unquote b) (unquote-splicing c)))',
      );
    });

    it('parses a dotted unquote tail', () => {
      const result = Parser.parse('(`(a . ,b))');
      const form = (result as Cons).car as Cons;
      const template = (form.cdr as Cons).car as Cons;
      expect(template.car).toBe(InterpretedSymbol.of('a'));
      const tail = template.cdr as Cons;
      expect(tail.car).toBe(InterpretedSymbol.of('unquote'));
      expect((tail.cdr as Cons).car).toBe(InterpretedSymbol.of('b'));
    });

    it('nests quasiquotes', () => {
      const result = Parser.parse('(`(a `(b ,c)))');
      expect(Cons.toString((result as Cons).car)).toBe(
        '(quasiquote (a (quasiquote (b (unquote c)))))',
      );
    });
  });

  describe('nextChar', () => {
    it('advances one character and returns a value', () => {
      const p = new Parser('abc');
      expect(p.nextChar()).toBeDefined();
    });

    it('sets atEnd to true once the input is exhausted', () => {
      const p = new Parser('a');
      for (let i = 0; i < 15; i++) {
        p.nextChar();
      }
      expect(p.atEnd()).toBe(true);
    });
  });

  describe('peekChar', () => {
    it('returns the next character without consuming it', () => {
      const p = new Parser('abc');
      expect(p.peekChar()).toBe(p.peekChar());
    });
  });

  describe('nextState', () => {
    it('creates a NextState instance', () => {
      const p = new Parser('');
      const ns = p.nextState(1, 'foo');
      expect(ns.nextState).toBe(1);
      expect(ns.methodName).toBe('foo');
    });

    it('accepts null arguments', () => {
      const ns = new Parser('').nextState(null, null);
      expect(ns.nextState).toBeNull();
      expect(ns.methodName).toBeNull();
    });
  });

  describe('nextToken', () => {
    it('parses the entire input and returns an expression', () => {
      const p = new Parser('(42)');
      const result = p.nextToken();
      // Calling nextToken directly (not via parse) still returns the (42) list.
      expect(Cons.isCons(result)).toBe(true);
    });

    it('parses numeric literals and returns them', () => {
      const p = new Parser('(99)');
      const result = p.nextToken() as Cons;
      expect(result.car).toBe(99);
    });
  });

  describe('comment syntax', () => {
    it('treats ; as a line comment inside a list', () => {
      const result = Parser.parse('(1 ; this is a comment\n 2 3)') as Cons;
      expect(result.length()).toBe(3);
      expect(result.nth(2)).toBe(2);
    });

    it('treats # as a regular symbol character (no longer a comment)', () => {
      const result = Parser.parse('(#foo)') as Cons;
      expect(result.car).toBe(InterpretedSymbol.of('#foo'));
    });

    it('treats % as a regular symbol character (no longer a comment)', () => {
      const result = Parser.parse('(%bar)') as Cons;
      expect(result.car).toBe(InterpretedSymbol.of('%bar'));
    });
  });

  describe('string escape sequences', () => {
    it('translates a newline escape into a newline character', () => {
      const result = Parser.parse(String.raw`("a\nb")`);
      expect((result as Cons).car).toBe('a\nb');
    });

    it('translates a tab escape into a tab character', () => {
      const result = Parser.parse(String.raw`("a\tb")`);
      expect((result as Cons).car).toBe('a\tb');
    });

    it('translates a carriage-return escape into a CR character', () => {
      const result = Parser.parse(String.raw`("a\rb")`);
      expect((result as Cons).car).toBe('a\rb');
    });

    it('translates a doubled backslash into a single backslash', () => {
      const result = Parser.parse(String.raw`("a\\b")`);
      expect((result as Cons).car).toBe(String.raw`a\b`);
    });

    it('translates an escaped double-quote into a literal double-quote', () => {
      const result = Parser.parse(String.raw`("a\"b")`);
      expect((result as Cons).car).toBe('a"b');
    });

    it('passes through unknown escape sequences as the literal character', () => {
      const result = Parser.parse(String.raw`("a\xb")`);
      expect((result as Cons).car).toBe('axb');
    });
  });
});
