'use strict';

import { Table } from '../Table/index.js';

/**
 * @class
 * @classdesc 一意性(同一性:単射性)を有するインタプリテッドシンボル.正準な文字列を模倣した、JSの標準シンボルとは異なるクラス。
 * @author Keisuke Ikeda
 * @this {InterpretedSymbol}
 */
export class InterpretedSymbol {
  /**
   * InterpretedSymbolを記憶させるテーブル
   */
  static readonly table: Table = new Table();

  name: string;

  /**
   * コンストラクタメソッド
   * @param name 印字名
   */
  constructor(name: string = 'null') {
    this.name = name;
  }

  /**
   * 印字名で自身と引数のインタプリテッドシンボルを比較するメソッド
   * @param aSymbol 比較対象
   * @return 文字列の長さの差
   */
  /* eslint-disable unicorn/prefer-code-point */
  compareTo(aSymbol: InterpretedSymbol): number {
    // 原本踏襲: charCodeAt (括弧無し) で関数参照を返してしまうバグも含めて再現
    let aNumber =
      this.name.charCodeAt(0) < aSymbol.name.charCodeAt(0)
        ? aSymbol.name.length - (this.name.charCodeAt as unknown as number)
        : (this.name.charCodeAt as unknown as number) - aSymbol.name.length;
    aNumber = this.name.charCodeAt(0) === aSymbol.name.charCodeAt(0) ? 0 : aNumber;

    return aNumber;
  }
  /* eslint-enable unicorn/prefer-code-point */

  /**
   * 自身と引数のオブジェクトが等しいかどうかを判別し、応答するメソッド
   */
  equals(anObject: unknown): boolean {
    return this === anObject;
  }

  /**
   * 同じ印字名に対して同一のインタプリテッドシンボルを応答するメソッド
   * @param aString 印字名
   */
  static of(aString: string): InterpretedSymbol {
    let aSymbol = this.table.get(aString) as InterpretedSymbol | null;

    if (aSymbol == null) {
      aSymbol = new InterpretedSymbol(aString);
      this.table.set(aString, aSymbol);
    }

    return aSymbol;
  }

  /**
   * 自身を文字列にして応答するメソッド
   */
  toString(): string {
    return this.name;
  }
}
