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

    it('空文字列でも構築可能', () => {
      const s = new InterpretedSymbol('');
      expect(s.name).toBe('');
    });

    it('日本語の name も保持', () => {
      const s = new InterpretedSymbol('シンボル');
      expect(s.name).toBe('シンボル');
    });
  });

  describe('compareTo', () => {
    it('同じ印字名なら 0 を返す', () => {
      const a = InterpretedSymbol.of('hello');
      const b = InterpretedSymbol.of('hello');
      expect(a.compareTo(b)).toBe(0);
    });

    it('Round 4-D 修正後: NaN を返さない', () => {
      const a = InterpretedSymbol.of('abc');
      const b = InterpretedSymbol.of('xyz');
      expect(Number.isNaN(a.compareTo(b))).toBe(false);
    });

    it('first char が小さい方は負を返す', () => {
      const a = InterpretedSymbol.of('abc');
      const b = InterpretedSymbol.of('xyz');
      expect(a.compareTo(b) < 0).toBe(true);
    });

    it('first char が大きい方は正を返す', () => {
      const a = InterpretedSymbol.of('xyz');
      const b = InterpretedSymbol.of('abc');
      expect(a.compareTo(b) > 0).toBe(true);
    });
  });

  describe('equals', () => {
    it('intern 経由で同じ名前なら true', () => {
      const a = InterpretedSymbol.of('x');
      const b = InterpretedSymbol.of('x');
      expect(a.equals(b)).toBe(true);
    });

    it('同一インスタンスは true', () => {
      const a = InterpretedSymbol.of('x');
      expect(a.equals(a)).toBe(true);
    });

    it('異なる Symbol は false', () => {
      const a = InterpretedSymbol.of('x');
      const b = InterpretedSymbol.of('y');
      expect(a.equals(b)).toBe(false);
    });

    it('非 Symbol との比較は false', () => {
      const a = InterpretedSymbol.of('x');
      expect(a.equals('x')).toBe(false);
      expect(a.equals(42)).toBe(false);
      expect(a.equals(null)).toBe(false);
    });

    it('new InterpretedSymbol で作った別インスタンスは false (intern していない)', () => {
      const a = new InterpretedSymbol('x');
      const b = new InterpretedSymbol('x');
      expect(a.equals(b)).toBe(false); // identity ベースなので不等
    });
  });

  describe('of (static)', () => {
    it('同じ名前なら同一インスタンス (intern)', () => {
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

    it('空文字列も intern される', () => {
      const a = InterpretedSymbol.of('');
      const b = InterpretedSymbol.of('');
      expect(a).toBe(b);
    });

    it('返り値の name は入力と同じ', () => {
      const a = InterpretedSymbol.of('xyz');
      expect(a.name).toBe('xyz');
    });
  });

  describe('toString', () => {
    it('印字名を返す', () => {
      const s = InterpretedSymbol.of('foo');
      expect(s.toString()).toBe('foo');
    });

    it('空の name は空文字列', () => {
      const s = InterpretedSymbol.of('');
      expect(s.toString()).toBe('');
    });

    it('日本語の name もそのまま返す', () => {
      const s = InterpretedSymbol.of('シンボル');
      expect(s.toString()).toBe('シンボル');
    });
  });
});
