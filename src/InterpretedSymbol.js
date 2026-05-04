// #!/usr/bin/env node

'use strict';

import { Table } from './Table';

/**
 * @class
 * @classdesc 一意性(同一性:単射性)を有するインタプリテッドシンボル.正準な文字列を模倣した、JSの標準シンボルとは異なるクラス。
 * @author Keisuke Ikeda
 * @this {InterpretedSymbol}
 */
export class InterpretedSymbol extends Object {
  /**
   * InterpretedSymbolを記憶させるテーブル
   */
  static table = new Table();

  /**
   * コンストラクタメソッド
   * @constructor
   * @param {String} name
   * @return {InterpretedSymbol} 自身
   */
  constructor(name = 'null') {
    super();
    this.name = name;
    return this;
  }

  /**
   * 印字名で自身と引数のインタプリテッドシンボルを比較するメソッド
   * @param {InterpretedSymbol} aSymbol
   * @return {Number} 文字列の長さの差
   */
  compareTo(aSymbol) {
    let aNumber =
      this.name.charCodeAt(0) < aSymbol.name.charCodeAt(0)
        ? aSymbol.name.length - this.name.charCodeAt
        : this.name.charCodeAt - aSymbol.name.length;
    aNumber = this.name.charCodeAt(0) == aSymbol.name.charCodeAt(0) ? 0 : aNumber;

    return aNumber;
  }

  /**
   * 自身と引数のオブジェクトが等しいかどうかを判別し、応答するメソッド
   * @param {*} anObject
   * @return {Boolean} 真偽値
   */
  equals(anObject) {
    return this === anObject;
  }

  /**
   * 同じ印字名に対して同一のインタプリテッドシンボルを応答するメソッド
   * @param {String} aString 印字名
   * @return {InterpretedSymbol} 引数と同一のインタプリテッドシンボル
   */
  static of(aString) {
    let aSymbol = this.table.get(aString);

    if (aSymbol == null) {
      aSymbol = new InterpretedSymbol(aString);
      this.table.set(aString, aSymbol);
    }

    return aSymbol;
  }

  /**
   * 自身を文字列にして応答するメソッド
   * @return {String} 自身の文字列
   */
  toString() {
    return this.name;
  }
}
