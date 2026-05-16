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

    it('nextState に null を許容する', () => {
      expect(new NextState(null, 'foo').nextState).toBeNull();
    });

    it('methodName に null を許容する', () => {
      expect(new NextState(5, null).methodName).toBeNull();
    });

    it('初期状態で automaton を null にする', () => {
      expect(new NextState(5, 'foo').automaton).toBeNull();
    });

    it('初期状態で method を null にする', () => {
      expect(new NextState(5, 'foo').method).toBeNull();
    });
  });

  describe('next', () => {
    it('methodName が null なら nextState をそのまま返す', () => {
      expect(new NextState(42, null).next(new Parser(''))).toBe(42);
    });

    it('呼び出すと automaton を保存する', () => {
      const ns = new NextState(0, null);
      const parser = new Parser('');
      ns.next(parser);
      expect(ns.automaton).toBe(parser);
    });

    it('指定された Parser メソッドを呼び出して数値を返す', () => {
      const ns = new NextState(0, 'concatCharacter');
      expect(typeof ns.next(new Parser('abc'))).toBe('number');
    });

    it('存在しないメソッド名なら例外を投げる', () => {
      const ns = new NextState(0, 'nonExistentMethod');
      expect(() => ns.next(new Parser(''))).toThrow();
    });
  });
});
