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
    it('initializes from the given Cons', () => {
      const list = makeList(1, 2, 3);
      const loop = new Loop(list);
      expect(loop.aCons).toBe(list);
      expect(loop.length).toBe(3);
      expect(loop.index).toBe(1);
    });

    it('can be constructed from nil alone', () => {
      const loop = new Loop(Cons.nil);
      expect(loop.length).toBe(0);
    });
  });

  describe('hasNext', () => {
    it('returns true while elements remain', () => {
      expect(new Loop(makeList(1, 2)).hasNext()).toBe(true);
    });

    it('returns false once all elements are consumed', () => {
      const loop = new Loop(makeList(1));
      loop.next();
      expect(loop.hasNext()).toBe(false);
    });

    it('returns false from the start when empty (nil)', () => {
      expect(new Loop(Cons.nil).hasNext()).toBe(false);
    });
  });

  describe('iterator', () => {
    it('returns this instance', () => {
      const loop = new Loop(makeList(1));
      expect(loop.iterator()).toBe(loop);
    });
  });

  describe('next', () => {
    it('returns elements in order', () => {
      const loop = new Loop(makeList(10, 20, 30));
      expect(loop.next()).toBe(10);
      expect(loop.next()).toBe(20);
      expect(loop.next()).toBe(30);
    });

    it('advances index by 1 when called', () => {
      const loop = new Loop(makeList(1, 2));
      loop.next();
      expect(loop.index).toBe(2);
    });
  });

  describe('remove', () => {
    it('advances index by 1', () => {
      const loop = new Loop(makeList(1, 2));
      loop.remove();
      expect(loop.index).toBe(2);
    });

    it('returns null', () => {
      expect(new Loop(makeList(1)).remove()).toBeNull();
    });
  });

  describe('[Symbol.iterator]', () => {
    it('yields elements in order via for..of', () => {
      const loop = new Loop(makeList(1, 2, 3));
      const collected: unknown[] = [];
      for (const v of loop) collected.push(v);
      expect(collected).toEqual([1, 2, 3]);
    });

    it('expands all elements via spread', () => {
      expect([...new Loop(makeList(10, 20))]).toEqual([10, 20]);
    });

    it('completes with zero iterations when empty (nil)', () => {
      expect([...new Loop(Cons.nil)]).toEqual([]);
    });
  });

  describe('[Symbol.asyncIterator]', () => {
    it('yields elements in order via for await..of', async () => {
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
