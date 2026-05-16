import { describe, expect, it } from 'vitest';

import { InterpretedSymbol } from '../InterpretedSymbol/index.js';
import { Table } from '../Table/index.js';
import { Cons } from './index.js';

describe('Cons', () => {
  describe('constructor', () => {
    it('引数なしで構築すると car と cdr に nil を設定する', () => {
      const c = new Cons();
      expect(c.car).toBe(Cons.nil);
      expect(c.cdr).toBe(Cons.nil);
    });

    it('car のみ指定すると cdr に nil を設定する', () => {
      const c = new Cons(42);
      expect(c.car).toBe(42);
      expect(c.cdr).toBe(Cons.nil);
    });

    it('car と cdr の両方を指定したとおりに設定する', () => {
      const c = new Cons(1, 2);
      expect(c.car).toBe(1);
      expect(c.cdr).toBe(2);
    });

    it('nil シングルトンは Cons のインスタンスである', () => {
      expect(Cons.nil).toBeInstanceOf(Cons);
    });
  });

  describe('add', () => {
    it('末尾に要素を追加する', () => {
      const c = new Cons(1, Cons.nil);
      c.add(2);
      expect(c.length()).toBe(2);
    });

    it('複数回呼び出すと順に要素が積まれる', () => {
      const c = new Cons(1, Cons.nil);
      c.add(2);
      c.add(3);
      c.add(4);
      expect(c.length()).toBe(4);
      expect(c.nth(4)).toBe(4);
    });

    it('自身を返す', () => {
      const c = new Cons(1, Cons.nil);
      expect(c.add(2)).toBe(c);
    });
  });

  describe('clone', () => {
    it('構造的に等価なコピーを返す', () => {
      const a = new Cons(1, new Cons(2, Cons.nil));
      expect(a.equals(a.clone())).toBe(true);
    });

    it('返り値は別インスタンスである', () => {
      const a = new Cons(1, Cons.nil);
      expect(a.clone()).not.toBe(a);
    });

    it('内部の Cons も再帰的に複製する', () => {
      const inner = new Cons(10, Cons.nil);
      const outer = new Cons(inner, Cons.nil);
      const cloned = outer.clone();
      expect(cloned.car).not.toBe(inner);
    });
  });

  describe('cloneValue (static)', () => {
    it('Cons を渡すと clone を返す', () => {
      const c = new Cons(1, Cons.nil);
      expect(Cons.cloneValue(c)).not.toBe(c);
    });

    it('nil を渡すと nil を返す', () => {
      expect(Cons.cloneValue(Cons.nil)).toBe(Cons.nil);
    });

    it('数値を渡すと同値を返す', () => {
      expect(Cons.cloneValue(42)).toBe(42);
    });

    it('文字列を渡すと同値を返す', () => {
      expect(Cons.cloneValue('foo')).toBe('foo');
    });

    it('シンボルを渡すと同一インスタンスを返す', () => {
      const s = InterpretedSymbol.of('x');
      expect(Cons.cloneValue(s)).toBe(s);
    });

    it('Table を渡すと同一インスタンスを返す', () => {
      const t = new Table();
      expect(Cons.cloneValue(t)).toBe(t);
    });
  });

  describe('equals', () => {
    it('構造的に等しい Cons なら true を返す', () => {
      const a = new Cons(1, new Cons(2, Cons.nil));
      const b = new Cons(1, new Cons(2, Cons.nil));
      expect(a.equals(b)).toBe(true);
    });

    it('同一インスタンス同士なら true を返す', () => {
      const a = new Cons(1, Cons.nil);
      expect(a.equals(a)).toBe(true);
    });

    it('要素が異なれば false を返す', () => {
      const a = new Cons(1, Cons.nil);
      const b = new Cons(2, Cons.nil);
      expect(a.equals(b)).toBe(false);
    });

    it('長さが異なれば false を返す', () => {
      const a = new Cons(1, Cons.nil);
      const b = new Cons(1, new Cons(2, Cons.nil));
      expect(a.equals(b)).toBe(false);
    });

    it('Cons 以外と比較すると false を返す', () => {
      const a = new Cons(1, Cons.nil);
      expect(a.equals(42)).toBe(false);
      expect(a.equals(null)).toBe(false);
    });
  });

  describe('isAtom (static)', () => {
    it('Cons 以外なら true を返す', () => {
      expect(Cons.isAtom(42)).toBe(true);
      expect(Cons.isAtom('foo')).toBe(true);
      expect(Cons.isAtom(Cons.nil)).toBe(true);
    });

    it('Cons なら false を返す', () => {
      expect(Cons.isAtom(new Cons(1, Cons.nil))).toBe(false);
    });
  });

  describe('isCons (static)', () => {
    it('通常 Cons なら true を返す', () => {
      expect(Cons.isCons(new Cons(1, Cons.nil))).toBe(true);
    });

    it('nil シングルトンなら false を返す', () => {
      expect(Cons.isCons(Cons.nil)).toBe(false);
    });

    it('非 Cons なら false を返す', () => {
      expect(Cons.isCons(42)).toBe(false);
      expect(Cons.isCons('foo')).toBe(false);
      expect(Cons.isCons(null)).toBe(false);
    });
  });

  describe('isList (static)', () => {
    it('Cons または nil なら true を返す', () => {
      expect(Cons.isList(Cons.nil)).toBe(true);
      expect(Cons.isList(new Cons(1, Cons.nil))).toBe(true);
    });

    it('非 Cons / 非 nil なら false を返す', () => {
      expect(Cons.isList(42)).toBe(false);
      expect(Cons.isList(null)).toBe(false);
    });
  });

  describe('isNil (static)', () => {
    it('Cons.nil なら true を返す', () => {
      expect(Cons.isNil(Cons.nil)).toBe(true);
    });

    it('Cons.nil 以外なら false を返す', () => {
      expect(Cons.isNil(new Cons(1, Cons.nil))).toBe(false);
      expect(Cons.isNil(null)).toBe(false);
      expect(Cons.isNil(0)).toBe(false);
    });
  });

  describe('isNotCons (static)', () => {
    it('isCons の否定を返す', () => {
      expect(Cons.isNotCons(new Cons(1, Cons.nil))).toBe(false);
      expect(Cons.isNotCons(Cons.nil)).toBe(true);
      expect(Cons.isNotCons(42)).toBe(true);
    });
  });

  describe('isNotList (static)', () => {
    it('isList の否定を返す', () => {
      expect(Cons.isNotList(Cons.nil)).toBe(false);
      expect(Cons.isNotList(42)).toBe(true);
    });
  });

  describe('isNotNil (static)', () => {
    it('isNil の否定を返す', () => {
      expect(Cons.isNotNil(Cons.nil)).toBe(false);
      expect(Cons.isNotNil(42)).toBe(true);
    });
  });

  describe('isNotSymbol (static)', () => {
    it('isSymbol の否定を返す', () => {
      expect(Cons.isNotSymbol(InterpretedSymbol.of('x'))).toBe(false);
      expect(Cons.isNotSymbol('x')).toBe(true);
    });
  });

  describe('isNumber (static)', () => {
    it('プリミティブ数値なら true を返す', () => {
      expect(Cons.isNumber(42)).toBe(true);
      expect(Cons.isNumber(-3.14)).toBe(true);
    });

    it('非数値なら false を返す', () => {
      expect(Cons.isNumber('42')).toBe(false);
      expect(Cons.isNumber(null)).toBe(false);
    });
  });

  describe('isString (static)', () => {
    it('プリミティブ文字列なら true を返す', () => {
      expect(Cons.isString('foo')).toBe(true);
      expect(Cons.isString('')).toBe(true);
    });

    it('非文字列なら false を返す', () => {
      expect(Cons.isString(42)).toBe(false);
      expect(Cons.isString(null)).toBe(false);
    });
  });

  describe('isSymbol (static)', () => {
    it('InterpretedSymbol なら true を返す', () => {
      expect(Cons.isSymbol(InterpretedSymbol.of('x'))).toBe(true);
    });

    it('非シンボルなら false を返す', () => {
      expect(Cons.isSymbol('x')).toBe(false);
      expect(Cons.isSymbol(42)).toBe(false);
    });
  });

  describe('isTable (static)', () => {
    it('Table なら true を返す', () => {
      expect(Cons.isTable(new Table())).toBe(true);
    });

    it('非 Table なら false を返す', () => {
      expect(Cons.isTable(Cons.nil)).toBe(false);
      expect(Cons.isTable(42)).toBe(false);
    });
  });

  describe('last', () => {
    it('単一要素の場合は自身を返す', () => {
      const c = new Cons(1, Cons.nil);
      expect(c.last()).toBe(c);
    });

    it('複数要素の場合は最後の Cons セルを返す', () => {
      const c = new Cons(1, new Cons(2, new Cons(3, Cons.nil)));
      expect(c.last().car).toBe(3);
    });
  });

  describe('length', () => {
    it('nil の長さは 0 を返す', () => {
      expect(Cons.nil.length()).toBe(0);
    });

    it('1 要素の場合は 1 を返す', () => {
      expect(new Cons(1, Cons.nil).length()).toBe(1);
    });

    it('N 要素の場合は N を返す', () => {
      const c = new Cons(1, new Cons(2, new Cons(3, Cons.nil)));
      expect(c.length()).toBe(3);
    });
  });

  describe('loop', () => {
    it('Loop インスタンスを返す', () => {
      const c = new Cons(1, Cons.nil);
      expect(c.loop().hasNext()).toBe(true);
    });

    it('for..of で全要素を順に走査する', () => {
      const c = new Cons(1, new Cons(2, new Cons(3, Cons.nil)));
      expect([...c.loop()]).toEqual([1, 2, 3]);
    });
  });

  describe('nconc', () => {
    it('別 Cons を末尾に連結する', () => {
      const a = new Cons(1, Cons.nil);
      const b = new Cons(2, Cons.nil);
      a.nconc(b);
      expect(a.length()).toBe(2);
    });

    it('破壊的に元の Cons の cdr を書き換える', () => {
      const a = new Cons(1, Cons.nil);
      const b = new Cons(2, Cons.nil);
      a.nconc(b);
      expect(a.cdr).toBe(b);
    });
  });

  describe('nth', () => {
    it('1-origin で要素を返す', () => {
      const c = new Cons(10, new Cons(20, new Cons(30, Cons.nil)));
      expect(c.nth(1)).toBe(10);
      expect(c.nth(3)).toBe(30);
    });

    it('範囲外なら nil を返す', () => {
      const c = new Cons(10, Cons.nil);
      expect(c.nth(2)).toBe(Cons.nil);
    });

    it('0 以下なら nil を返す', () => {
      const c = new Cons(10, Cons.nil);
      expect(c.nth(0)).toBe(Cons.nil);
      expect(c.nth(-1)).toBe(Cons.nil);
    });
  });

  describe('parse (static)', () => {
    it('文字列をパースして Cons を返す', () => {
      expect(Cons.isCons(Cons.parse('(1 2 3)'))).toBe(true);
    });
  });

  describe('setCar', () => {
    it('car を書き換える', () => {
      const c = new Cons(1, Cons.nil);
      c.setCar(99);
      expect(c.car).toBe(99);
    });

    it('null を返す', () => {
      expect(new Cons(1, Cons.nil).setCar(99)).toBeNull();
    });
  });

  describe('setCdr', () => {
    it('cdr を書き換える', () => {
      const c = new Cons(1, Cons.nil);
      c.setCdr(99);
      expect(c.cdr).toBe(99);
    });

    it('null を返す', () => {
      expect(new Cons(1, Cons.nil).setCdr(99)).toBeNull();
    });
  });

  describe('setCons', () => {
    it('car と cdr の両方を書き換える', () => {
      const c = new Cons(1, 2);
      c.setCons(99, 100);
      expect(c.car).toBe(99);
      expect(c.cdr).toBe(100);
    });

    it('自身を返す', () => {
      const c = new Cons(1, 2);
      expect(c.setCons(99, 100)).toBe(c);
    });
  });

  describe('toString (instance)', () => {
    it('nil は "nil" を返す', () => {
      expect(Cons.nil.toString()).toBe('nil');
    });

    it('単一要素リストを "(N)" の形で返す', () => {
      expect(new Cons(1, Cons.nil).toString()).toBe('(1)');
    });

    it('複数要素リストを空白区切りで返す', () => {
      const c = new Cons(1, new Cons(2, new Cons(3, Cons.nil)));
      expect(c.toString()).toBe('(1 2 3)');
    });

    it('improper list はドット記法で返す', () => {
      expect(new Cons(1, 2).toString()).toBe('(1 . 2)');
    });

    it('Round 4-A: プリミティブ文字列はクォートしない', () => {
      const c = new Cons('a', new Cons('b', Cons.nil));
      expect(c.toString()).toBe('(a b)');
    });

    it('ネストしたリストを表示する', () => {
      const c = new Cons(1, new Cons(new Cons(2, Cons.nil), Cons.nil));
      expect(c.toString()).toBe('(1 (2))');
    });
  });

  describe('toString (static)', () => {
    it('nil なら "nil" を返す', () => {
      expect(Cons.toString(Cons.nil)).toBe('nil');
    });

    it('数値なら文字列化して返す', () => {
      expect(Cons.toString(42)).toBe('42');
    });

    it('文字列ならクォート無しで返す', () => {
      expect(Cons.toString('foo')).toBe('foo');
    });

    it('Cons ならリスト表示を返す', () => {
      expect(Cons.toString(new Cons(1, Cons.nil))).toBe('(1)');
    });
  });
});
