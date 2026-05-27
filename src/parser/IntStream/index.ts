/**
 * @class
 * @classdesc Class that mimics Java's IntStream.
 * @author Keisuke Ikeda
 * @this {IntStream}
 */
export class IntStream extends Object {
  /**
   * Builds and returns an array of consecutive integers from start to afterEnd (exclusive).
   * @param start the first integer (inclusive)
   * @param afterEnd the integer one past the last value to include
   * @return the array of integers in [start, afterEnd)
   */
  static range(start: number, afterEnd: number): number[] {
    const end = afterEnd - 1;
    return this.rangeClosed(start, end);
  }

  /**
   * Builds and returns an array of consecutive integers from start to end (inclusive).
   * @param start the first integer (inclusive)
   * @param end the last integer (inclusive)
   * @return the array of integers in [start, end]
   */
  static rangeClosed(start: number, end: number): number[] {
    const range = end - start + 1;
    return Array.from({ length: range }, () => start++);
  }
}
