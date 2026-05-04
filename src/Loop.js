// #!/usr/bin/env node

'use strict';

/**
 * @class
 * @classdesc Consのイテレータクラス
 * @author Keisuke Ikeda
 * @this {Loop}
 */
export class Loop extends Object {
  /**
   * コンストラクタメソッド
   * @constructor
   * @param {Cons} aCons イテレートするCons
   * @return {Loop} 自身
   */
  constructor(aCons) {
    super();
    // イテレートするCons
    this.aCons = aCons;
    // イテレートするConsの長さ
    this.length = aCons.length();
    // インデックス番号
    this.index = 1;

    return this;
  }

  /**
   * 自身を応答するメソッド
   * @return {Loop} 自身
   */
  iterator() {
    return this;
  }

  /**
   * 次の要素があるかどうかを判別し、応答するメソッド
   * @return {Boolean} 真偽値
   */
  hasNext() {
    return this.index <= this.length;
  }

  /**
   * 次の要素を応答するメソッド
   * @return {Object} 次の要素
   */
  next() {
    let anObject = this.aCons.nth(this.index);
    this.remove();

    return anObject;
  }

  /**
   * 反復可能プロトコルiteratorの実装
   * for...ofなどでのイテレートが可能になる。
   */
  [Symbol.iterator]() {
    return {
      next: () => {
        if (this.index <= this.length) {
          let nextValue = this.aCons.nth(this.index);
          this.remove();
          return { value: nextValue, done: false };
        } else {
          return { done: true };
        }
      },
    };
  }

  /**
   * 非同期反復可能プロトコルasyncIteratorの実装
   * for...ofなどでのイテレートが可能になる。
   */
  [Symbol.asyncIterator]() {
    return {
      next: () => {
        if (this.index <= this.length) {
          let nextValue = this.aCons.nth(this.index);
          this.remove();
          return Promise.resolve({ value: nextValue, done: false });
        } else {
          return Promise.resolve({ done: true });
        }
      },
    };
  }

  /**
   * 次の要素へ移行するメソッド
   * @return {Null} 何も返さない。
   */
  remove() {
    this.index++;
    return null;
  }
}
