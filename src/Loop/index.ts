'use strict';

import type { Cons, LispValue } from '../Cons/index.js';

/**
 * @class
 * @classdesc Consのイテレータクラス
 * @author Keisuke Ikeda
 * @this {Loop}
 */
export class Loop {
  aCons: Cons;
  length: number;
  index: number;

  /**
   * コンストラクタメソッド
   * @param aCons イテレートするCons
   */
  constructor(aCons: Cons) {
    this.aCons = aCons;
    this.length = aCons.length();
    this.index = 1;
  }

  /**
   * 自身を応答するメソッド
   */
  iterator(): Loop {
    return this;
  }

  /**
   * 次の要素があるかどうかを判別し、応答するメソッド
   */
  hasNext(): boolean {
    return this.index <= this.length;
  }

  /**
   * 次の要素を応答するメソッド
   */
  next(): LispValue {
    const anObject = this.aCons.nth(this.index);
    this.remove();

    return anObject;
  }

  /**
   * 反復可能プロトコルiteratorの実装
   * for...ofなどでのイテレートが可能になる。
   */
  [Symbol.iterator](): Iterator<LispValue> {
    return {
      next: (): IteratorResult<LispValue> => {
        if (this.index <= this.length) {
          const nextValue = this.aCons.nth(this.index);
          this.remove();
          return { value: nextValue, done: false };
        }
        // 原本踏襲: value フィールドを含めない
        return { done: true } as IteratorResult<LispValue>;
      },
    };
  }

  /**
   * 非同期反復可能プロトコルasyncIteratorの実装
   * for...ofなどでのイテレートが可能になる。
   */
  [Symbol.asyncIterator](): AsyncIterator<LispValue> {
    return {
      next: (): Promise<IteratorResult<LispValue>> => {
        if (this.index <= this.length) {
          const nextValue = this.aCons.nth(this.index);
          this.remove();
          return Promise.resolve({ value: nextValue, done: false });
        }
        // 原本踏襲: value フィールドを含めない
        return Promise.resolve({ done: true } as IteratorResult<LispValue>);
      },
    };
  }

  /**
   * 次の要素へ移行するメソッド
   */
  remove(): null {
    this.index++;
    return null;
  }
}
