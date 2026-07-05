import type { Cons } from '../value/Cons/index.js';
import type { HashTable } from '../value/HashTable/index.js';
import type { InterpretedSymbol } from '../value/InterpretedSymbol/index.js';
import type { Rational } from '../value/Rational/index.js';
import type { Vector } from '../value/Vector/index.js';
import type { Table } from '../runtime/Table/index.js';

/**
 * Union of every value the interpreter can store or evaluate.
 *
 * - `Cons` — pairs and lists (including `Cons.nil`)
 * - `InterpretedSymbol` — interned Lisp symbols
 * - `Table` — environment frame (internal use)
 * - `HashTable` — mutable hash table (`make-hash-table`)
 * - `Vector` — mutable one-dimensional vector (`vector` / `make-array`)
 * - `bigint` — integers (arbitrary precision)
 * - `Rational` — exact ratios of integers
 * - `number` — double-precision floats
 * - `string` — string atoms
 * - `null` — internal sentinel, distinct from Lisp `nil` (which is `Cons.nil`)
 */
export type LispValue =
  | Cons
  | InterpretedSymbol
  | Table
  | HashTable
  | Vector
  | number
  | bigint
  | Rational
  | string
  | null;
