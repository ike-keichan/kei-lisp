import { describe, expect, it } from 'vitest';

import { IntStream } from './index.js';

describe('IntStream', () => {
  describe('range (static)', () => {
    it('returns consecutive integers from start to afterEnd-1', () => {
      expect(IntStream.range(1, 5)).toEqual([1, 2, 3, 4]);
    });

    it('returns a sequence starting from 0', () => {
      expect(IntStream.range(0, 3)).toEqual([0, 1, 2]);
    });

    it('returns an empty array when start === afterEnd', () => {
      expect(IntStream.range(5, 5)).toEqual([]);
    });

    it('returns a single-element array when start === afterEnd - 1', () => {
      expect(IntStream.range(5, 6)).toEqual([5]);
    });

    it('returns a range that includes negative numbers', () => {
      expect(IntStream.range(-2, 2)).toEqual([-2, -1, 0, 1]);
    });
  });

  describe('rangeClosed (static)', () => {
    it('returns consecutive integers from start to end (inclusive)', () => {
      expect(IntStream.rangeClosed(1, 5)).toEqual([1, 2, 3, 4, 5]);
    });

    it('returns a single-element array when start === end', () => {
      expect(IntStream.rangeClosed(5, 5)).toEqual([5]);
    });

    it('returns a sequence starting from 0', () => {
      expect(IntStream.rangeClosed(0, 3)).toEqual([0, 1, 2, 3]);
    });

    it('returns a range that includes negative numbers', () => {
      expect(IntStream.rangeClosed(-2, 1)).toEqual([-2, -1, 0, 1]);
    });

    it('returns an empty array when start > end', () => {
      expect(IntStream.rangeClosed(5, 3)).toEqual([]);
    });
  });

  describe('relationship between range and rangeClosed', () => {
    it('rangeClosed(s, e) returns the same result as range(s, e+1)', () => {
      expect(IntStream.rangeClosed(1, 10)).toEqual(IntStream.range(1, 11));
    });
  });
});
