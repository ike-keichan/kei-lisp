// #!/usr/bin/env node

'use strict';

/**
 * @class
 * @classdesc JavaのIntStreamを模倣したクラス
 * @author Keisuke Ikeda
 * @this {IntStream}
 */
export class IntStream extends Object {
  /**
   * startからafterEnd(含めない)までの連番の配列を作り、応答するメソッド
   * @param {Number} start 開始番号
   * @param {Number} afterEnd 終了番号の一つ後ろの番号（含めない）
   * @return {Array} 連番の配列
   */
  static range(start, afterEnd) {
    let end = afterEnd - 1;
    return this.rangeClosed(start, end);
  }

  /**
   * startからend(含める)までの連番の配列を作り、応答するメソッド
   * @param {Number} start 開始番号
   * @param {Number} afterEnd 終了番号（含める）
   * @return {Array} 連番の配列
   */
  static rangeClosed(start, end) {
    let range = end - start + 1;
    return [...new Array(range)].map(() => start++);
  }
}
