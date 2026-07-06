import { Cons } from '../Cons/index.js';
import type { LispValue } from '../../types/index.js';

/**
 * @class
 * @classdesc Mutable one-dimensional vector (simple vector), the aggregate
 * data type behind `vector` / `make-array` / `aref` / `svref`. Provides
 * O(1) indexed access, unlike cons lists.
 * @author Keisuke Ikeda
 * @this {Vector}
 */
export class Vector extends Object {
  /**
   * The elements, in order.
   */
  items: LispValue[];

  /**
   * Constructor.
   * @constructor
   * @param items the initial elements (used as-is, not copied)
   */
  constructor(items: LispValue[] = []) {
    super();
    this.items = items;
  }

  /**
   * Returns the element at the given zero-based index.
   * @param index the zero-based index
   * @return the element
   */
  get(index: number): LispValue {
    if (index < 0 || index >= this.items.length) {
      throw new RangeError(`aref: index ${String(index)} out of range`);
    }
    return this.items[index];
  }

  /**
   * Replaces the element at the given zero-based index.
   * @param index the zero-based index
   * @param value the new element
   * @return the stored value
   */
  set(index: number, value: LispValue): LispValue {
    if (index < 0 || index >= this.items.length) {
      throw new RangeError(`aref: index ${String(index)} out of range`);
    }
    this.items[index] = value;
    return value;
  }

  /**
   * Returns the number of elements.
   * @return the element count
   */
  length(): number {
    return this.items.length;
  }

  /**
   * Returns a shallow clone of this vector.
   * @return the cloned vector
   */
  clone(): Vector {
    return new Vector([...this.items]);
  }

  /**
   * Returns the printed representation, e.g. "#(1 2 3)" (CL vector syntax).
   * @return the printed representation
   */
  override toString(): string {
    return `#(${this.items.map((item) => Cons.toString(item)).join(' ')})`;
  }
}
