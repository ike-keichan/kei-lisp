import type { Cons } from '../Cons/index.js';
import type { LispValue } from '../../types/index.js';

/**
 * @class
 * @classdesc Iterator class for Cons.
 * @author Keisuke Ikeda
 * @this {Loop}
 */
export class Loop {
  aCons: Cons;
  length: number;
  index: number;

  /**
   * Constructor.
   * @param aCons the Cons to iterate over
   */
  constructor(aCons: Cons) {
    this.aCons = aCons;
    this.length = aCons.length();
    this.index = 1;
  }

  /**
   * Returns this instance.
   */
  iterator(): this {
    return this;
  }

  /**
   * Returns whether a next element exists.
   */
  hasNext(): boolean {
    return this.index <= this.length;
  }

  /**
   * Returns the next element.
   */
  next(): LispValue {
    const anObject = this.aCons.nth(this.index);
    this.remove();

    return anObject;
  }

  /**
   * Implementation of the iterable protocol.
   * Enables iteration with for...of and similar constructs.
   */
  [Symbol.iterator](): Iterator<LispValue> {
    return {
      next: (): IteratorResult<LispValue> => {
        if (this.index <= this.length) {
          const nextValue = this.aCons.nth(this.index);
          this.remove();
          return { value: nextValue, done: false };
        }
        // Following the original: omit the value field.
        return { done: true } as IteratorResult<LispValue>;
      },
    };
  }

  /**
   * Implementation of the async iterable protocol.
   * Enables iteration with for await...of and similar constructs.
   */
  [Symbol.asyncIterator](): AsyncIterator<LispValue> {
    return {
      next: (): Promise<IteratorResult<LispValue>> => {
        if (this.index <= this.length) {
          const nextValue = this.aCons.nth(this.index);
          this.remove();
          return Promise.resolve({ value: nextValue, done: false });
        }
        // Following the original: omit the value field.
        return Promise.resolve({ done: true } as IteratorResult<LispValue>);
      },
    };
  }

  /**
   * Advances to the next element.
   */
  remove(): null {
    this.index++;
    return null;
  }
}
