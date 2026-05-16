import { describe, expect, it } from 'vitest';

import { IntStream } from './index.js';

describe('IntStream', () => {
  describe('range (static)', () => {
    it('start から afterEnd-1 までの連番を返す', () => {
      expect(IntStream.range(1, 5)).toEqual([1, 2, 3, 4]);
    });

    it('0 から始まる連番を返す', () => {
      expect(IntStream.range(0, 3)).toEqual([0, 1, 2]);
    });

    it('start === afterEnd の場合は空配列を返す', () => {
      expect(IntStream.range(5, 5)).toEqual([]);
    });

    it('start === afterEnd - 1 の場合は単一要素配列を返す', () => {
      expect(IntStream.range(5, 6)).toEqual([5]);
    });

    it('負数を含む範囲も返す', () => {
      expect(IntStream.range(-2, 2)).toEqual([-2, -1, 0, 1]);
    });
  });

  describe('rangeClosed (static)', () => {
    it('start から end (含む) までの連番を返す', () => {
      expect(IntStream.rangeClosed(1, 5)).toEqual([1, 2, 3, 4, 5]);
    });

    it('start === end の場合は単一要素配列を返す', () => {
      expect(IntStream.rangeClosed(5, 5)).toEqual([5]);
    });

    it('0 から始まる連番を返す', () => {
      expect(IntStream.rangeClosed(0, 3)).toEqual([0, 1, 2, 3]);
    });

    it('負数を含む範囲も返す', () => {
      expect(IntStream.rangeClosed(-2, 1)).toEqual([-2, -1, 0, 1]);
    });

    it('start > end の場合は空配列を返す', () => {
      expect(IntStream.rangeClosed(5, 3)).toEqual([]);
    });
  });

  describe('range と rangeClosed の関係', () => {
    it('rangeClosed(s, e) は range(s, e+1) と等しい結果を返す', () => {
      expect(IntStream.rangeClosed(1, 10)).toEqual(IntStream.range(1, 11));
    });
  });
});
