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

  describe('getStream', () => {
    it('isTrace が false かつ HOME パスが未登録なら null を返す', () => {
      const sm = new StreamManager();
      // streamTable には default/stdout/stderr しかなく HOME パスは含まれないので null
      expect(sm.getStream()).toBeNull();
    });

    it('isTrace が true で原本踏襲のバグ (traceStream を関数呼び) を再現する', () => {
      const sm = new StreamManager();
      sm.setIsTrace(true);
      // 原本踏襲: traceStream (Stream オブジェクト) を関数として呼ぼうとし例外
      expect(() => sm.getStream()).toThrow();
    });
  });

  describe('spy', () => {
    it('対象のストリームが null なら spyTable に登録しない', () => {
      const sm = new StreamManager();
      const sym = InterpretedSymbol.of('foo');
      // getStream が null を返す状況なので登録されない
      sm.spy(sym, 'description');
      expect(sm.spyTable.has(sym)).toBe(false);
    });

    it('null を返す', () => {
      expect(new StreamManager().spy(InterpretedSymbol.of('x'), 'd')).toBeNull();
    });
  });

  describe('spyStream', () => {
    it('isTrace が true なら traceStream を返す', () => {
      const sm = new StreamManager();
      sm.setIsTrace(true);
      sm.setTraceStream(process.stdout);
      expect(sm.spyStream(null)).toBe(process.stdout);
    });

    it('spyTable に登録されている Symbol なら description を返す', () => {
      const sm = new StreamManager();
      const sym = InterpretedSymbol.of('foo');
      sm.spyTable.set(sym, 'my-desc');
      expect(sm.spyStream(sym)).toBe('my-desc');
    });

    it('未登録 Symbol で isTrace が false なら例外を投げる', () => {
      expect(() => new StreamManager().spyStream(InterpretedSymbol.of('x'))).toThrow();
    });
  });

  describe('spyTable_', () => {
    it('spyTable の防御コピーを返す', () => {
      const sm = new StreamManager();
      const sym = InterpretedSymbol.of('foo');
      sm.spyTable.set(sym, 'desc');
      const copy = sm.spyTable_();
      expect(copy.has(sym)).toBe(true);
    });

    it('返り値は元の Map と別インスタンスである', () => {
      const sm = new StreamManager();
      expect(sm.spyTable_()).not.toBe(sm.spyTable);
    });
  });

  describe('trace', () => {
    it('isTrace を true に切り替える', () => {
      const sm = new StreamManager();
      sm.trace();
      expect(sm.isTrace).toBe(true);
    });

    it('traceStream を getStream の結果で設定する', () => {
      const sm = new StreamManager();
      sm.trace();
      // getStream の結果 (通常 null) が traceStream に入る
      expect(sm.traceStream).toBeNull();
    });

    it('null を返す', () => {
      expect(new StreamManager().trace()).toBeNull();
    });
  });
});
