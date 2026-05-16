import { describe, expect, it } from 'vitest';

import { Parser } from '../Parser/index.js';
import { NextState } from './index.js';

describe('NextState', () => {
  describe('constructor', () => {
    it('retains nextState and methodName', () => {
      const ns = new NextState(5, 'foo');
      expect(ns.nextState).toBe(5);
      expect(ns.methodName).toBe('foo');
    });

    it('accepts null for nextState', () => {
      expect(new NextState(null, 'foo').nextState).toBeNull();
    });

    it('accepts null for methodName', () => {
      expect(new NextState(5, null).methodName).toBeNull();
    });

    it('leaves automaton as null in the initial state', () => {
      expect(new NextState(5, 'foo').automaton).toBeNull();
    });

    it('leaves method as null in the initial state', () => {
      expect(new NextState(5, 'foo').method).toBeNull();
    });
  });

  describe('next', () => {
    it('returns nextState as-is when methodName is null', () => {
      expect(new NextState(42, null).next(new Parser(''))).toBe(42);
    });

    it('stores the automaton when invoked', () => {
      const ns = new NextState(0, null);
      const parser = new Parser('');
      ns.next(parser);
      expect(ns.automaton).toBe(parser);
    });

    it('invokes the specified Parser method and returns a number', () => {
      const ns = new NextState(0, 'concatCharacter');
      expect(typeof ns.next(new Parser('abc'))).toBe('number');
    });

    it('throws an exception when the method name does not exist', () => {
      const ns = new NextState(0, 'nonExistentMethod');
      expect(() => ns.next(new Parser(''))).toThrow();
    });
  });
});
