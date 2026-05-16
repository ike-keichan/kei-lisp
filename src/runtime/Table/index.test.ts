import { describe, expect, it } from 'vitest';

import { InterpretedSymbol } from '../../value/InterpretedSymbol/index.js';
import { Table } from './index.js';

describe('Table', () => {
  describe('constructor', () => {
    it('sets root to true when constructed without arguments', () => {
      const t = new Table();
      expect(t.isRoot()).toBe(true);
      expect(t.source).toBeNull();
    });

    it('sets root to true even when null is passed', () => {
      expect(new Table(null).isRoot()).toBe(true);
    });

    it('marks the table as non-root when a parent is passed', () => {
      const parent = new Table();
      const child = new Table(parent);
      expect(child.isRoot()).toBe(false);
      expect(child.source).toBe(parent);
    });

    it('returns 0 for the initial size since it extends Map', () => {
      expect(new Table().size).toBe(0);
    });
  });

  describe('clone', () => {
    it('Round 4-D: returns a clone without crashing', () => {
      const t = new Table();
      const sym = InterpretedSymbol.of('x');
      t.set(sym, 42);
      expect(t.clone().get(sym)).toBe(42);
    });

    it('returns a different instance', () => {
      const t = new Table();
      expect(t.clone()).not.toBe(t);
    });

    it('references the source Table as its parent', () => {
      const t = new Table();
      t.set(InterpretedSymbol.of('a'), 1);
      expect(t.clone().source).toBe(t);
    });
  });

  describe('equals', () => {
    it('throws TypeError because Map.prototype.equals does not exist', () => {
      expect(() => new Table().equals(new Table())).toThrow();
    });
  });

  describe('get', () => {
    it('returns the value that was set', () => {
      const t = new Table();
      const sym = InterpretedSymbol.of('x');
      t.set(sym, 42);
      expect(t.get(sym)).toBe(42);
    });

    it('returns null for an unregistered key', () => {
      expect(new Table().get(InterpretedSymbol.of('missing'))).toBeNull();
    });

    it('returns a value from the parent when not the root', () => {
      const parent = new Table();
      const child = new Table(parent);
      const sym = InterpretedSymbol.of('x');
      parent.set(sym, 99);
      expect(child.get(sym)).toBe(99);
    });

    it('prefers the child value when the child has a binding', () => {
      const parent = new Table();
      const child = new Table(parent);
      const sym = InterpretedSymbol.of('x');
      parent.set(sym, 1);
      child.set(sym, 2);
      expect(child.get(sym)).toBe(2);
    });
  });

  describe('has', () => {
    it('returns false for an unregistered key', () => {
      expect(new Table().has(InterpretedSymbol.of('x'))).toBe(false);
    });

    it('returns true after set', () => {
      const t = new Table();
      const sym = InterpretedSymbol.of('x');
      t.set(sym, 1);
      expect(t.has(sym)).toBe(true);
    });

    it('returns true in the child when the parent has the binding', () => {
      const parent = new Table();
      const child = new Table(parent);
      const sym = InterpretedSymbol.of('x');
      parent.set(sym, 1);
      expect(child.has(sym)).toBe(true);
    });
  });

  describe('isRoot', () => {
    it('returns true for a root table', () => {
      expect(new Table().isRoot()).toBe(true);
    });

    it('returns false when a parent exists', () => {
      expect(new Table(new Table()).isRoot()).toBe(false);
    });
  });

  describe('setIfExit', () => {
    it('updates and stops at the current scope when a binding exists there', () => {
      const t = new Table();
      const sym = InterpretedSymbol.of('x');
      t.set(sym, 1);
      t.setIfExit(sym, 999);
      expect(t.get(sym)).toBe(999);
    });

    it('recurses to the parent for the update when the current scope has no binding', () => {
      const parent = new Table();
      const child = new Table(parent);
      const sym = InterpretedSymbol.of('x');
      parent.set(sym, 10);
      child.setIfExit(sym, 999);
      expect(parent.get(sym)).toBe(999);
    });

    it('Round 4-J-3: updates only the inner scope when the inner has a binding', () => {
      const outer = new Table();
      const inner = new Table(outer);
      const sym = InterpretedSymbol.of('x');
      outer.set(sym, 1);
      inner.set(sym, 2);
      inner.setIfExit(sym, 999);
      expect(inner.get(sym)).toBe(999);
    });

    it('Round 4-J-3: an inner update does not change the outer scope', () => {
      const outer = new Table();
      const inner = new Table(outer);
      const sym = InterpretedSymbol.of('x');
      outer.set(sym, 1);
      inner.set(sym, 2);
      inner.setIfExit(sym, 999);
      expect(outer.get(sym)).toBe(1);
    });

    it('returns null when no binding exists anywhere', () => {
      const t = new Table();
      expect(t.setIfExit(InterpretedSymbol.of('undefined'), 999)).toBeNull();
    });

    it('returns the assigned value when the current scope is updated', () => {
      const t = new Table();
      const sym = InterpretedSymbol.of('x');
      t.set(sym, 1);
      expect(t.setIfExit(sym, 99)).toBe(99);
    });
  });

  describe('setRoot', () => {
    it('makes the table a root when passed true', () => {
      const t = new Table(new Table());
      t.setRoot(true);
      expect(t.isRoot()).toBe(true);
    });

    it('makes the table non-root when passed false', () => {
      const t = new Table();
      t.setRoot(false);
      expect(t.isRoot()).toBe(false);
    });

    it('returns null', () => {
      expect(new Table().setRoot(true)).toBeNull();
    });
  });

  describe('setSource', () => {
    it('updates source to the given table', () => {
      const t = new Table();
      const parent = new Table();
      t.setSource(parent);
      expect(t.source).toBe(parent);
    });

    it('sets source to null when null is passed', () => {
      const t = new Table(new Table());
      t.setSource(null);
      expect(t.source).toBeNull();
    });

    it('returns null', () => {
      expect(new Table().setSource(null)).toBeNull();
    });
  });

  describe('toString', () => {
    it('Round 5-1: returns "#<Environment>"', () => {
      expect(new Table().toString()).toBe('#<Environment>');
    });
  });
});
