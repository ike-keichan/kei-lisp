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
    it('Cons を受け取って初期化', () => {
      const list = makeList(1, 2, 3);
      const loop = new Loop(list);
      expect(loop.aCons).toBe(list);
      expect(loop.length).toBe(3);
      expect(loop.index).toBe(1);
    });

    it('nil 単独でも構築可能 (length 0)', () => {
      const loop = new Loop(Cons.nil);
      expect(loop.length).toBe(0);
      expect(loop.hasNext()).toBe(false);
    });
  });

  describe('hasNext', () => {
    it('要素が残っていれば true', () => {
      const loop = new Loop(makeList(1, 2, 3));
      expect(loop.hasNext()).toBe(true);
    });

    it('全て消費したら false', () => {
      const loop = new Loop(makeList(1));
      loop.next();
      expect(loop.hasNext()).toBe(false);
    });

    it('空 (nil) は最初から false', () => {
      const loop = new Loop(Cons.nil);
      expect(loop.hasNext()).toBe(false);
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

    it('next が index を進める', () => {
      const loop = new Loop(makeList(1, 2));
      expect(loop.index).toBe(1);
      loop.next();
      expect(loop.index).toBe(2);
      loop.next();
      expect(loop.index).toBe(3);
    });
  });

  describe('remove', () => {
    it('index を 1 進める', () => {
      const loop = new Loop(makeList(1, 2, 3));
      expect(loop.index).toBe(1);
      loop.remove();
      expect(loop.index).toBe(2);
    });

    it('null を返す', () => {
      const loop = new Loop(makeList(1));
      expect(loop.remove()).toBeNull();
    });
  });

  describe('[Symbol.iterator]', () => {
    it('for..of で順に取得', () => {
      const loop = new Loop(makeList(1, 2, 3));
      const collected: unknown[] = [];
      for (const v of loop) {
        collected.push(v);
      }
      expect(collected).toEqual([1, 2, 3]);
    });

    it('spread でも展開可能', () => {
      const loop = new Loop(makeList(10, 20));
      expect([...loop]).toEqual([10, 20]);
    });

    it('空 (nil) は反復ゼロ回', () => {
      const loop = new Loop(Cons.nil);
      expect([...loop]).toEqual([]);
    });
  });

  describe('[Symbol.asyncIterator]', () => {
    it('for await..of で順に取得', async () => {
      const loop = new Loop(makeList(1, 2, 3));
      const asyncIter = loop[Symbol.asyncIterator]();
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
