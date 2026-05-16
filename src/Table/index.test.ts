import { describe, expect, it } from 'vitest';

import { InterpretedSymbol } from '../InterpretedSymbol/index.js';
import { Table } from './index.js';

describe('Table', () => {
  describe('constructor', () => {
    it('引数なしで構築すると root を true にする', () => {
      const t = new Table();
      expect(t.isRoot()).toBe(true);
      expect(t.source).toBeNull();
    });

    it('null を渡しても root を true にする', () => {
      expect(new Table(null).isRoot()).toBe(true);
    });

    it('親テーブルを渡すと非 root にする', () => {
      const parent = new Table();
      const child = new Table(parent);
      expect(child.isRoot()).toBe(false);
      expect(child.source).toBe(parent);
    });

    it('Map を継承しているので初期 size は 0 を返す', () => {
      expect(new Table().size).toBe(0);
    });
  });

  describe('clone', () => {
    it('Round 4-D: クラッシュせず複製を返す', () => {
      const t = new Table();
      const sym = InterpretedSymbol.of('x');
      t.set(sym, 42);
      expect(t.clone().get(sym)).toBe(42);
    });

    it('別インスタンスを返す', () => {
      const t = new Table();
      expect(t.clone()).not.toBe(t);
    });

    it('clone 元の Table を親として参照する', () => {
      const t = new Table();
      t.set(InterpretedSymbol.of('a'), 1);
      expect(t.clone().source).toBe(t);
    });
  });

  describe('equals', () => {
    it('Map.prototype.equals が存在しないため TypeError を投げる', () => {
      expect(() => new Table().equals(new Table())).toThrow();
    });
  });

  describe('get', () => {
    it('set した値を返す', () => {
      const t = new Table();
      const sym = InterpretedSymbol.of('x');
      t.set(sym, 42);
      expect(t.get(sym)).toBe(42);
    });

    it('未登録キーには null を返す', () => {
      expect(new Table().get(InterpretedSymbol.of('missing'))).toBeNull();
    });

    it('非 root の場合は親から値を返す', () => {
      const parent = new Table();
      const child = new Table(parent);
      const sym = InterpretedSymbol.of('x');
      parent.set(sym, 99);
      expect(child.get(sym)).toBe(99);
    });

    it('子で定義があれば子の値を優先する', () => {
      const parent = new Table();
      const child = new Table(parent);
      const sym = InterpretedSymbol.of('x');
      parent.set(sym, 1);
      child.set(sym, 2);
      expect(child.get(sym)).toBe(2);
    });
  });

  describe('has', () => {
    it('未登録なら false を返す', () => {
      expect(new Table().has(InterpretedSymbol.of('x'))).toBe(false);
    });

    it('set すると true を返す', () => {
      const t = new Table();
      const sym = InterpretedSymbol.of('x');
      t.set(sym, 1);
      expect(t.has(sym)).toBe(true);
    });

    it('親に登録があれば子でも true を返す', () => {
      const parent = new Table();
      const child = new Table(parent);
      const sym = InterpretedSymbol.of('x');
      parent.set(sym, 1);
      expect(child.has(sym)).toBe(true);
    });
  });

  describe('isRoot', () => {
    it('root テーブルなら true を返す', () => {
      expect(new Table().isRoot()).toBe(true);
    });

    it('親がある場合は false を返す', () => {
      expect(new Table(new Table()).isRoot()).toBe(false);
    });
  });

  describe('setIfExit', () => {
    it('現スコープに束縛があれば現スコープを更新して終了する', () => {
      const t = new Table();
      const sym = InterpretedSymbol.of('x');
      t.set(sym, 1);
      t.setIfExit(sym, 999);
      expect(t.get(sym)).toBe(999);
    });

    it('現スコープに無ければ親に再帰して更新する', () => {
      const parent = new Table();
      const child = new Table(parent);
      const sym = InterpretedSymbol.of('x');
      parent.set(sym, 10);
      child.setIfExit(sym, 999);
      expect(parent.get(sym)).toBe(999);
    });

    it('Round 4-J-3: 内側に束縛があれば内側のみ更新する', () => {
      const outer = new Table();
      const inner = new Table(outer);
      const sym = InterpretedSymbol.of('x');
      outer.set(sym, 1);
      inner.set(sym, 2);
      inner.setIfExit(sym, 999);
      expect(inner.get(sym)).toBe(999);
    });

    it('Round 4-J-3: 内側更新は外側を変更しない', () => {
      const outer = new Table();
      const inner = new Table(outer);
      const sym = InterpretedSymbol.of('x');
      outer.set(sym, 1);
      inner.set(sym, 2);
      inner.setIfExit(sym, 999);
      expect(outer.get(sym)).toBe(1);
    });

    it('どこにも束縛が無ければ null を返す', () => {
      const t = new Table();
      expect(t.setIfExit(InterpretedSymbol.of('undefined'), 999)).toBeNull();
    });

    it('現スコープで成功した場合は代入した値を返す', () => {
      const t = new Table();
      const sym = InterpretedSymbol.of('x');
      t.set(sym, 1);
      expect(t.setIfExit(sym, 99)).toBe(99);
    });
  });

  describe('setRoot', () => {
    it('true を渡すと root にする', () => {
      const t = new Table(new Table());
      t.setRoot(true);
      expect(t.isRoot()).toBe(true);
    });

    it('false を渡すと非 root にする', () => {
      const t = new Table();
      t.setRoot(false);
      expect(t.isRoot()).toBe(false);
    });

    it('null を返す', () => {
      expect(new Table().setRoot(true)).toBeNull();
    });
  });

  describe('setSource', () => {
    it('source を指定したテーブルに更新する', () => {
      const t = new Table();
      const parent = new Table();
      t.setSource(parent);
      expect(t.source).toBe(parent);
    });

    it('null を渡すと source を null にする', () => {
      const t = new Table(new Table());
      t.setSource(null);
      expect(t.source).toBeNull();
    });

    it('null を返す', () => {
      expect(new Table().setSource(null)).toBeNull();
    });
  });

  describe('toString', () => {
    it('Round 5-1: "#<Environment>" を返す', () => {
      expect(new Table().toString()).toBe('#<Environment>');
    });
  });
});
