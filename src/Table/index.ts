'use strict';

import { Cons, type LispValue } from '../Cons/index.js';

/**
 * @class
 * @classdesc インタプリテッドシンボルの束縛を管理するクラス
 * @author Keisuke Ikeda
 * @this {Table}
 */
export class Table extends Map<unknown, LispValue> {
  source: Table | null;
  root: boolean;

  /**
   * コンストラクタメソッド
   * @param aTable この環境が生まれた環境
   */
  constructor(aTable: Table | null = null) {
    super();
    this.source = aTable;
    this.root = aTable == null;
  }

  /**
   * 自身（Table）を複製し、応答するメソッド
   */
  clone(): Table {
    const aTable = new Table(this);
    for (const key of this.keys()) {
      const value = Cons.cloneValue(this.get(key));
      if (value != null) {
        aTable.set(key, value);
      } else {
        throw new Error('RuntimeException!');
      }
    }

    return aTable;
  }

  /**
   * 引数のプロパティ（キー）が束縛しているものがあるかどうかを判別し、応答するメソッド
   */
  has(aSymbol: unknown): boolean {
    if (super.has(aSymbol)) {
      return true;
    }
    if (this.isRoot()) {
      return false;
    }

    return this.source != null && this.source.has(aSymbol);
  }

  /**
   * 自身と引数が等しいかどうかを判別し、応答するメソッド
   */
  equals(anObject: unknown): boolean {
    return this === anObject;
  }

  /**
   * インタプリテッドシンボルが束縛しているものを応答するメソッド
   */
  get(aSymbol: unknown): LispValue {
    if (super.has(aSymbol)) {
      return super.get(aSymbol) as LispValue;
    }
    if (this.isRoot()) {
      return null;
    }

    return this.source != null ? this.source.get(aSymbol) : null;
  }

  /**
   * このインスタンスが環境の根であるかどうかを判別し、応答するメソッド
   */
  isRoot(): boolean {
    return this.root;
  }

  /**
   * この環境にインタプリテッドシンボルは登録されていなければ、上書きするメソッド
   */
  setIfExit(aSymbol: unknown, anObject: LispValue): LispValue {
    let answer: LispValue = null;
    if (super.has(aSymbol)) {
      this.set(aSymbol, anObject);
      answer = anObject;
    }
    if (this.isRoot()) {
      answer = null;
    } else if (this.source != null) {
      answer = this.source.setIfExit(aSymbol, anObject);
    }

    return answer;
  }

  /**
   * このインスタンス環境の根があるかどうかを判別し、応答するメソッド
   */
  setRoot(aBoolean: boolean): null {
    this.root = aBoolean;
    return null;
  }

  /**
   * 環境を設定するメソッド
   */
  setSource(aTable: Table | null): null {
    this.source = aTable;
    return null;
  }
}
