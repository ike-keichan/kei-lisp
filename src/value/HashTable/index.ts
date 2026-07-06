import type { LispValue } from '../../types/index.js';

/**
 * @class
 * @classdesc Mutable hash table keyed by identity (`eq`), the aggregate data
 * type behind `make-hash-table` / `gethash` / `remhash`. Interned symbols
 * (including keywords), integers, and strings all hash by value, matching
 * CL's default `eql` test closely enough for kei-lisp's value model.
 * @author Keisuke Ikeda
 * @this {HashTable}
 */
export class HashTable extends Object {
  /**
   * The underlying JS Map (JS SameValueZero keying ≈ identity for kei-lisp values).
   */
  entries: Map<LispValue, LispValue>;

  /**
   * Constructor.
   * @constructor
   */
  constructor() {
    super();
    this.entries = new Map();
  }

  /**
   * Returns the value stored under the key, or null when absent.
   * @param key the key
   * @return the stored value, or null
   */
  get(key: LispValue): LispValue | null {
    return this.entries.has(key) ? (this.entries.get(key) as LispValue) : null;
  }

  /**
   * Stores a value under the key.
   * @param key the key
   * @param value the value
   * @return the stored value
   */
  set(key: LispValue, value: LispValue): LispValue {
    this.entries.set(key, value);
    return value;
  }

  /**
   * Removes the key and returns whether it was present.
   * @param key the key
   * @return a boolean
   */
  remove(key: LispValue): boolean {
    return this.entries.delete(key);
  }

  /**
   * Returns the number of entries.
   * @return the entry count
   */
  count(): number {
    return this.entries.size;
  }

  /**
   * Returns a shallow clone of this hash table.
   * @return the cloned hash table
   */
  clone(): HashTable {
    const aTable = new HashTable();
    for (const [key, value] of this.entries) {
      aTable.entries.set(key, value);
    }
    return aTable;
  }

  /**
   * Returns the printed representation, e.g. "#<hash-table :count 2>".
   * @return the printed representation
   */
  override toString(): string {
    return `#<hash-table :count ${String(this.entries.size)}>`;
  }
}
