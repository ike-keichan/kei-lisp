import { Rational } from '../Rational/index.js';

/**
 * Union of the numeric tower representations: bigint (integer), Rational
 * (exact ratio), and number (double-precision float).
 */
export type NumericValue = bigint | Rational | number;

/**
 * @class
 * @classdesc Arithmetic over the numeric tower (integer → rational → float).
 * Operations on exact operands (bigint / Rational) stay exact; as soon as a
 * float is involved the result is a float (float contagion), matching the
 * Common Lisp / Scheme numeric towers and Clojure's Ratio arithmetic.
 * @author Keisuke Ikeda
 * @this {Numeric}
 */
export class Numeric extends Object {
  /**
   * Returns whether the given value belongs to the numeric tower.
   * @param value the value to test
   * @return a boolean
   */
  static isNumeric(value: unknown): value is NumericValue {
    return typeof value === 'number' || typeof value === 'bigint' || value instanceof Rational;
  }

  /**
   * Returns the float approximation of a numeric value.
   * @param value the numeric value
   * @return the float approximation
   */
  static toFloat(value: NumericValue): number {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'bigint') {
      return Number(value);
    }

    return value.toNumber();
  }

  /**
   * Returns an exact value as a Rational-shaped pair (bigint stays n/1).
   * @param value an exact numeric value (bigint or Rational)
   * @return the numerator and denominator
   */
  static toFraction(value: bigint | Rational): { numerator: bigint; denominator: bigint } {
    if (typeof value === 'bigint') {
      return { numerator: value, denominator: 1n };
    }

    return { numerator: value.numerator, denominator: value.denominator };
  }

  /**
   * Returns whether either operand is a float (which forces float contagion).
   * @param left the left operand
   * @param right the right operand
   * @return a boolean
   */
  static eitherFloat(left: NumericValue, right: NumericValue): boolean {
    return typeof left === 'number' || typeof right === 'number';
  }

  /**
   * Adds two numeric values with contagion.
   * @param left the left operand
   * @param right the right operand
   * @return the sum
   */
  static add(left: NumericValue, right: NumericValue): NumericValue {
    if (Numeric.eitherFloat(left, right)) {
      return Numeric.toFloat(left) + Numeric.toFloat(right);
    }
    const a = Numeric.toFraction(left as bigint | Rational);
    const b = Numeric.toFraction(right as bigint | Rational);

    return Rational.make(
      a.numerator * b.denominator + b.numerator * a.denominator,
      a.denominator * b.denominator,
    );
  }

  /**
   * Subtracts two numeric values with contagion.
   * @param left the left operand
   * @param right the right operand
   * @return the difference
   */
  static subtract(left: NumericValue, right: NumericValue): NumericValue {
    return Numeric.add(left, Numeric.negate(right));
  }

  /**
   * Multiplies two numeric values with contagion.
   * @param left the left operand
   * @param right the right operand
   * @return the product
   */
  static multiply(left: NumericValue, right: NumericValue): NumericValue {
    if (Numeric.eitherFloat(left, right)) {
      return Numeric.toFloat(left) * Numeric.toFloat(right);
    }
    const a = Numeric.toFraction(left as bigint | Rational);
    const b = Numeric.toFraction(right as bigint | Rational);

    return Rational.make(a.numerator * b.numerator, a.denominator * b.denominator);
  }

  /**
   * Divides two numeric values with contagion. Exact division of exact
   * operands yields an exact result (an integer or a rational, CL
   * semantics: `(/ 1 2)` is `1/2`). Division of exact operands by exact
   * zero throws a RangeError.
   * @param left the left operand
   * @param right the right operand
   * @return the quotient
   */
  static divide(left: NumericValue, right: NumericValue): NumericValue {
    if (Numeric.eitherFloat(left, right)) {
      return Numeric.toFloat(left) / Numeric.toFloat(right);
    }
    const a = Numeric.toFraction(left as bigint | Rational);
    const b = Numeric.toFraction(right as bigint | Rational);

    return Rational.make(a.numerator * b.denominator, a.denominator * b.numerator);
  }

  /**
   * Negates a numeric value, preserving its representation.
   * @param value the numeric value
   * @return the negated value
   */
  static negate(value: NumericValue): NumericValue {
    if (typeof value === 'number') {
      return -value;
    }
    if (typeof value === 'bigint') {
      return -value;
    }

    return new Rational(-value.numerator, value.denominator);
  }

  /**
   * Returns the absolute value, preserving the representation.
   * @param value the numeric value
   * @return the absolute value
   */
  static abs(value: NumericValue): NumericValue {
    return Numeric.compare(value, 0n) < 0 ? Numeric.negate(value) : value;
  }

  /**
   * Compares two numeric values across representations.
   * @param left the left operand
   * @param right the right operand
   * @return a negative number, zero, or a positive number
   */
  static compare(left: NumericValue, right: NumericValue): number {
    if (Numeric.eitherFloat(left, right)) {
      const a = Numeric.toFloat(left);
      const b = Numeric.toFloat(right);
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    }
    const a = Numeric.toFraction(left as bigint | Rational);
    const b = Numeric.toFraction(right as bigint | Rational);
    const difference = a.numerator * b.denominator - b.numerator * a.denominator;
    if (difference < 0n) return -1;
    if (difference > 0n) return 1;

    return 0;
  }

  /**
   * Returns whether two numeric values are numerically equal (across
   * representations, like CL `=`): `(= 1 1.0)` holds, `(= 1/2 0.5)` holds.
   * @param left the left operand
   * @param right the right operand
   * @return a boolean
   */
  static equals(left: NumericValue, right: NumericValue): boolean {
    return Numeric.compare(left, right) === 0;
  }

  /**
   * Returns the remainder with the sign behavior of JS `%` (truncated
   * division), preserving exactness for exact operands.
   * @param left the dividend
   * @param right the divisor
   * @return the remainder
   */
  static mod(left: NumericValue, right: NumericValue): NumericValue {
    if (Numeric.eitherFloat(left, right)) {
      return Numeric.toFloat(left) % Numeric.toFloat(right);
    }
    if (typeof left === 'bigint' && typeof right === 'bigint') {
      if (right === 0n) {
        throw new RangeError('division by zero');
      }
      return left % right;
    }
    const quotient = Numeric.truncate(Numeric.divide(left, right));

    return Numeric.subtract(left, Numeric.multiply(right, quotient));
  }

  /**
   * Truncates toward zero to an integer (bigint).
   * @param value the numeric value
   * @return the truncated integer
   */
  static truncate(value: NumericValue): bigint {
    if (typeof value === 'bigint') {
      return value;
    }
    if (typeof value === 'number') {
      return BigInt(Math.trunc(value));
    }

    return value.numerator / value.denominator;
  }

  /**
   * Rounds toward negative infinity to an integer (bigint).
   * @param value the numeric value
   * @return the floor integer
   */
  static floor(value: NumericValue): bigint {
    if (typeof value === 'bigint') {
      return value;
    }
    if (typeof value === 'number') {
      return BigInt(Math.floor(value));
    }
    const truncated = value.numerator / value.denominator;

    return value.numerator < 0n ? truncated - 1n : truncated;
  }

  /**
   * Rounds toward positive infinity to an integer (bigint).
   * @param value the numeric value
   * @return the ceiling integer
   */
  static ceiling(value: NumericValue): bigint {
    if (typeof value === 'bigint') {
      return value;
    }
    if (typeof value === 'number') {
      return BigInt(Math.ceil(value));
    }
    const truncated = value.numerator / value.denominator;

    return value.numerator > 0n ? truncated + 1n : truncated;
  }

  /**
   * Rounds half away from zero to an integer (bigint), matching
   * `Math.round` for floats.
   * @param value the numeric value
   * @return the rounded integer
   */
  static round(value: NumericValue): bigint {
    if (typeof value === 'bigint') {
      return value;
    }

    return BigInt(Math.round(Numeric.toFloat(value)));
  }

  /**
   * Raises a base to a power. Exact for an exact base with a non-negative
   * integer exponent; otherwise computed as floats.
   * @param base the base
   * @param exponent the exponent
   * @return the power
   */
  static expt(base: NumericValue, exponent: NumericValue): NumericValue {
    if (typeof exponent === 'bigint' && typeof base !== 'number') {
      if (exponent >= 0n) {
        const fraction = Numeric.toFraction(base);
        return Rational.make(fraction.numerator ** exponent, fraction.denominator ** exponent);
      }
      return Numeric.divide(1n, Numeric.expt(base, -exponent));
    }

    return Math.pow(Numeric.toFloat(base), Numeric.toFloat(exponent));
  }

  /**
   * Converts an integral numeric value into a JS array/list index.
   * @param value the numeric value
   * @return the index as a number, or null when not an integral value
   */
  static toIndex(value: unknown): number | null {
    if (typeof value === 'bigint') {
      return Number(value);
    }
    if (typeof value === 'number' && Number.isInteger(value)) {
      return value;
    }

    return null;
  }
}
