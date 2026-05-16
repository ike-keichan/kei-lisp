import { describe, expect, it } from 'vitest';

import { InterpretedSymbol } from '../InterpretedSymbol/index.js';
import { StreamManager } from './index.js';

describe('StreamManager', () => {
  describe('constructor', () => {
    it('isTrace を false で初期化する', () => {
      expect(new StreamManager().isTrace).toBe(false);
    });

    it('streamTable に default / stdout / stderr を登録する', () => {
      const sm = new StreamManager();
      expect(sm.streamTable.has('default')).toBe(true);
      expect(sm.streamTable.has('stdout')).toBe(true);
      expect(sm.streamTable.has('stderr')).toBe(true);
    });

    it('spyTable を空で初期化する', () => {
      expect(new StreamManager().spyTable.size).toBe(0);
    });

    it('traceStream を null で初期化する', () => {
      expect(new StreamManager().traceStream).toBeNull();
    });
  });

  describe('initialize', () => {
    it('streamTable を default / stdout / stderr で再登録する', () => {
      const sm = new StreamManager();
      sm.streamTable.clear();
      sm.initialize();
      expect(sm.streamTable.has('default')).toBe(true);
    });

    it('null を返す', () => {
      expect(new StreamManager().initialize()).toBeNull();
    });
  });

  describe('isSpy', () => {
    it('isTrace が true なら常に true を返す', () => {
      const sm = new StreamManager();
      sm.setIsTrace(true);
      expect(sm.isSpy(InterpretedSymbol.of('x'))).toBe(true);
    });

    it('spyTable に登録された Symbol なら true を返す', () => {
      const sm = new StreamManager();
      const sym = InterpretedSymbol.of('foo');
      sm.spyTable.set(sym, 'desc');
      expect(sm.isSpy(sym)).toBe(true);
    });

    it('未登録 Symbol なら false を返す', () => {
      expect(new StreamManager().isSpy(InterpretedSymbol.of('unknown'))).toBe(false);
    });

    it('null Symbol で isTrace が false なら false を返す', () => {
      expect(new StreamManager().isSpy(null)).toBe(false);
    });
  });

  describe('noSpy', () => {
    it('原本踏襲: 防御コピーへの delete のため元 spyTable を変更しない', () => {
      const sm = new StreamManager();
      const sym = InterpretedSymbol.of('foo');
      sm.spyTable.set(sym, 'desc');
      sm.noSpy(sym);
      expect(sm.spyTable.has(sym)).toBe(true);
    });

    it('未登録 Symbol でも例外を投げない', () => {
      expect(() => new StreamManager().noSpy(InterpretedSymbol.of('x'))).not.toThrow();
    });

    it('null を返す', () => {
      expect(new StreamManager().noSpy(InterpretedSymbol.of('x'))).toBeNull();
    });
  });

  describe('noTrace', () => {
    it('isTrace を false にして spyTable をクリアする', () => {
      const sm = new StreamManager();
      sm.setIsTrace(true);
      sm.spyTable.set(InterpretedSymbol.of('x'), 'desc');
      sm.noTrace();
      expect(sm.isTrace).toBe(false);
      expect(sm.spyTable.size).toBe(0);
    });

    it('null を返す', () => {
      expect(new StreamManager().noTrace()).toBeNull();
    });
  });

  describe('setIsTrace', () => {
    it('true を渡すと isTrace を true にする', () => {
      const sm = new StreamManager();
      sm.setIsTrace(true);
      expect(sm.isTrace).toBe(true);
    });

    it('false を渡すと isTrace を false にする', () => {
      const sm = new StreamManager();
      sm.setIsTrace(true);
      sm.setIsTrace(false);
      expect(sm.isTrace).toBe(false);
    });

    it('null を返す', () => {
      expect(new StreamManager().setIsTrace(true)).toBeNull();
    });
  });

  describe('setTraceStream', () => {
    it('traceStream を指定値に設定する', () => {
      const sm = new StreamManager();
      sm.setTraceStream(process.stdout);
      expect(sm.traceStream).toBe(process.stdout);
    });

    it('null を渡せば traceStream を null にする', () => {
      const sm = new StreamManager();
      sm.setTraceStream(process.stdout);
      sm.setTraceStream(null);
      expect(sm.traceStream).toBeNull();
    });
  });
});
