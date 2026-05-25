import { describe, expect, it } from 'vitest';

import { InterpretedSymbol } from './index.js';

describe('InterpretedSymbol', () => {
  describe('constructor', () => {
    it('sets name to "null" when constructed without arguments', () => {
      expect(new InterpretedSymbol().name).toBe('null');
    });

    it('sets name to the given string', () => {
      expect(new InterpretedSymbol('foo').name).toBe('foo');
    });

    it('can be constructed with an empty string', () => {
      expect(new InterpretedSymbol('').name).toBe('');
    });

    it('preserves a Japanese name as-is', () => {
      expect(new InterpretedSymbol('シンボル').name).toBe('シンボル');
    });
  });

  describe('compareTo', () => {
    it('returns 0 for symbols with the same printed name', () => {
      const a = InterpretedSymbol.of('hello');
      const b = InterpretedSymbol.of('hello');
      expect(a.compareTo(b)).toBe(0);
    });

    it('does not return NaN', () => {
      const a = InterpretedSymbol.of('abc');
      const b = InterpretedSymbol.of('xyz');
      expect(Number.isNaN(a.compareTo(b))).toBe(false);
    });

    it('returns a negative value when the first char is smaller', () => {
      const a = InterpretedSymbol.of('abc');
      const b = InterpretedSymbol.of('xyz');
      expect(a.compareTo(b) < 0).toBe(true);
    });

    it('returns a positive value when the first char is larger', () => {
      const a = InterpretedSymbol.of('xyz');
      const b = InterpretedSymbol.of('abc');
      expect(a.compareTo(b) > 0).toBe(true);
    });
  });

  describe('equals', () => {
    it('returns true for symbols interned with the same name', () => {
      const a = InterpretedSymbol.of('x');
      const b = InterpretedSymbol.of('x');
      expect(a.equals(b)).toBe(true);
    });

    it('returns true for the same instance', () => {
      const a = InterpretedSymbol.of('x');
      expect(a.equals(a)).toBe(true);
    });

    it('returns false for different symbols', () => {
      const a = InterpretedSymbol.of('x');
      const b = InterpretedSymbol.of('y');
      expect(a.equals(b)).toBe(false);
    });

    it('returns false when compared with a non-symbol value', () => {
      const a = InterpretedSymbol.of('x');
      expect(a.equals('x')).toBe(false);
      expect(a.equals(42)).toBe(false);
    });

    it('returns false for separate instances created via new', () => {
      const a = new InterpretedSymbol('x');
      const b = new InterpretedSymbol('x');
      expect(a.equals(b)).toBe(false);
    });
  });

  describe('table (static getter)', () => {
    it('returns a Table instance', () => {
      expect(InterpretedSymbol.table).toBeDefined();
    });

    it('returns the same Table on repeated access (lazy initialization)', () => {
      const t1 = InterpretedSymbol.table;
      const t2 = InterpretedSymbol.table;
      expect(t1).toBe(t2);
    });
  });

  describe('of (static)', () => {
    it('returns the same instance for the same name', () => {
      expect(InterpretedSymbol.of('hello')).toBe(InterpretedSymbol.of('hello'));
    });

    it('returns different instances for different names', () => {
      expect(InterpretedSymbol.of('foo')).not.toBe(InterpretedSymbol.of('bar'));
    });

    it('preserves identity across multiple calls', () => {
      const a = InterpretedSymbol.of('x');
      const b = InterpretedSymbol.of('x');
      const c = InterpretedSymbol.of('x');
      expect(a).toBe(b);
      expect(b).toBe(c);
    });

    it('interns the empty string as well', () => {
      expect(InterpretedSymbol.of('')).toBe(InterpretedSymbol.of(''));
    });

    it('returns a value whose name matches the input', () => {
      expect(InterpretedSymbol.of('xyz').name).toBe('xyz');
    });
  });

  describe('toString', () => {
    it('returns the printed name', () => {
      expect(InterpretedSymbol.of('foo').toString()).toBe('foo');
    });

    it('returns an empty string when the name is empty', () => {
      expect(InterpretedSymbol.of('').toString()).toBe('');
    });
  });
});
