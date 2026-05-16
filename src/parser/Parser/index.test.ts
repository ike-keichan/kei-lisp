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

    it('Quirk: interprets (quote +) as 0', () => {
      const result = Parser.parse("('+)");
      const quoted = (result as Cons).car as Cons;
      expect((quoted.cdr as Cons).car).toBe(0);
    });

    it('Quirk: interprets a + surrounded by whitespace as a symbol', () => {
      const result = Parser.parse('(( + ))');
      const list = (result as Cons).car as Cons;
      expect(list.nth(1)).toBe(InterpretedSymbol.of('+'));
    });

    it('Round 4-C: preserves a string containing emoji', () => {
      const result = Parser.parse('("Hello 😀")');
      expect((result as Cons).car).toBe('Hello 😀');
    });

    it('Round 4-C: preserves a Japanese string', () => {
      const result = Parser.parse('("こんにちは")');
      expect((result as Cons).car).toBe('こんにちは');
    });

    it('parses a function-call form', () => {
      const result = Parser.parse('((foo 1 2 3))');
      const call = (result as Cons).car as Cons;
      expect(call.car).toBe(InterpretedSymbol.of('foo'));
      expect(call.nth(4)).toBe(3);
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
});
