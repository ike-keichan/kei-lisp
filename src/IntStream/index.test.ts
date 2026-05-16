import { describe, expect, it } from 'vitest';

import { IntStream } from './index.js';

describe('IntStream', () => {
  describe('range (static)', () => {
    it('start から afterEnd-1 までの連番を返す', () => {
      expect(IntStream.range(1, 5)).toEqual([1, 2, 3, 4]);
    });

    it('0 から始まる範囲', () => {
      expect(IntStream.range(0, 3)).toEqual([0, 1, 2]);
    });

    it('start === afterEnd は空配列', () => {
      expect(IntStream.range(5, 5)).toEqual([]);
    });

    it('start === afterEnd - 1 は単一要素', () => {
      expect(IntStream.range(5, 6)).toEqual([5]);
    });

    it('負の数も扱える', () => {
      expect(IntStream.range(-2, 2)).toEqual([-2, -1, 0, 1]);
    });
  });

  describe('rangeClosed (static)', () => {
    it('start から end (含む) までの連番を返す', () => {
      expect(IntStream.rangeClosed(1, 5)).toEqual([1, 2, 3, 4, 5]);
    });

    it('start === end は単一要素', () => {
      expect(IntStream.rangeClosed(5, 5)).toEqual([5]);
    });

    it('0 から始まる範囲', () => {
      expect(IntStream.rangeClosed(0, 3)).toEqual([0, 1, 2, 3]);
    });

    it('負の数も扱える', () => {
      expect(IntStream.rangeClosed(-2, 1)).toEqual([-2, -1, 0, 1]);
    });

    it('start > end は空配列 (Array.from で length が負になるため)', () => {
      expect(IntStream.rangeClosed(5, 3)).toEqual([]);
    });
  });

  describe('range と rangeClosed の関係', () => {
    it('rangeClosed(s, e) === range(s, e+1)', () => {
      const a = IntStream.rangeClosed(1, 10);
      const b = IntStream.range(1, 11);
      expect(a).toEqual(b);
    });
  });
});
