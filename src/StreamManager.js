// #!/usr/bin/env node

'use strict';

/**
 * @class
 * @classdesc
 * @author Keisuke Ikeda
 * @this {StreamManager}
 */
export class StreamManager extends Object {
  /**
   * コンストラクタメソッド
   * @return {StreamManager} 自身
   */
  constructor() {
    super();
    this.isTrace = false;
    this.streamTable = new Map();
    this.spyTable = new Map();
    this.traceStream = null;
    this.initialize();

    return this;
  }

  getStream() {
    let aPrintStream = null;
    if (this.isTrace) {
      return this.traceStream();
    }
    let filePath = process.env.HOME;
    if (this.streamTable.has(filePath)) {
      aPrintStream = this.streamTable.get(filePath);
    }

    return aPrintStream;
  }

  /**
   * インスタンス変数を初期設定するメソッド
   * @return {Null} 何も返さない。
   */
  initialize() {
    this.streamTable.set('default', process.stdout);
    this.streamTable.set('stdout', process.stdout);
    this.streamTable.set('stderr', process.stderr);

    return null;
  }

  isSpy(aSymbol) {
    if (this.isTrace) {
      return true;
    }
    if (this.spyTable_().has(aSymbol)) {
      return true;
    }
    return false;
  }

  noSpy(aSymbol) {
    if (this.spyTable_().has(aSymbol)) {
      this.spyTable_().delete(aSymbol);
    }

    return null;
  }

  noTrace() {
    this.setIsTrace(false);
    this.spyTable.clear();

    return null;
  }

  setIsTrace(aBoolean) {
    this.isTrace = aBoolean;
    return null;
  }

  setTraceStream(aStream) {
    this.traceStream = aStream;
    return null;
  }

  spy(aSymbol, aString) {
    let aPrintStream = null;
    aPrintStream = this.getStream();
    if (aPrintStream != null) {
      this.spyTable_().set(aSymbol, aString);
    }

    return null;
  }

  spyStream(aSymbol) {
    if (this.isTrace) {
      return this.traceStream;
    }
    if (this.spyTable_().has(aSymbol)) {
      return this.spyTable_().get(aSymbol);
    }
    throw new Error('Stream is not found.');
  }

  spyTable_() {
    let aTable = new Map();
    for (let [key, value] of this.spyTable) {
      aTable.set(key, value);
    }
    return aTable;
  }

  trace() {
    let aPrintStream = null;

    this.noTrace();
    aPrintStream = this.getStream();
    this.setTraceStream(aPrintStream);
    this.setIsTrace(true);

    return null;
  }
}
