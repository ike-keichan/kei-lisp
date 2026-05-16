import { describe, expect, it } from 'vitest';

import { InterpretedSymbol } from '../InterpretedSymbol/index.js';
import { StreamManager } from './index.js';

describe('StreamManager', () => {
  describe('constructor', () => {
    it('初期状態で isTrace は false', () => {
      const sm = new StreamManager();
      expect(sm.isTrace).toBe(false);
    });

    it('streamTable に default/stdout/stderr が登録される', () => {
      const sm = new StreamManager();
      expect(sm.streamTable.has('default')).toBe(true);
      expect(sm.streamTable.has('stdout')).toBe(true);
      expect(sm.streamTable.has('stderr')).toBe(true);
    });

    it('spyTable は空', () => {
      const sm = new StreamManager();
      expect(sm.spyTable.size).toBe(0);
    });

    it('traceStream は null', () => {
      const sm = new StreamManager();
      expect(sm.traceStream).toBeNull();
    });
  });

  describe('initialize', () => {
    it('streamTable を初期化', () => {
      const sm = new StreamManager();
      sm.streamTable.clear();
      sm.initialize();
      expect(sm.streamTable.has('default')).toBe(true);
      expect(sm.streamTable.has('stdout')).toBe(true);
      expect(sm.streamTable.has('stderr')).toBe(true);
    });

    it('null を返す', () => {
      const sm = new StreamManager();
      expect(sm.initialize()).toBeNull();
    });
  });

  describe('isSpy', () => {
    it('isTrace が true なら常に true', () => {
      const sm = new StreamManager();
      sm.setIsTrace(true);
      expect(sm.isSpy(InterpretedSymbol.of('x'))).toBe(true);
      expect(sm.isSpy(null)).toBe(true);
    });

    it('spyTable に登録された Symbol は true', () => {
      const sm = new StreamManager();
      const sym = InterpretedSymbol.of('foo');
      sm.spyTable.set(sym, 'desc');
      expect(sm.isSpy(sym)).toBe(true);
    });

    it('未登録の Symbol は false', () => {
      const sm = new StreamManager();
      expect(sm.isSpy(InterpretedSymbol.of('unknown'))).toBe(false);
    });

    it('null の Symbol で isTrace が false なら false', () => {
      const sm = new StreamManager();
      expect(sm.isSpy(null)).toBe(false);
    });
  });

  describe('noSpy', () => {
    // 原本踏襲のバグ: spyTable_() が防御コピーを返すため、その copy に対する delete は
    // 元の spyTable に反映されない。Round 11+ で要修正だが、現状は元の挙動を保つ。
    it('原本バグ: 防御コピーへの delete のため元の spyTable は変わらない', () => {
      const sm = new StreamManager();
      const sym = InterpretedSymbol.of('foo');
      sm.spyTable.set(sym, 'desc');
      sm.noSpy(sym);
      // 直接 spyTable をチェックするとまだ残っている (バグ)
      expect(sm.spyTable.has(sym)).toBe(true);
    });

    it('未登録 Symbol でもエラーにならない', () => {
      const sm = new StreamManager();
      expect(() => sm.noSpy(InterpretedSymbol.of('x'))).not.toThrow();
    });

    it('null を返す', () => {
      const sm = new StreamManager();
      expect(sm.noSpy(InterpretedSymbol.of('x'))).toBeNull();
    });
  });

  describe('noTrace', () => {
    it('isTrace を false にして spyTable をクリア', () => {
      const sm = new StreamManager();
      sm.setIsTrace(true);
      sm.spyTable.set(InterpretedSymbol.of('x'), 'desc');
      sm.noTrace();
      expect(sm.isTrace).toBe(false);
      expect(sm.spyTable.size).toBe(0);
    });

    it('null を返す', () => {
      const sm = new StreamManager();
      expect(sm.noTrace()).toBeNull();
    });
  });

  describe('setIsTrace', () => {
    it('isTrace を切り替え', () => {
      const sm = new StreamManager();
      sm.setIsTrace(true);
      expect(sm.isTrace).toBe(true);
      sm.setIsTrace(false);
      expect(sm.isTrace).toBe(false);
    });

    it('null を返す', () => {
      const sm = new StreamManager();
      expect(sm.setIsTrace(true)).toBeNull();
    });
  });

  describe('setTraceStream', () => {
    it('traceStream を設定', () => {
      const sm = new StreamManager();
      sm.setTraceStream(process.stdout);
      expect(sm.traceStream).toBe(process.stdout);
    });

    it('null も設定可能', () => {
      const sm = new StreamManager();
      sm.setTraceStream(process.stdout);
      sm.setTraceStream(null);
      expect(sm.traceStream).toBeNull();
    });
  });
});
