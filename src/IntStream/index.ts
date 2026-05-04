'use strict';

/**
 * @class
 * @classdesc JavaのIntStreamを模倣したクラス
 * @author Keisuke Ikeda
 * @this {IntStream}
 */
export class IntStream {
  /**
   * startからafterEnd(含めない)までの連番の配列を作り、応答するメソッド
   */
  static range(start: number, afterEnd: number): number[] {
    const end = afterEnd - 1;
    return this.rangeClosed(start, end);
  }

  /**
   * startからend(含める)までの連番の配列を作り、応答するメソッド
   */
  static rangeClosed(start: number, end: number): number[] {
    const range = end - start + 1;
    return [...new Array<number>(range)].map(() => start++);
  }
}
