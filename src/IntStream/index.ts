/**
 * @class
 * @classdesc JavaのIntStreamを模倣したクラス
 * @author Keisuke Ikeda
 * @this {IntStream}
 *
 * 他のモジュールとの一貫性のためクラス形式を保つ。
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class, unicorn/no-static-only-class
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
    // 原本踏襲: post-increment で start を変化させながら配列生成
    // eslint-disable-next-line unicorn/no-new-array, unicorn/no-useless-spread
    return [...new Array<number>(range)].map(() => start++);
  }
}
