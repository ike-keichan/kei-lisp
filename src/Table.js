// #!/usr/bin/env node

'use strict';

//モジュール「Cons」を読み込む。
import { Cons } from './Cons.js';

/**
 * @class
 * @classdesc インタプリテッドシンボルの束縛を管理するクラス
 * @author Keisuke Ikeda
 * @this {Table}
 */
export class Table extends Map {
  /**
   * コンストラクタメソッド
   * @constructor
   * @param {Table} aTable この環境が生まれた環境
   * @return {Table} 自身
   */
  constructor(aTable = null) {
    super();
    this.source = aTable;
    this.root = aTable == null ? true : false;

    return this;
  }

  /**
   * 自身（Table）を複製し、応答するメソッド
   * @return {Table} 複製したTable
   */
  clone() {
    let aTable = new Table(this);
    for (let key of this.keys) {
      let value = Cons.cloneValue(this.get(key));
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
   * @param {Symbol} aSymbol プロパティ（キー）
   * @return {Boolean} 真偽値
   */
  has(aSymbol) {
    if (super.has(aSymbol)) {
      return true;
    }
    if (this.isRoot()) {
      return false;
    }

    return this.source.has(aSymbol);
  }

  /**
   * 自身と引数が等しいかどうかを判別し、応答するメソッド
   * @param {*} anObject 判別するオブジェクト
   * @return {Boolean} 真偽値
   */
  equals(anObject) {
    return super.equals(anObject);
  }

  /**
   * インタプリテッドシンボルが束縛しているものを応答するメソッド
   * @return {Symbol} インタプリテッドシンボル
   * @return {Object} インタプリテッドシンボルが束縛している値
   */
  get(aSymbol) {
    if (super.has(aSymbol)) {
      return super.get(aSymbol);
    }
    if (this.isRoot()) {
      return null;
    }

    return this.source.get(aSymbol);
  }

  /**
   * このインスタンスが環境の根であるかどうかを判別し、応答するメソッド
   * @return {Boolean} 真偽値
   */
  isRoot() {
    return this.root;
  }

  /**
   * この環境にインタプリテッドシンボルは登録されていなければ、上書きするメソッド
   * @param {Symbol} aSymbol 登録するインタプリテッドシンボル
   * @param {*} anObject 束縛する値
   * @return {*} 結果
   */
  setIfExit(aSymbol, anObject) {
    let answer;
    if (super.has(aSymbol)) {
      answer = this.set(aSymbol, anObject);
    }
    if (this.isRoot()) {
      answer = null;
    } else {
      answer = this.source.setIfExit(aSymbol, anObject);
    }

    return answer;
  }

  /**
   * このインスタンス環境の根があるかどうかを判別し、応答するメソッド
   * @param {*} aBoolean
   * @return {Null} 何も返さない
   */
  setRoot(aBoolean) {
    this.root = aBoolean;
    return null;
  }

  /**
   * 環境を設定するメソッド
   * @param {Table} aTable
   * @return {Null} 何も返さない
   */
  setSource(aTable) {
    this.source = aTable;
    return null;
  }
}
