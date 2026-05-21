/**
 * @class
 * @classdesc Class that mimics Java's IntStream.
 * @author Keisuke Ikeda
 * @this {IntStream}
 */
export class IntStream {
  /**
   * Builds and returns an array of consecutive integers from start to afterEnd (exclusive).
   */
  static range(start: number, afterEnd: number): number[] {
    const end = afterEnd - 1;
    return this.rangeClosed(start, end);
  }

  /**
   * Builds and returns an array of consecutive integers from start to end (inclusive).
   */
  static rangeClosed(start: number, end: number): number[] {
    const range = end - start + 1;
    return Array.from({ length: range }, () => start++);
  }
}
