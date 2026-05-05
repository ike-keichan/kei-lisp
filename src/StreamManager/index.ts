import type { InterpretedSymbol } from '../InterpretedSymbol/index.js';

type Stream = NodeJS.WritableStream | null;

/**
 * @class
 * @classdesc
 * @author Keisuke Ikeda
 * @this {StreamManager}
 */
export class StreamManager {
  isTrace: boolean = false;
  streamTable: Map<string, Stream>;
  spyTable: Map<InterpretedSymbol, string>;
  traceStream: Stream;

  constructor() {
    this.streamTable = new Map();
    this.spyTable = new Map();
    this.traceStream = null;
    this.initialize();
  }

  getStream(): Stream {
    let aPrintStream: Stream = null;
    if (this.isTrace) {
      // 原本踏襲: traceStream を関数として呼び出している (実際には Stream オブジェクトのため例外を投げる)
      return (this.traceStream as unknown as () => Stream)();
    }
    const filePath = process.env['HOME'] as string;
    if (this.streamTable.has(filePath)) {
      aPrintStream = this.streamTable.get(filePath) ?? null;
    }

    return aPrintStream;
  }

  /**
   * インスタンス変数を初期設定するメソッド
   */
  initialize(): null {
    this.streamTable.set('default', process.stdout);
    this.streamTable.set('stdout', process.stdout);
    this.streamTable.set('stderr', process.stderr);

    return null;
  }

  isSpy(aSymbol: InterpretedSymbol | null): boolean {
    if (this.isTrace) {
      return true;
    }
    if (aSymbol != null && this.spyTable_().has(aSymbol)) {
      return true;
    }
    return false;
  }

  noSpy(aSymbol: InterpretedSymbol): null {
    if (this.spyTable_().has(aSymbol)) {
      this.spyTable_().delete(aSymbol);
    }

    return null;
  }

  noTrace(): null {
    this.setIsTrace(false);
    this.spyTable.clear();

    return null;
  }

  setIsTrace(aBoolean: boolean): null {
    this.isTrace = aBoolean;
    return null;
  }

  setTraceStream(aStream: Stream): null {
    this.traceStream = aStream;
    return null;
  }

  spy(aSymbol: InterpretedSymbol, aString: string): null {
    const aPrintStream = this.getStream();
    if (aPrintStream != null) {
      this.spyTable_().set(aSymbol, aString);
    }

    return null;
  }

  spyStream(aSymbol: InterpretedSymbol | null): Stream | string {
    if (this.isTrace) {
      return this.traceStream;
    }
    if (aSymbol != null && this.spyTable_().has(aSymbol)) {
      return this.spyTable_().get(aSymbol) as string;
    }
    throw new Error('Stream is not found.');
  }

  spyTable_(): Map<InterpretedSymbol, string> {
    const aTable = new Map<InterpretedSymbol, string>();
    for (const [key, value] of this.spyTable) {
      aTable.set(key, value);
    }
    return aTable;
  }

  trace(): null {
    this.noTrace();
    const aPrintStream = this.getStream();
    this.setTraceStream(aPrintStream);
    this.setIsTrace(true);

    return null;
  }
}
