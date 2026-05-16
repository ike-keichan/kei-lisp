import { describe, expect, it } from 'vitest';

import { InterpretedSymbol } from '../InterpretedSymbol/index.js';
import { Table } from './index.js';

describe('Table', () => {
  describe('constructor', () => {
    it('引数なしで root', () => {
      const t = new Table();
      expect(t.isRoot()).toBe(true);
      expect(t.source).toBeNull();
    });

    it('null を渡しても root', () => {
      const t = new Table(null);
      expect(t.isRoot()).toBe(true);
    });

    it('親テーブルを渡すと非 root', () => {
      const parent = new Table();
      const child = new Table(parent);
      expect(child.isRoot()).toBe(false);
      expect(child.source).toBe(parent);
    });

    it('Map を継承している (基底操作が動く)', () => {
      const t = new Table();
      expect(t.size).toBe(0);
    });
  });

  describe('clone', () => {
    it('Round 4-D: クラッシュせず複製できる', () => {
      const t = new Table();
      const sym = InterpretedSymbol.of('x');
      t.set(sym, 42);
      const cloned = t.clone();
      expect(cloned.get(sym)).toBe(42);
    });

    it('別インスタンスを返す', () => {
      const t = new Table();
      const cloned = t.clone();
      expect(cloned).not.toBe(t);
    });

    it('clone 元の source を親として持つ', () => {
      const t = new Table();
      t.set(InterpretedSymbol.of('a'), 1);
      const cloned = t.clone();
      expect(cloned.source).toBe(t);
    });
  });

  describe('equals', () => {
    it('Map.prototype.equals が無いため呼ぶと TypeError (原本踏襲)', () => {
      const a = new Table();
      const b = new Table();
      expect(() => a.equals(b)).toThrow();
    });
  });

  describe('get', () => {
    it('set した値を取得', () => {
      const t = new Table();
      const sym = InterpretedSymbol.of('x');
      t.set(sym, 42);
      expect(t.get(sym)).toBe(42);
    });

    it('未登録なら null (root)', () => {
      const t = new Table();
      expect(t.get(InterpretedSymbol.of('missing'))).toBeNull();
    });

    it('親から取得 (非 root の場合)', () => {
      const parent = new Table();
      const child = new Table(parent);
      const sym = InterpretedSymbol.of('x');
      parent.set(sym, 99);
      expect(child.get(sym)).toBe(99);
    });

    it('shadowing: 子で定義していれば子のものが優先', () => {
      const parent = new Table();
      const child = new Table(parent);
      const sym = InterpretedSymbol.of('x');
      parent.set(sym, 1);
      child.set(sym, 2);
      expect(child.get(sym)).toBe(2);
    });
  });

  describe('has', () => {
    it('未登録は false', () => {
      const t = new Table();
      expect(t.has(InterpretedSymbol.of('x'))).toBe(false);
    });

    it('set すると true', () => {
      const t = new Table();
      const sym = InterpretedSymbol.of('x');
      t.set(sym, 1);
      expect(t.has(sym)).toBe(true);
    });

    it('親に登録されていれば子でも true', () => {
      const parent = new Table();
      const child = new Table(parent);
      const sym = InterpretedSymbol.of('x');
      parent.set(sym, 1);
      expect(child.has(sym)).toBe(true);
    });
  });

  describe('isRoot', () => {
    it('root テーブルなら true', () => {
      const t = new Table();
      expect(t.isRoot()).toBe(true);
    });

    it('親があれば false', () => {
      const child = new Table(new Table());
      expect(child.isRoot()).toBe(false);
    });
  });

  describe('setIfExit (Round 4-J-3 修正後: Common Lisp setq shadowing)', () => {
    it('現スコープに束縛があれば現スコープを更新して終了', () => {
      const t = new Table();
      const sym = InterpretedSymbol.of('x');
      t.set(sym, 1);
      t.setIfExit(sym, 999);
      expect(t.get(sym)).toBe(999);
    });

    it('現スコープに無ければ親に再帰', () => {
      const parent = new Table();
      const child = new Table(parent);
      const sym = InterpretedSymbol.of('x');
      parent.set(sym, 10);
      child.setIfExit(sym, 999);
      expect(parent.get(sym)).toBe(999);
    });

    it('shadowing: 内側で束縛があれば内側のみ更新、外側は不変', () => {
      const outer = new Table();
      const inner = new Table(outer);
      const sym = InterpretedSymbol.of('x');
      outer.set(sym, 1);
      inner.set(sym, 2);
      inner.setIfExit(sym, 999);
      expect(inner.get(sym)).toBe(999);
      expect(outer.get(sym)).toBe(1);
    });

    it('どこにも束縛が無ければ null を返す', () => {
      const t = new Table();
      const sym = InterpretedSymbol.of('undefined');
      expect(t.setIfExit(sym, 999)).toBeNull();
    });

    it('代入した値を返す (現スコープで成功時)', () => {
      const t = new Table();
      const sym = InterpretedSymbol.of('x');
      t.set(sym, 1);
      expect(t.setIfExit(sym, 99)).toBe(99);
    });
  });

  describe('setRoot', () => {
    it('true で root 化', () => {
      const t = new Table(new Table());
      expect(t.isRoot()).toBe(false);
      t.setRoot(true);
      expect(t.isRoot()).toBe(true);
    });

    it('false で非 root 化', () => {
      const t = new Table();
      expect(t.isRoot()).toBe(true);
      t.setRoot(false);
      expect(t.isRoot()).toBe(false);
    });

    it('null を返す', () => {
      const t = new Table();
      expect(t.setRoot(true)).toBeNull();
    });
  });

  describe('setSource', () => {
    it('source を設定する', () => {
      const t = new Table();
      const parent = new Table();
      t.setSource(parent);
      expect(t.source).toBe(parent);
    });

    it('null を渡すと source が null に', () => {
      const t = new Table(new Table());
      t.setSource(null);
      expect(t.source).toBeNull();
    });

    it('null を返す', () => {
      const t = new Table();
      expect(t.setSource(null)).toBeNull();
    });
  });

  describe('toString (Round 5-1 で追加)', () => {
    it('"#<Environment>" を返す', () => {
      const t = new Table();
      expect(t.toString()).toBe('#<Environment>');
    });

    it('入れ子テーブルでも同じ表示', () => {
      const child = new Table(new Table());
      expect(child.toString()).toBe('#<Environment>');
    });
  });
});
