import type { Cons } from '../Cons/index.js';
import type { LispValue } from '../../types/index.js';

/**
 * @class
 * @classdesc Iterator class for Cons.
 * @author Keisuke Ikeda
 * @this {Loop}
 */
export class Loop extends Object {
  /**
   * The Cons being iterated over.
   */
  aCons: Cons;
  /**
   * The number of elements in the underlying Cons (computed once at construction time).
   */
  length: number;
  /**
   * The 1-based index of the next element to return.
   */
  index: number;

  /**
   * Constructor.
   * @constructor
   * @param aCons the Cons to iterate over
   */
  constructor(aCons: Cons) {
    super();
    this.aCons = aCons;
    this.length = aCons.length();
    this.index = 1;
  }

  /**
   * Returns this instance so it can be used as its own iterator.
   * @return this Loop instance
   */
  iterator(): this {
    return this;
  }

  /**
   * Returns whether a next element exists.
   * @return true if there is at least one more element
   */
  hasNext(): boolean {
    return this.index <= this.length;
  }

  /**
   * Returns the next element and advances the cursor.
   * @return the element at the current index
   */
  next(): LispValue {
    const anObject = this.aCons.nth(this.index);
    this.remove();

    return anObject;
  }

  /**
   * Implementation of the iterable protocol. Enables iteration with for...of and similar constructs.
   * @return an iterator over the Cons elements
   */
  [Symbol.iterator](): Iterator<LispValue> {
    return {
      next: (): IteratorResult<LispValue> => {
        if (this.index <= this.length) {
          const nextValue = this.aCons.nth(this.index);
          this.remove();
          return { value: nextValue, done: false };
        }
        return { done: true } as IteratorResult<LispValue>;
      },
    };
  }

  /**
   * Implementation of the async iterable protocol. Enables iteration with for await...of and similar constructs.
   * @return an async iterator over the Cons elements
   */
  [Symbol.asyncIterator](): AsyncIterator<LispValue> {
    return {
      next: (): Promise<IteratorResult<LispValue>> => {
        if (this.index <= this.length) {
          const nextValue = this.aCons.nth(this.index);
          this.remove();
          return Promise.resolve({ value: nextValue, done: false });
        }
        return Promise.resolve({ done: true } as IteratorResult<LispValue>);
      },
    };
  }

  /**
   * Advances the cursor to the next element.
   * @return null
   */
  remove(): null {
    this.index++;
    return null;
  }
}
