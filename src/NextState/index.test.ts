import { describe, expect, it } from 'vitest';

import { Parser } from '../Parser/index.js';
import { NextState } from './index.js';

describe('NextState', () => {
  describe('constructor', () => {
    it('nextState と methodName を保持する', () => {
      const ns = new NextState(5, 'foo');
      expect(ns.nextState).toBe(5);
      expect(ns.methodName).toBe('foo');
    });

    it('nextState に null も許容', () => {
      const ns = new NextState(null, 'foo');
      expect(ns.nextState).toBeNull();
    });

    it('methodName に null も許容', () => {
      const ns = new NextState(5, null);
      expect(ns.methodName).toBeNull();
    });

    it('初期状態で automaton / method は null', () => {
      const ns = new NextState(5, 'foo');
      expect(ns.automaton).toBeNull();
      expect(ns.method).toBeNull();
    });
  });

  describe('next', () => {
    it('methodName が null なら nextState をそのまま返す', () => {
      const ns = new NextState(42, null);
      const parser = new Parser('');
      expect(ns.next(parser)).toBe(42);
    });

    it('automaton を保存する', () => {
      const ns = new NextState(0, null);
      const parser = new Parser('');
      ns.next(parser);
      expect(ns.automaton).toBe(parser);
    });

    it('methodName が指す Parser メソッドを呼び出す (concatCharacter)', () => {
      const ns = new NextState(0, 'concatCharacter');
      const parser = new Parser('abc');
      // concatCharacter は nexts[0] を tokenString に追加して null を返す
      // nextState が 0 で呼び出し結果が null なので戻り値 0 になる想定
      const result = ns.next(parser);
      expect(typeof result).toBe('number');
    });

    it('存在しないメソッド名なら例外を投げる', () => {
      const ns = new NextState(0, 'nonExistentMethod');
      const parser = new Parser('');
      expect(() => ns.next(parser)).toThrow();
    });
  });
});
