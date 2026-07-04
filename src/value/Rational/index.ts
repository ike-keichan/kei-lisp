/**
 * @class
 * @classdesc Exact rational number (numerator / denominator over arbitrary
 * precision integers), always normalized: the denominator is positive, the
 * fraction is reduced, and a denominator of 1 is never represented as a
 * Rational (use `Rational.make`, which returns a bigint instead). Mirrors the
 * ratio type of the Common Lisp / Scheme numeric tower and Clojure's Ratio.
 * @author Keisuke Ikeda
 * @this {Rational}
 */
export class Rational extends Object {
  /**
   * The numerator (carries the sign).
   */
  numerator: bigint;
  /**
   * The denominator (always positive).
   */
  denominator: bigint;

  /**
   * Constructor. Prefer `Rational.make`, which normalizes and demotes
   * integral results to bigint.
   * @constructor
   * @param numerator the numerator (carries the sign)
   * @param denominator the denominator (must be positive)
   */
  constructor(numerator: bigint, denominator: bigint) {
    super();
    this.numerator = numerator;
    this.denominator = denominator;
  }

  /**
   * Returns the normalized rational for the given fraction: reduced, with a
   * positive denominator, demoted to a bigint when the result is integral.
   * @param numerator the numerator
   * @param denominator the denominator (non-zero)
   * @return a bigint for integral results, otherwise a Rational
   */
  static make(numerator: bigint, denominator: bigint): bigint | Rational {
    if (denominator === 0n) {
      throw new RangeError('division by zero');
    }
    let n = numerator;
    let d = denominator;
    if (d < 0n) {
      n = -n;
      d = -d;
    }
    const divisor = Rational.gcd(n < 0n ? -n : n, d);
    if (divisor > 1n) {
      n /= divisor;
      d /= divisor;
    }
    if (d === 1n) {
      return n;
    }

    return new Rational(n, d);
  }

  /**
   * Returns the greatest common divisor of two non-negative bigints.
   * @param left a non-negative bigint
   * @param right a non-negative bigint
   * @return the greatest common divisor
   */
  static gcd(left: bigint, right: bigint): bigint {
    let a = left;
    let b = right;
    while (b !== 0n) {
      [a, b] = [b, a % b];
    }

    return a;
  }

  /**
   * Returns this rational as a (possibly lossy) double-precision float.
   * @return the float approximation
   */
  toNumber(): number {
    return Number(this.numerator) / Number(this.denominator);
  }

  /**
   * Returns whether this rational equals the given object.
   * @param anObject the object to compare against
   * @return a boolean
   */
  equals(anObject: unknown): boolean {
    return (
      anObject instanceof Rational &&
      this.numerator === anObject.numerator &&
      this.denominator === anObject.denominator
    );
  }

  /**
   * Returns the printed representation, e.g. "1/3" or "-2/7".
   * @return the printed representation
   */
  override toString(): string {
    return `${String(this.numerator)}/${String(this.denominator)}`;
  }
}
