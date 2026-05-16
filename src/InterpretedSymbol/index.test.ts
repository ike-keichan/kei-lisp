import { describe, expect, it } from 'vitest';

import { InterpretedSymbol } from './index.js';

describe('InterpretedSymbol', () => {
  describe('constructor', () => {
    it('引数なしで name は "null"', () => {
      const s = new InterpretedSymbol();
      expect(s.name).toBe('null');
    });

    it('name 引数で設定される', () => {
      const s = new InterpretedSymbol('foo');
      expect(s.name).toBe('foo');
    });
  });

  describe('of (intern)', () => {
    it('同じ名前なら同一インスタンスを返す (interning)', () => {
      const a = InterpretedSymbol.of('hello');
      const b = InterpretedSymbol.of('hello');
      expect(a).toBe(b);
    });

    it('異なる名前なら別インスタンス', () => {
      const a = InterpretedSymbol.of('foo');
      const b = InterpretedSymbol.of('bar');
      expect(a).not.toBe(b);
    });

    it('多重 intern でも同一性が保たれる', () => {
      const a = InterpretedSymbol.of('x');
      const b = InterpretedSymbol.of('x');
      const c = InterpretedSymbol.of('x');
      expect(a).toBe(b);
      expect(b).toBe(c);
    });
  });

  describe('equals', () => {
    it('intern 経由なら同一性で等しい', () => {
      const a = InterpretedSymbol.of('x');
      const b = InterpretedSymbol.of('x');
      expect(a.equals(b)).toBe(true);
    });

    it('違うシンボルは不等', () => {
      const a = InterpretedSymbol.of('x');
      const b = InterpretedSymbol.of('y');
      expect(a.equals(b)).toBe(false);
    });

    it('非 Symbol との比較は false', () => {
      const a = InterpretedSymbol.of('x');
      expect(a.equals('x')).toBe(false);
      expect(a.equals(null)).toBe(false);
    });
  });

  describe('compareTo (Round 4-D bug fix 後)', () => {
    it('呼び出して NaN を返さない (バグ修正済み)', () => {
      const a = InterpretedSymbol.of('abc');
      const b = InterpretedSymbol.of('xyz');
      const result = a.compareTo(b);
      expect(Number.isNaN(result)).toBe(false);
    });

    it('同じ印字名同士は 0', () => {
      const a = InterpretedSymbol.of('hello');
      const b = InterpretedSymbol.of('hello');
      expect(a.compareTo(b)).toBe(0);
    });

    it('first char が異なれば符号が逆になる', () => {
      const a = InterpretedSymbol.of('abc');
      const b = InterpretedSymbol.of('xyz');
      // 'a' < 'x' なので a.compareTo(b) は負、b.compareTo(a) は正
      expect(a.compareTo(b) < 0).toBe(true);
      expect(b.compareTo(a) > 0).toBe(true);
    });
  });

  describe('toString', () => {
    it('印字名を返す', () => {
      const s = InterpretedSymbol.of('foo');
      expect(s.toString()).toBe('foo');
    });
  });
});
