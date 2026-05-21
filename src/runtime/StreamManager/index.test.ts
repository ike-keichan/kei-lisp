import { describe, expect, it } from 'vitest';

import { InterpretedSymbol } from '../../value/InterpretedSymbol/index.js';
import { StreamManager } from './index.js';

describe('StreamManager', () => {
  describe('constructor', () => {
    it('initializes isTrace to false', () => {
      expect(new StreamManager().isTrace).toBe(false);
    });

    it('registers default / stdout / stderr in streamTable', () => {
      const sm = new StreamManager();
      expect(sm.streamTable.has('default')).toBe(true);
      expect(sm.streamTable.has('stdout')).toBe(true);
      expect(sm.streamTable.has('stderr')).toBe(true);
    });

    it('initializes spyTable as empty', () => {
      expect(new StreamManager().spyTable.size).toBe(0);
    });

    it('initializes traceStream to null', () => {
      expect(new StreamManager().traceStream).toBeNull();
    });
  });

  describe('initialize', () => {
    it('re-registers streamTable with default / stdout / stderr', () => {
      const sm = new StreamManager();
      sm.streamTable.clear();
      sm.initialize();
      expect(sm.streamTable.has('default')).toBe(true);
    });

    it('returns null after re-registration', () => {
      expect(new StreamManager().initialize()).toBeNull();
    });
  });

  describe('isSpy', () => {
    it('always returns true when isTrace is true', () => {
      const sm = new StreamManager();
      sm.setIsTrace(true);
      expect(sm.isSpy(InterpretedSymbol.of('x'))).toBe(true);
    });

    it('returns true for a symbol registered in spyTable', () => {
      const sm = new StreamManager();
      const sym = InterpretedSymbol.of('foo');
      sm.spyTable.set(sym, 'desc');
      expect(sm.isSpy(sym)).toBe(true);
    });

    it('returns false for an unregistered symbol', () => {
      expect(new StreamManager().isSpy(InterpretedSymbol.of('unknown'))).toBe(false);
    });

    it('returns false for a null symbol when isTrace is false', () => {
      expect(new StreamManager().isSpy(null)).toBe(false);
    });
  });

  describe('noSpy', () => {
    it('following the original: does not modify the source spyTable because delete targets the defensive copy', () => {
      const sm = new StreamManager();
      const sym = InterpretedSymbol.of('foo');
      sm.spyTable.set(sym, 'desc');
      sm.noSpy(sym);
      expect(sm.spyTable.has(sym)).toBe(true);
    });

    it('does not throw for an unregistered symbol', () => {
      expect(() => new StreamManager().noSpy(InterpretedSymbol.of('x'))).not.toThrow();
    });

    it('returns null whether or not the target was registered', () => {
      expect(new StreamManager().noSpy(InterpretedSymbol.of('x'))).toBeNull();
    });
  });

  describe('noTrace', () => {
    it('sets isTrace to false and clears spyTable', () => {
      const sm = new StreamManager();
      sm.setIsTrace(true);
      sm.spyTable.set(InterpretedSymbol.of('x'), 'desc');
      sm.noTrace();
      expect(sm.isTrace).toBe(false);
      expect(sm.spyTable.size).toBe(0);
    });

    it('returns null after disabling trace', () => {
      expect(new StreamManager().noTrace()).toBeNull();
    });
  });

  describe('setIsTrace', () => {
    it('sets isTrace to true when passed true', () => {
      const sm = new StreamManager();
      sm.setIsTrace(true);
      expect(sm.isTrace).toBe(true);
    });

    it('sets isTrace to false when passed false', () => {
      const sm = new StreamManager();
      sm.setIsTrace(true);
      sm.setIsTrace(false);
      expect(sm.isTrace).toBe(false);
    });

    it('returns null regardless of the input value', () => {
      expect(new StreamManager().setIsTrace(true)).toBeNull();
    });
  });

  describe('setTraceStream', () => {
    it('sets traceStream to the given value', () => {
      const sm = new StreamManager();
      sm.setTraceStream(process.stdout);
      expect(sm.traceStream).toBe(process.stdout);
    });

    it('sets traceStream to null when passed null', () => {
      const sm = new StreamManager();
      sm.setTraceStream(process.stdout);
      sm.setTraceStream(null);
      expect(sm.traceStream).toBeNull();
    });
  });

  describe('getStream', () => {
    it('returns null when isTrace is false and the HOME path is not registered', () => {
      const sm = new StreamManager();
      // streamTable only has default/stdout/stderr — HOME path is not included, so null.
      expect(sm.getStream()).toBeNull();
    });

    it('reproduces the original bug (invoking traceStream as a function) when isTrace is true', () => {
      const sm = new StreamManager();
      sm.setIsTrace(true);
      // Following the original: tries to call traceStream (a Stream object) as a function and throws.
      expect(() => sm.getStream()).toThrow();
    });
  });

  describe('spy', () => {
    it('does not register in spyTable when the target stream is null', () => {
      const sm = new StreamManager();
      const sym = InterpretedSymbol.of('foo');
      // getStream returns null in this situation, so nothing is registered.
      sm.spy(sym, 'description');
      expect(sm.spyTable.has(sym)).toBe(false);
    });

    it('returns null after attempting registration', () => {
      expect(new StreamManager().spy(InterpretedSymbol.of('x'), 'd')).toBeNull();
    });
  });

  describe('spyStream', () => {
    it('returns traceStream when isTrace is true', () => {
      const sm = new StreamManager();
      sm.setIsTrace(true);
      sm.setTraceStream(process.stdout);
      expect(sm.spyStream(null)).toBe(process.stdout);
    });

    it('returns the description for a symbol registered in spyTable', () => {
      const sm = new StreamManager();
      const sym = InterpretedSymbol.of('foo');
      sm.spyTable.set(sym, 'my-desc');
      expect(sm.spyStream(sym)).toBe('my-desc');
    });

    it('throws an exception for an unregistered symbol when isTrace is false', () => {
      expect(() => new StreamManager().spyStream(InterpretedSymbol.of('x'))).toThrow();
    });
  });

  describe('spyTable_', () => {
    it('returns a defensive copy of spyTable', () => {
      const sm = new StreamManager();
      const sym = InterpretedSymbol.of('foo');
      sm.spyTable.set(sym, 'desc');
      const copy = sm.spyTable_();
      expect(copy.has(sym)).toBe(true);
    });

    it('returns a different instance from the original Map', () => {
      const sm = new StreamManager();
      expect(sm.spyTable_()).not.toBe(sm.spyTable);
    });
  });

  describe('trace', () => {
    it('switches isTrace to true', () => {
      const sm = new StreamManager();
      sm.trace();
      expect(sm.isTrace).toBe(true);
    });

    it('sets traceStream to the result of getStream', () => {
      const sm = new StreamManager();
      sm.trace();
      // The result of getStream (typically null) is placed into traceStream.
      expect(sm.traceStream).toBeNull();
    });

    it('returns null after enabling trace', () => {
      expect(new StreamManager().trace()).toBeNull();
    });
  });
});
