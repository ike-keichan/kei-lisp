import { describe, expect, it } from 'vitest';

import { InterpretedSymbol } from './index.js';

describe('InterpretedSymbol', () => {
  describe('constructor', () => {
    it('引数なしで構築すると name に "null" を設定する', () => {
      expect(new InterpretedSymbol().name).toBe('null');
    });

    it('文字列を渡すと name に設定する', () => {
      expect(new InterpretedSymbol('foo').name).toBe('foo');
    });

    it('空文字列でも構築する', () => {
      expect(new InterpretedSymbol('').name).toBe('');
    });

    it('日本語の name もそのまま保持する', () => {
      expect(new InterpretedSymbol('シンボル').name).toBe('シンボル');
    });
  });

  describe('compareTo', () => {
    it('同じ印字名同士なら 0 を返す', () => {
      const a = InterpretedSymbol.of('hello');
      const b = InterpretedSymbol.of('hello');
      expect(a.compareTo(b)).toBe(0);
    });

    it('Round 4-D: NaN を返さない', () => {
      const a = InterpretedSymbol.of('abc');
      const b = InterpretedSymbol.of('xyz');
      expect(Number.isNaN(a.compareTo(b))).toBe(false);
    });

    it('first char が小さい方は負の値を返す', () => {
      const a = InterpretedSymbol.of('abc');
      const b = InterpretedSymbol.of('xyz');
      expect(a.compareTo(b) < 0).toBe(true);
    });

    it('first char が大きい方は正の値を返す', () => {
      const a = InterpretedSymbol.of('xyz');
      const b = InterpretedSymbol.of('abc');
      expect(a.compareTo(b) > 0).toBe(true);
    });
  });

  describe('equals', () => {
    it('intern 経由で同じ名前なら true を返す', () => {
      const a = InterpretedSymbol.of('x');
      const b = InterpretedSymbol.of('x');
      expect(a.equals(b)).toBe(true);
    });

    it('同一インスタンスなら true を返す', () => {
      const a = InterpretedSymbol.of('x');
      expect(a.equals(a)).toBe(true);
    });

    it('異なるシンボルなら false を返す', () => {
      const a = InterpretedSymbol.of('x');
      const b = InterpretedSymbol.of('y');
      expect(a.equals(b)).toBe(false);
    });

    it('非シンボルとの比較で false を返す', () => {
      const a = InterpretedSymbol.of('x');
      expect(a.equals('x')).toBe(false);
      expect(a.equals(42)).toBe(false);
    });

    it('new で作った別インスタンスなら false を返す', () => {
      const a = new InterpretedSymbol('x');
      const b = new InterpretedSymbol('x');
      expect(a.equals(b)).toBe(false);
    });
  });

  describe('table (static getter)', () => {
    it('Table インスタンスを返す', () => {
      expect(InterpretedSymbol.table).toBeDefined();
    });

    it('複数回アクセスしても同一の Table を返す (lazy 初期化)', () => {
      const t1 = InterpretedSymbol.table;
      const t2 = InterpretedSymbol.table;
      expect(t1).toBe(t2);
    });
  });

  describe('of (static)', () => {
    it('同じ名前なら同一インスタンスを返す', () => {
      expect(InterpretedSymbol.of('hello')).toBe(InterpretedSymbol.of('hello'));
    });

    it('異なる名前なら別インスタンスを返す', () => {
      expect(InterpretedSymbol.of('foo')).not.toBe(InterpretedSymbol.of('bar'));
    });

    it('複数回呼び出しても同一性が保たれる', () => {
      const a = InterpretedSymbol.of('x');
      const b = InterpretedSymbol.of('x');
      const c = InterpretedSymbol.of('x');
      expect(a).toBe(b);
      expect(b).toBe(c);
    });

    it('空文字列でも intern する', () => {
      expect(InterpretedSymbol.of('')).toBe(InterpretedSymbol.of(''));
    });

    it('返り値の name は入力と一致する', () => {
      expect(InterpretedSymbol.of('xyz').name).toBe('xyz');
    });
  });

  describe('toString', () => {
    it('印字名を返す', () => {
      expect(InterpretedSymbol.of('foo').toString()).toBe('foo');
    });

    it('空の name なら空文字列を返す', () => {
      expect(InterpretedSymbol.of('').toString()).toBe('');
    });
  });
});
