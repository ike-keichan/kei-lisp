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

    it('car のみ指定で cdr は nil', () => {
      const c = new Cons(42);
      expect(c.car).toBe(42);
      expect(c.cdr).toBe(Cons.nil);
    });

    it('car/cdr ともに指定', () => {
      const c = new Cons(1, 2);
      expect(c.car).toBe(1);
      expect(c.cdr).toBe(2);
    });

    it('nil シンボルは静的シングルトン', () => {
      expect(Cons.nil).toBe(Cons.nil);
      expect(Cons.nil).toBeInstanceOf(Cons);
    });
  });

  describe('add', () => {
    it('末尾に要素を加える', () => {
      const c = new Cons(1, Cons.nil);
      c.add(2);
      expect(c.length()).toBe(2);
      expect(c.nth(2)).toBe(2);
    });

    it('複数回 add すると順に積まれる', () => {
      const c = new Cons(1, Cons.nil);
      c.add(2);
      c.add(3);
      c.add(4);
      expect(c.length()).toBe(4);
      expect(c.nth(4)).toBe(4);
    });

    it('add は自身を返す (チェイン可能)', () => {
      const c = new Cons(1, Cons.nil);
      expect(c.add(2)).toBe(c);
    });
  });

  describe('clone', () => {
    it('構造的に等価なコピーを返す', () => {
      const a = new Cons(1, new Cons(2, Cons.nil));
      const b = a.clone();
      expect(a.equals(b)).toBe(true);
    });

    it('別インスタンス (参照非同一)', () => {
      const a = new Cons(1, new Cons(2, Cons.nil));
      const b = a.clone();
      expect(a).not.toBe(b);
      expect(a.cdr).not.toBe(b.cdr);
    });

    it('深く再帰的にクローンされる', () => {
      const inner = new Cons(10, Cons.nil);
      const outer = new Cons(inner, Cons.nil);
      const cloned = outer.clone();
      expect(cloned.car).not.toBe(inner);
      expect((cloned.car as Cons).car).toBe(10);
    });
  });

  describe('cloneValue (static)', () => {
    it('Cons を渡すと clone を返す', () => {
      const c = new Cons(1, Cons.nil);
      const result = Cons.cloneValue(c);
      expect(result).not.toBe(c);
      expect((result as Cons).equals(c)).toBe(true);
    });

    it('nil を渡すと nil を返す', () => {
      expect(Cons.cloneValue(Cons.nil)).toBe(Cons.nil);
    });

    it('number を渡すと同値を返す', () => {
      expect(Cons.cloneValue(42)).toBe(42);
    });

    it('string を渡すと同値を返す', () => {
      expect(Cons.cloneValue('foo')).toBe('foo');
    });

    it('Symbol を渡すと同一インスタンスを返す (intern 性質)', () => {
      const s = InterpretedSymbol.of('x');
      expect(Cons.cloneValue(s)).toBe(s);
    });

    it('Table を渡すと同一インスタンスを返す (環境は共有)', () => {
      const t = new Table();
      expect(Cons.cloneValue(t)).toBe(t);
    });
  });

  describe('equals', () => {
    it('構造的に等しい Cons は true', () => {
      const a = new Cons(1, new Cons(2, Cons.nil));
      const b = new Cons(1, new Cons(2, Cons.nil));
      expect(a.equals(b)).toBe(true);
    });

    it('同一インスタンスは true', () => {
      const a = new Cons(1, Cons.nil);
      expect(a.equals(a)).toBe(true);
    });

    it('要素が異なれば false', () => {
      const a = new Cons(1, new Cons(2, Cons.nil));
      const b = new Cons(1, new Cons(3, Cons.nil));
      expect(a.equals(b)).toBe(false);
    });

    it('長さが異なれば false', () => {
      const a = new Cons(1, Cons.nil);
      const b = new Cons(1, new Cons(2, Cons.nil));
      expect(a.equals(b)).toBe(false);
    });

    it('Cons 以外との比較は false', () => {
      expect(new Cons(1, Cons.nil).equals(42)).toBe(false);
      expect(new Cons(1, Cons.nil).equals('foo')).toBe(false);
      expect(new Cons(1, Cons.nil).equals(null)).toBe(false);
    });
  });

  describe('isAtom (static)', () => {
    it('Cons 以外は true', () => {
      expect(Cons.isAtom(42)).toBe(true);
      expect(Cons.isAtom('foo')).toBe(true);
      expect(Cons.isAtom(Cons.nil)).toBe(true);
      expect(Cons.isAtom(null)).toBe(true);
    });

    it('Cons は false', () => {
      expect(Cons.isAtom(new Cons(1, Cons.nil))).toBe(false);
    });
  });

  describe('isCons (static)', () => {
    it('通常 Cons は true', () => {
      expect(Cons.isCons(new Cons(1, Cons.nil))).toBe(true);
      expect(Cons.isCons(new Cons())).toBe(true);
    });

    it('nil は false', () => {
      expect(Cons.isCons(Cons.nil)).toBe(false);
    });

    it('非 Cons は false', () => {
      expect(Cons.isCons(42)).toBe(false);
      expect(Cons.isCons('foo')).toBe(false);
      expect(Cons.isCons(null)).toBe(false);
    });
  });

  describe('isList (static)', () => {
    it('Cons または nil は true', () => {
      expect(Cons.isList(Cons.nil)).toBe(true);
      expect(Cons.isList(new Cons(1, Cons.nil))).toBe(true);
    });

    it('非 Cons / 非 nil は false', () => {
      expect(Cons.isList(42)).toBe(false);
      expect(Cons.isList('foo')).toBe(false);
      expect(Cons.isList(null)).toBe(false);
    });
  });

  describe('isNil (static)', () => {
    it('Cons.nil のみ true', () => {
      expect(Cons.isNil(Cons.nil)).toBe(true);
    });

    it('Cons.nil 以外は false', () => {
      expect(Cons.isNil(new Cons(1, Cons.nil))).toBe(false);
      expect(Cons.isNil(null)).toBe(false);
      expect(Cons.isNil(0)).toBe(false);
      expect(Cons.isNil('')).toBe(false);
    });
  });

  describe('isNotCons (static)', () => {
    it('isCons の否定', () => {
      expect(Cons.isNotCons(new Cons(1, Cons.nil))).toBe(false);
      expect(Cons.isNotCons(Cons.nil)).toBe(true);
      expect(Cons.isNotCons(42)).toBe(true);
    });
  });

  describe('isNotList (static)', () => {
    it('isList の否定', () => {
      expect(Cons.isNotList(Cons.nil)).toBe(false);
      expect(Cons.isNotList(new Cons(1, Cons.nil))).toBe(false);
      expect(Cons.isNotList(42)).toBe(true);
    });
  });

  describe('isNotNil (static)', () => {
    it('isNil の否定', () => {
      expect(Cons.isNotNil(Cons.nil)).toBe(false);
      expect(Cons.isNotNil(new Cons(1, Cons.nil))).toBe(true);
      expect(Cons.isNotNil(42)).toBe(true);
    });
  });

  describe('isNotSymbol (static)', () => {
    it('isSymbol の否定', () => {
      expect(Cons.isNotSymbol(InterpretedSymbol.of('x'))).toBe(false);
      expect(Cons.isNotSymbol('x')).toBe(true);
      expect(Cons.isNotSymbol(42)).toBe(true);
    });
  });

  describe('isNumber (static)', () => {
    it('primitive number は true', () => {
      expect(Cons.isNumber(42)).toBe(true);
      expect(Cons.isNumber(0)).toBe(true);
      expect(Cons.isNumber(-3.14)).toBe(true);
      expect(Cons.isNumber(Number.NaN)).toBe(true);
      expect(Cons.isNumber(Infinity)).toBe(true);
    });

    it('非 number は false', () => {
      expect(Cons.isNumber('42')).toBe(false);
      expect(Cons.isNumber(null)).toBe(false);
      expect(Cons.isNumber(Cons.nil)).toBe(false);
    });
  });

  describe('isString (static)', () => {
    it('primitive string は true', () => {
      expect(Cons.isString('foo')).toBe(true);
      expect(Cons.isString('')).toBe(true);
      expect(Cons.isString('日本語')).toBe(true);
    });

    it('非 string は false', () => {
      expect(Cons.isString(42)).toBe(false);
      expect(Cons.isString(null)).toBe(false);
      expect(Cons.isString(Cons.nil)).toBe(false);
    });
  });

  describe('isSymbol (static)', () => {
    it('InterpretedSymbol は true', () => {
      expect(Cons.isSymbol(InterpretedSymbol.of('x'))).toBe(true);
      expect(Cons.isSymbol(InterpretedSymbol.of(''))).toBe(true);
    });

    it('非 Symbol は false', () => {
      expect(Cons.isSymbol('x')).toBe(false);
      expect(Cons.isSymbol(42)).toBe(false);
      expect(Cons.isSymbol(null)).toBe(false);
    });
  });

  describe('isTable (static)', () => {
    it('Table は true', () => {
      expect(Cons.isTable(new Table())).toBe(true);
      expect(Cons.isTable(new Table(new Table()))).toBe(true);
    });

    it('非 Table は false', () => {
      expect(Cons.isTable(Cons.nil)).toBe(false);
      expect(Cons.isTable(42)).toBe(false);
      expect(Cons.isTable('foo')).toBe(false);
    });
  });

  describe('last', () => {
    it('単一要素なら自身を返す', () => {
      const c = new Cons(1, Cons.nil);
      expect(c.last()).toBe(c);
    });

    it('複数要素なら最後の Cons セルを返す', () => {
      const c = new Cons(1, new Cons(2, new Cons(3, Cons.nil)));
      expect(c.last().car).toBe(3);
    });
  });

  describe('length', () => {
    it('空 (nil) の長さは 0', () => {
      expect(Cons.nil.length()).toBe(0);
    });

    it('1 要素は 1', () => {
      expect(new Cons(1, Cons.nil).length()).toBe(1);
    });

    it('N 要素は N', () => {
      const c = new Cons(1, new Cons(2, new Cons(3, Cons.nil)));
      expect(c.length()).toBe(3);
    });
  });

  describe('loop', () => {
    it('Loop インスタンスを返す', () => {
      const c = new Cons(1, new Cons(2, Cons.nil));
      const loop = c.loop();
      expect(loop.hasNext()).toBe(true);
    });

    it('for..of で全要素走査可能', () => {
      const c = new Cons(1, new Cons(2, new Cons(3, Cons.nil)));
      const collected = [...c.loop()];
      expect(collected).toEqual([1, 2, 3]);
    });
  });

  describe('nconc', () => {
    it('別 Cons を末尾に連結する', () => {
      const a = new Cons(1, Cons.nil);
      const b = new Cons(2, Cons.nil);
      a.nconc(b);
      expect(a.length()).toBe(2);
      expect(a.nth(2)).toBe(2);
    });

    it('破壊的: 元の Cons の cdr が変わる', () => {
      const a = new Cons(1, Cons.nil);
      const b = new Cons(2, Cons.nil);
      a.nconc(b);
      expect(a.cdr).toBe(b);
    });
  });

  describe('nth', () => {
    it('1-origin で要素取得 (1番目)', () => {
      const c = new Cons(10, new Cons(20, new Cons(30, Cons.nil)));
      expect(c.nth(1)).toBe(10);
    });

    it('1-origin で要素取得 (2 番目以降)', () => {
      const c = new Cons(10, new Cons(20, new Cons(30, Cons.nil)));
      expect(c.nth(2)).toBe(20);
      expect(c.nth(3)).toBe(30);
    });

    it('範囲外 (n > length) は nil', () => {
      const c = new Cons(10, new Cons(20, new Cons(30, Cons.nil)));
      expect(c.nth(4)).toBe(Cons.nil);
      expect(c.nth(100)).toBe(Cons.nil);
    });

    it('0 以下は nil', () => {
      const c = new Cons(10, new Cons(20, new Cons(30, Cons.nil)));
      expect(c.nth(0)).toBe(Cons.nil);
      expect(c.nth(-1)).toBe(Cons.nil);
    });
  });

  describe('parse (static)', () => {
    it('文字列を Cons に変換できる', () => {
      const result = Cons.parse('(1 2 3)');
      expect(Cons.isCons(result)).toBe(true);
    });
  });

  describe('setCar', () => {
    it('car を書き換える', () => {
      const c = new Cons(1, Cons.nil);
      c.setCar(99);
      expect(c.car).toBe(99);
    });

    it('null を返す', () => {
      const c = new Cons(1, Cons.nil);
      expect(c.setCar(99)).toBeNull();
    });
  });

  describe('setCdr', () => {
    it('cdr を書き換える', () => {
      const c = new Cons(1, Cons.nil);
      c.setCdr(99);
      expect(c.cdr).toBe(99);
    });

    it('null を返す', () => {
      const c = new Cons(1, Cons.nil);
      expect(c.setCdr(99)).toBeNull();
    });
  });

  describe('setCons', () => {
    it('car/cdr 両方を書き換える', () => {
      const c = new Cons(1, 2);
      c.setCons(99, 100);
      expect(c.car).toBe(99);
      expect(c.cdr).toBe(100);
    });

    it('自身を返す (チェイン可能)', () => {
      const c = new Cons(1, 2);
      expect(c.setCons(99, 100)).toBe(c);
    });
  });

  describe('toString (instance)', () => {
    it('nil は "nil"', () => {
      expect(Cons.nil.toString()).toBe('nil');
    });

    it('単一要素リスト', () => {
      expect(new Cons(1, Cons.nil).toString()).toBe('(1)');
    });

    it('複数要素リスト', () => {
      const c = new Cons(1, new Cons(2, new Cons(3, Cons.nil)));
      expect(c.toString()).toBe('(1 2 3)');
    });

    it('improper list (dotted pair)', () => {
      expect(new Cons(1, 2).toString()).toBe('(1 . 2)');
      expect(new Cons(1, new Cons(2, 3)).toString()).toBe('(1 2 . 3)');
    });

    it('Round 4-A: primitive string はクォートされない', () => {
      const c = new Cons('a', new Cons('b', Cons.nil));
      expect(c.toString()).toBe('(a b)');
    });

    it('ネストしたリスト', () => {
      const inner = new Cons(2, Cons.nil);
      const c = new Cons(1, new Cons(inner, Cons.nil));
      expect(c.toString()).toBe('(1 (2))');
    });
  });

  describe('toString (static)', () => {
    it('nil は "nil"', () => {
      expect(Cons.toString(Cons.nil)).toBe('nil');
    });

    it('数値は文字列化', () => {
      expect(Cons.toString(42)).toBe('42');
    });

    it('文字列はクォート無し', () => {
      expect(Cons.toString('foo')).toBe('foo');
    });

    it('Cons はリスト表示', () => {
      expect(Cons.toString(new Cons(1, Cons.nil))).toBe('(1)');
    });
  });
});
