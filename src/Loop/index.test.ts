import { describe, expect, it } from 'vitest';

import { Cons } from '../Cons/index.js';
import { Loop } from './index.js';

const makeList = (...values: number[]): Cons => {
  let result: Cons = Cons.nil;
  for (let i = values.length - 1; i >= 0; i--) {
    result = new Cons(values[i], result);
  }
  return result;
};

describe('Loop', () => {
  describe('constructor', () => {
    it('Cons を受け取って初期化する', () => {
      const list = makeList(1, 2, 3);
      const loop = new Loop(list);
      expect(loop.aCons).toBe(list);
      expect(loop.length).toBe(3);
      expect(loop.index).toBe(1);
    });

    it('nil 単独でも構築する', () => {
      const loop = new Loop(Cons.nil);
      expect(loop.length).toBe(0);
    });
  });

  describe('hasNext', () => {
    it('要素が残っていれば true を返す', () => {
      expect(new Loop(makeList(1, 2)).hasNext()).toBe(true);
    });

    it('全て消費したら false を返す', () => {
      const loop = new Loop(makeList(1));
      loop.next();
      expect(loop.hasNext()).toBe(false);
    });

    it('空 (nil) なら最初から false を返す', () => {
      expect(new Loop(Cons.nil).hasNext()).toBe(false);
    });
  });

  describe('iterator', () => {
    it('自身を返す', () => {
      const loop = new Loop(makeList(1));
      expect(loop.iterator()).toBe(loop);
    });
  });

  describe('next', () => {
    it('順に要素を返す', () => {
      const loop = new Loop(makeList(10, 20, 30));
      expect(loop.next()).toBe(10);
      expect(loop.next()).toBe(20);
      expect(loop.next()).toBe(30);
    });

    it('呼び出すと index を 1 進める', () => {
      const loop = new Loop(makeList(1, 2));
      loop.next();
      expect(loop.index).toBe(2);
    });
  });

  describe('remove', () => {
    it('index を 1 進める', () => {
      const loop = new Loop(makeList(1, 2));
      loop.remove();
      expect(loop.index).toBe(2);
    });

    it('null を返す', () => {
      expect(new Loop(makeList(1)).remove()).toBeNull();
    });
  });

  describe('[Symbol.iterator]', () => {
    it('for..of で順に取得する', () => {
      const loop = new Loop(makeList(1, 2, 3));
      const collected: unknown[] = [];
      for (const v of loop) collected.push(v);
      expect(collected).toEqual([1, 2, 3]);
    });

    it('spread で全要素を展開する', () => {
      expect([...new Loop(makeList(10, 20))]).toEqual([10, 20]);
    });

    it('空 (nil) なら反復ゼロ回で終了する', () => {
      expect([...new Loop(Cons.nil)]).toEqual([]);
    });
  });

  describe('[Symbol.asyncIterator]', () => {
    it('for await..of で順に取得する', async () => {
      const asyncIter = new Loop(makeList(1, 2, 3))[Symbol.asyncIterator]();
      const collected: unknown[] = [];
      let result = await asyncIter.next();
      while (!result.done) {
        collected.push(result.value);
        result = await asyncIter.next();
      }
      expect(collected).toEqual([1, 2, 3]);
    });
  });
});
