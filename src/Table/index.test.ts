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

    it('親テーブルを渡すと非 root', () => {
      const parent = new Table();
      const child = new Table(parent);
      expect(child.isRoot()).toBe(false);
      expect(child.source).toBe(parent);
    });
  });

  describe('set / get / has', () => {
    it('set した値を get で取得', () => {
      const t = new Table();
      const sym = InterpretedSymbol.of('x');
      t.set(sym, 42);
      expect(t.get(sym)).toBe(42);
    });

    it('未登録のキーは get で null', () => {
      const t = new Table();
      const sym = InterpretedSymbol.of('missing');
      expect(t.get(sym)).toBeNull();
    });

    it('has で存在確認', () => {
      const t = new Table();
      const sym = InterpretedSymbol.of('x');
      expect(t.has(sym)).toBe(false);
      t.set(sym, 1);
      expect(t.has(sym)).toBe(true);
    });
  });

  describe('親スコープへの委譲 (lexical scope)', () => {
    it('子で未定義なら親から取得', () => {
      const parent = new Table();
      const child = new Table(parent);
      const sym = InterpretedSymbol.of('x');
      parent.set(sym, 100);
      expect(child.get(sym)).toBe(100);
      expect(child.has(sym)).toBe(true);
    });

    it('子で定義していれば子のものが優先 (shadowing)', () => {
      const parent = new Table();
      const child = new Table(parent);
      const sym = InterpretedSymbol.of('x');
      parent.set(sym, 100);
      child.set(sym, 999);
      expect(child.get(sym)).toBe(999);
      expect(parent.get(sym)).toBe(100); // ← 親は影響を受けない
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
      // child には未定義
      child.setIfExit(sym, 999);
      expect(parent.get(sym)).toBe(999);
    });

    it('shadowing: 内側で束縛があれば内側のみ更新、外側は不変 (Round 4-J-3 修正の本質)', () => {
      const outer = new Table();
      const inner = new Table(outer);
      const sym = InterpretedSymbol.of('x');
      outer.set(sym, 1);
      inner.set(sym, 2);

      inner.setIfExit(sym, 999);

      expect(inner.get(sym)).toBe(999);
      expect(outer.get(sym)).toBe(1); // ← 修正前はこれが 999 に書き換わってしまうバグだった
    });

    it('どこにも束縛が無ければ null を返す', () => {
      const t = new Table();
      const sym = InterpretedSymbol.of('undefined');
      expect(t.setIfExit(sym, 999)).toBeNull();
    });
  });

  describe('toString (Round 5-1 で追加)', () => {
    it('"#<Environment>" を返す', () => {
      const t = new Table();
      expect(t.toString()).toBe('#<Environment>');
    });
  });

  describe('clone (Round 4-D 修正後)', () => {
    it('クラッシュせず複製できる', () => {
      const t = new Table();
      const sym = InterpretedSymbol.of('x');
      t.set(sym, 42);
      const cloned = t.clone();
      expect(cloned.get(sym)).toBe(42);
      expect(cloned).not.toBe(t);
    });
  });
});
