import type { Cons } from '../value/Cons/index.js';
import type { InterpretedSymbol } from '../value/InterpretedSymbol/index.js';
import type { Table } from '../runtime/Table/index.js';

/**
 * Union of every value the interpreter can store or evaluate.
 *
 * - `Cons` — pairs and lists (including `Cons.nil`)
 * - `InterpretedSymbol` — interned Lisp symbols
 * - `Table` — environment frame (internal use)
 * - `number` / `string` — primitive atoms
 * - `null` — internal sentinel, distinct from Lisp `nil` (which is `Cons.nil`)
 */
export type LispValue = Cons | InterpretedSymbol | Table | number | string | null;
