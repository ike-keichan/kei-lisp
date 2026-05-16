import { describe, expect, it } from 'vitest';

import { InterpretedSymbol } from '../InterpretedSymbol/index.js';
import { Table } from '../Table/index.js';
import { Cons } from './index.js';

describe('Cons', () => {
  describe('constructor', () => {
    it('引数なしで car/cdr が nil', () => {
      const c = new Cons();
      expect(c.car).toBe(Cons.nil);
      expect(c.cdr).toBe(Cons.nil);
    });

    it('引数指定で car/cdr が設定される', () => {
      const c = new Cons(1, 2);
      expect(c.car).toBe(1);
      expect(c.cdr).toBe(2);
    });
  });

  describe('type predicates', () => {
    it('isCons: 通常 Cons は true、nil は false', () => {
      expect(Cons.isCons(new Cons(1, Cons.nil))).toBe(true);
      expect(Cons.isCons(Cons.nil)).toBe(false);
      expect(Cons.isCons(42)).toBe(false);
      expect(Cons.isCons('foo')).toBe(false);
      expect(Cons.isCons(null)).toBe(false);
    });

    it('isNil: Cons.nil のみ true', () => {
      expect(Cons.isNil(Cons.nil)).toBe(true);
      expect(Cons.isNil(new Cons(1, Cons.nil))).toBe(false);
      expect(Cons.isNil(null)).toBe(false);
      expect(Cons.isNil(0)).toBe(false);
    });

    it('isList: Cons または nil', () => {
      expect(Cons.isList(Cons.nil)).toBe(true);
      expect(Cons.isList(new Cons(1, Cons.nil))).toBe(true);
      expect(Cons.isList(42)).toBe(false);
    });

    it('isAtom: Cons 以外', () => {
      expect(Cons.isAtom(42)).toBe(true);
      expect(Cons.isAtom('foo')).toBe(true);
      expect(Cons.isAtom(Cons.nil)).toBe(true);
      expect(Cons.isAtom(new Cons(1, Cons.nil))).toBe(false);
    });

    it('isNumber: primitive number のみ true (Round 4-A 修正後)', () => {
      expect(Cons.isNumber(42)).toBe(true);
      expect(Cons.isNumber(0)).toBe(true);
      expect(Cons.isNumber(-1.5)).toBe(true);
      expect(Cons.isNumber('42')).toBe(false);
      expect(Cons.isNumber(null)).toBe(false);
    });

    it('isString: primitive string のみ true (Round 4-A 修正後)', () => {
      expect(Cons.isString('foo')).toBe(true);
      expect(Cons.isString('')).toBe(true);
      expect(Cons.isString(42)).toBe(false);
      expect(Cons.isString(null)).toBe(false);
    });

    it('isSymbol: InterpretedSymbol のみ true', () => {
      expect(Cons.isSymbol(InterpretedSymbol.of('x'))).toBe(true);
      expect(Cons.isSymbol('x')).toBe(false);
      expect(Cons.isSymbol(42)).toBe(false);
    });

    it('isTable: Table のみ true', () => {
      expect(Cons.isTable(new Table())).toBe(true);
      expect(Cons.isTable(Cons.nil)).toBe(false);
      expect(Cons.isTable(42)).toBe(false);
      expect(Cons.isTable('foo')).toBe(false);
    });
  });

  describe('add / length / nth / last', () => {
    it('add で末尾に追加される', () => {
      const c = new Cons(1, Cons.nil);
      c.add(2);
      c.add(3);
      expect(c.length()).toBe(3);
      expect(c.nth(1)).toBe(1);
      expect(c.nth(2)).toBe(2);
      expect(c.nth(3)).toBe(3);
    });

    it('length: 空 Cons は 0、要素分の長さ', () => {
      expect(Cons.nil.length()).toBe(0);
      expect(new Cons(1, Cons.nil).length()).toBe(1);
      const c = new Cons(1, new Cons(2, new Cons(3, Cons.nil)));
      expect(c.length()).toBe(3);
    });

    it('nth: 1-origin で要素取得、範囲外は nil', () => {
      const c = new Cons(10, new Cons(20, new Cons(30, Cons.nil)));
      expect(c.nth(1)).toBe(10);
      expect(c.nth(2)).toBe(20);
      expect(c.nth(3)).toBe(30);
      expect(c.nth(4)).toBe(Cons.nil);
      expect(c.nth(0)).toBe(Cons.nil);
      expect(c.nth(-1)).toBe(Cons.nil);
    });

    it('last: 最後の Cons セルを返す', () => {
      const c = new Cons(1, new Cons(2, new Cons(3, Cons.nil)));
      expect(c.last().car).toBe(3);
    });
  });

  describe('equals', () => {
    it('構造的等価', () => {
      const a = new Cons(1, new Cons(2, Cons.nil));
      const b = new Cons(1, new Cons(2, Cons.nil));
      expect(a.equals(b)).toBe(true);
    });

    it('異なる要素は不等', () => {
      const a = new Cons(1, new Cons(2, Cons.nil));
      const b = new Cons(1, new Cons(3, Cons.nil));
      expect(a.equals(b)).toBe(false);
    });

    it('Cons 以外との比較は false', () => {
      expect(new Cons(1, Cons.nil).equals(42)).toBe(false);
      expect(new Cons(1, Cons.nil).equals(null)).toBe(false);
    });
  });

  describe('toString', () => {
    it('nil → "nil"', () => {
      expect(Cons.nil.toString()).toBe('nil');
    });

    it('(1) → "(1)"', () => {
      expect(new Cons(1, Cons.nil).toString()).toBe('(1)');
    });

    it('(1 2 3) → "(1 2 3)"', () => {
      const c = new Cons(1, new Cons(2, new Cons(3, Cons.nil)));
      expect(c.toString()).toBe('(1 2 3)');
    });

    it('(1 . 2) → "(1 . 2)"', () => {
      expect(new Cons(1, 2).toString()).toBe('(1 . 2)');
    });

    it('文字列の primitive はクォートされない (Round 4-A 後も維持)', () => {
      const c = new Cons('a', new Cons('b', Cons.nil));
      expect(c.toString()).toBe('(a b)');
    });
  });

  describe('clone', () => {
    it('深くコピーされる', () => {
      const a = new Cons(1, new Cons(2, Cons.nil));
      const b = a.clone();
      expect(a.equals(b)).toBe(true);
      expect(a).not.toBe(b);
      expect(a.cdr).not.toBe(b.cdr);
    });
  });
});
