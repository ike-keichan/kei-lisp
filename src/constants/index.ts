import type { LispValue } from '../types/index.js';

/**
 * User-facing diagnostic message templates emitted by the interpreter.
 * Centralizing them keeps wording consistent and makes future i18n trivial.
 */

/** Builtin/special-form type-mismatch: `Can not apply "<fn>" to "<value>"`. */
export const cannotApply = (fn: string, value: LispValue): string =>
  `Can not apply "${fn}" to "${String(value)}"`;

/** Symbol argument validation: `"<value>" is not symbol`. */
export const notSymbol = (value: LispValue): string => `"${String(value)}" is not symbol`;

/** Unbound symbol lookup: `I could find no variable binding for <symbol>`. */
export const noBinding = (symbol: LispValue): string =>
  `I could find no variable binding for ${String(symbol)}`;

/** Unknown procedure: `I could find no procedure description for <procedure>`. */
export const noProcedure = (procedure: LispValue): string =>
  `I could find no procedure description for ${String(procedure)}`;

/** Positional argument validation: `arguments N is not symbol.`. */
export const argumentNotSymbol = (position: number): string =>
  `arguments ${String(position)} is not symbol.`;

/** Multi-list arity mismatch. */
export const SIZES_DO_NOT_MATCH = 'sizes do not match.';

/** Intentional ungrammatical wording: kept as-is for backward compatibility of error messages. */
export const SIZE_DO_NOT_MATCH = 'size do not match.';
