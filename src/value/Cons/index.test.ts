import { describe, expect, it } from 'vitest';

import { InterpretedSymbol } from '../InterpretedSymbol/index.js';
import { Table } from '../../runtime/Table/index.js';
import { Cons } from './index.js';

describe('Cons', () => {
  describe('constructor', () => {
    it('sets car and cdr to nil when constructed without arguments', () => {
      const c = new Cons();
      expect(c.car).toBe(Cons.nil);
      expect(c.cdr).toBe(Cons.nil);
    });

    it('sets cdr to nil when only car is specified', () => {
      const c = new Cons(42);
      expect(c.car).toBe(42);
      expect(c.cdr).toBe(Cons.nil);
    });

    it('sets car and cdr exactly as specified when both are given', () => {
      const c = new Cons(1, 2);
      expect(c.car).toBe(1);
      expect(c.cdr).toBe(2);
    });

    it('the nil singleton is an instance of Cons', () => {
      expect(Cons.nil).toBeInstanceOf(Cons);
    });
  });

  describe('add', () => {
    it('appends an element to the tail', () => {
      const c = new Cons(1, Cons.nil);
      c.add(2);
      expect(c.length()).toBe(2);
    });

    it('stacks elements in order across multiple calls', () => {
      const c = new Cons(1, Cons.nil);
      c.add(2);
      c.add(3);
      c.add(4);
      expect(c.length()).toBe(4);
      expect(c.nth(4)).toBe(4);
    });

    it('returns this Cons', () => {
      const c = new Cons(1, Cons.nil);
      expect(c.add(2)).toBe(c);
    });
  });

  describe('clone', () => {
    it('returns a structurally equivalent copy', () => {
      const a = new Cons(1, new Cons(2, Cons.nil));
      expect(a.equals(a.clone())).toBe(true);
    });

    it('returns a different instance', () => {
      const a = new Cons(1, Cons.nil);
      expect(a.clone()).not.toBe(a);
    });

    it('recursively clones inner Cons cells', () => {
      const inner = new Cons(10, Cons.nil);
      const outer = new Cons(inner, Cons.nil);
      const cloned = outer.clone();
      expect(cloned.car).not.toBe(inner);
    });
  });

  describe('cloneValue (static)', () => {
    it('returns a clone when given a Cons', () => {
      const c = new Cons(1, Cons.nil);
      expect(Cons.cloneValue(c)).not.toBe(c);
    });

    it('returns nil when given nil', () => {
      expect(Cons.cloneValue(Cons.nil)).toBe(Cons.nil);
    });

    it('returns the same value when given a number', () => {
      expect(Cons.cloneValue(42)).toBe(42);
    });

    it('returns the same value when given a string', () => {
      expect(Cons.cloneValue('foo')).toBe('foo');
    });

    it('returns the same instance when given a symbol', () => {
      const s = InterpretedSymbol.of('x');
      expect(Cons.cloneValue(s)).toBe(s);
    });

    it('returns the same instance when given a Table', () => {
      const t = new Table();
      expect(Cons.cloneValue(t)).toBe(t);
    });
  });

  describe('equals', () => {
    it('returns true for structurally equal Cons cells', () => {
      const a = new Cons(1, new Cons(2, Cons.nil));
      const b = new Cons(1, new Cons(2, Cons.nil));
      expect(a.equals(b)).toBe(true);
    });

    it('returns true for the same instance', () => {
      const a = new Cons(1, Cons.nil);
      expect(a.equals(a)).toBe(true);
    });

    it('returns false when elements differ', () => {
      const a = new Cons(1, Cons.nil);
      const b = new Cons(2, Cons.nil);
      expect(a.equals(b)).toBe(false);
    });

    it('returns false when lengths differ', () => {
      const a = new Cons(1, Cons.nil);
      const b = new Cons(1, new Cons(2, Cons.nil));
      expect(a.equals(b)).toBe(false);
    });

    it('returns false when compared with a non-Cons value', () => {
      const a = new Cons(1, Cons.nil);
      expect(a.equals(42)).toBe(false);
      expect(a.equals(null)).toBe(false);
    });
  });

  describe('isAtom (static)', () => {
    it('returns true for non-Cons values', () => {
      expect(Cons.isAtom(42)).toBe(true);
      expect(Cons.isAtom('foo')).toBe(true);
      expect(Cons.isAtom(Cons.nil)).toBe(true);
    });

    it('returns false for Cons cells', () => {
      expect(Cons.isAtom(new Cons(1, Cons.nil))).toBe(false);
    });
  });

  describe('isCons (static)', () => {
    it('returns true for a regular Cons', () => {
      expect(Cons.isCons(new Cons(1, Cons.nil))).toBe(true);
    });

    it('returns false for the nil singleton', () => {
      expect(Cons.isCons(Cons.nil)).toBe(false);
    });

    it('returns false for non-Cons values', () => {
      expect(Cons.isCons(42)).toBe(false);
      expect(Cons.isCons('foo')).toBe(false);
      expect(Cons.isCons(null)).toBe(false);
    });
  });

  describe('isList (static)', () => {
    it('returns true for Cons or nil', () => {
      expect(Cons.isList(Cons.nil)).toBe(true);
      expect(Cons.isList(new Cons(1, Cons.nil))).toBe(true);
    });

    it('returns false for values that are neither Cons nor nil', () => {
      expect(Cons.isList(42)).toBe(false);
      expect(Cons.isList(null)).toBe(false);
    });
  });

  describe('isNil (static)', () => {
    it('returns true for Cons.nil', () => {
      expect(Cons.isNil(Cons.nil)).toBe(true);
    });

    it('returns false for values other than Cons.nil', () => {
      expect(Cons.isNil(new Cons(1, Cons.nil))).toBe(false);
      expect(Cons.isNil(null)).toBe(false);
      expect(Cons.isNil(0)).toBe(false);
    });
  });

  describe('isNotCons (static)', () => {
    it('returns the negation of isCons', () => {
      expect(Cons.isNotCons(new Cons(1, Cons.nil))).toBe(false);
      expect(Cons.isNotCons(Cons.nil)).toBe(true);
      expect(Cons.isNotCons(42)).toBe(true);
    });
  });

  describe('isNotList (static)', () => {
    it('returns the negation of isList', () => {
      expect(Cons.isNotList(Cons.nil)).toBe(false);
      expect(Cons.isNotList(42)).toBe(true);
    });
  });

  describe('isNotNil (static)', () => {
    it('returns the negation of isNil', () => {
      expect(Cons.isNotNil(Cons.nil)).toBe(false);
      expect(Cons.isNotNil(42)).toBe(true);
    });
  });

  describe('isNotSymbol (static)', () => {
    it('returns the negation of isSymbol', () => {
      expect(Cons.isNotSymbol(InterpretedSymbol.of('x'))).toBe(false);
      expect(Cons.isNotSymbol('x')).toBe(true);
    });
  });

  describe('isNumber (static)', () => {
    it('returns true for primitive numbers', () => {
      expect(Cons.isNumber(42)).toBe(true);
      expect(Cons.isNumber(-3.14)).toBe(true);
    });

    it('returns false for non-number values', () => {
      expect(Cons.isNumber('42')).toBe(false);
      expect(Cons.isNumber(null)).toBe(false);
    });
  });

  describe('isString (static)', () => {
    it('returns true for primitive strings', () => {
      expect(Cons.isString('foo')).toBe(true);
      expect(Cons.isString('')).toBe(true);
    });

    it('returns false for non-string values', () => {
      expect(Cons.isString(42)).toBe(false);
      expect(Cons.isString(null)).toBe(false);
    });
  });

  describe('isSymbol (static)', () => {
    it('returns true for an InterpretedSymbol', () => {
      expect(Cons.isSymbol(InterpretedSymbol.of('x'))).toBe(true);
    });

    it('returns false for non-symbol values', () => {
      expect(Cons.isSymbol('x')).toBe(false);
      expect(Cons.isSymbol(42)).toBe(false);
    });
  });

  describe('isTable (static)', () => {
    it('returns true for a Table', () => {
      expect(Cons.isTable(new Table())).toBe(true);
    });

    it('returns false for non-Table values', () => {
      expect(Cons.isTable(Cons.nil)).toBe(false);
      expect(Cons.isTable(42)).toBe(false);
    });
  });

  describe('last', () => {
    it('returns this when there is a single element', () => {
      const c = new Cons(1, Cons.nil);
      expect(c.last()).toBe(c);
    });

    it('returns the last Cons cell when there are multiple elements', () => {
      const c = new Cons(1, new Cons(2, new Cons(3, Cons.nil)));
      expect(c.last().car).toBe(3);
    });
  });

  describe('length', () => {
    it('returns 0 for the length of nil', () => {
      expect(Cons.nil.length()).toBe(0);
    });

    it('returns 1 for a single-element list', () => {
      expect(new Cons(1, Cons.nil).length()).toBe(1);
    });

    it('returns N for an N-element list', () => {
      const c = new Cons(1, new Cons(2, new Cons(3, Cons.nil)));
      expect(c.length()).toBe(3);
    });
  });

  describe('loop', () => {
    it('returns a Loop instance', () => {
      const c = new Cons(1, Cons.nil);
      expect(c.loop().hasNext()).toBe(true);
    });

    it('iterates all elements in order via for..of', () => {
      const c = new Cons(1, new Cons(2, new Cons(3, Cons.nil)));
      expect([...c.loop()]).toEqual([1, 2, 3]);
    });
  });

  describe('nconc', () => {
    it('concatenates another Cons at the tail', () => {
      const a = new Cons(1, Cons.nil);
      const b = new Cons(2, Cons.nil);
      a.nconc(b);
      expect(a.length()).toBe(2);
    });

    it('mutates the original Cons by rewriting its cdr', () => {
      const a = new Cons(1, Cons.nil);
      const b = new Cons(2, Cons.nil);
      a.nconc(b);
      expect(a.cdr).toBe(b);
    });
  });

  describe('nth', () => {
    it('returns elements using 1-based indexing', () => {
      const c = new Cons(10, new Cons(20, new Cons(30, Cons.nil)));
      expect(c.nth(1)).toBe(10);
      expect(c.nth(3)).toBe(30);
    });

    it('returns nil when the index is out of range', () => {
      const c = new Cons(10, Cons.nil);
      expect(c.nth(2)).toBe(Cons.nil);
    });

    it('returns nil when the index is 0 or negative', () => {
      const c = new Cons(10, Cons.nil);
      expect(c.nth(0)).toBe(Cons.nil);
      expect(c.nth(-1)).toBe(Cons.nil);
    });
  });

  describe('parse (static)', () => {
    it('parses a string and returns a Cons', () => {
      expect(Cons.isCons(Cons.parse('(1 2 3)'))).toBe(true);
    });
  });

  describe('setCar', () => {
    it('rewrites the car', () => {
      const c = new Cons(1, Cons.nil);
      c.setCar(99);
      expect(c.car).toBe(99);
    });

    it('returns null', () => {
      expect(new Cons(1, Cons.nil).setCar(99)).toBeNull();
    });
  });

  describe('setCdr', () => {
    it('rewrites the cdr', () => {
      const c = new Cons(1, Cons.nil);
      c.setCdr(99);
      expect(c.cdr).toBe(99);
    });

    it('returns null', () => {
      expect(new Cons(1, Cons.nil).setCdr(99)).toBeNull();
    });
  });

  describe('setCons', () => {
    it('rewrites both car and cdr', () => {
      const c = new Cons(1, 2);
      c.setCons(99, 100);
      expect(c.car).toBe(99);
      expect(c.cdr).toBe(100);
    });

    it('returns this Cons', () => {
      const c = new Cons(1, 2);
      expect(c.setCons(99, 100)).toBe(c);
    });
  });

  describe('toString (instance)', () => {
    it('returns "nil" for nil', () => {
      expect(Cons.nil.toString()).toBe('nil');
    });

    it('returns a single-element list in the form "(N)"', () => {
      expect(new Cons(1, Cons.nil).toString()).toBe('(1)');
    });

    it('returns multi-element lists separated by spaces', () => {
      const c = new Cons(1, new Cons(2, new Cons(3, Cons.nil)));
      expect(c.toString()).toBe('(1 2 3)');
    });

    it('returns improper lists in dot notation', () => {
      expect(new Cons(1, 2).toString()).toBe('(1 . 2)');
    });

    it('Round 4-A: does not quote primitive strings', () => {
      const c = new Cons('a', new Cons('b', Cons.nil));
      expect(c.toString()).toBe('(a b)');
    });

    it('renders nested lists', () => {
      const c = new Cons(1, new Cons(new Cons(2, Cons.nil), Cons.nil));
      expect(c.toString()).toBe('(1 (2))');
    });
  });

  describe('toString (static)', () => {
    it('returns "nil" for nil', () => {
      expect(Cons.toString(Cons.nil)).toBe('nil');
    });

    it('returns the stringified value for a number', () => {
      expect(Cons.toString(42)).toBe('42');
    });

    it('returns a string without quotes', () => {
      expect(Cons.toString('foo')).toBe('foo');
    });

    it('returns the list representation for a Cons', () => {
      expect(Cons.toString(new Cons(1, Cons.nil))).toBe('(1)');
    });
  });
});
