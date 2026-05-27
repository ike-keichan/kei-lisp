import { InterpretedSymbol } from '../InterpretedSymbol/index.js';
import { Loop } from '../Loop/index.js';
import { Parser } from '../../parser/Parser/index.js';
import { Table } from '../../runtime/Table/index.js';
import type { LispValue } from '../../types/index.js';

/**
 * @class
 * @classdesc Class that mimics a Cons cell.
 * @author Keisuke Ikeda
 * @this {Cons}
 */
export class Cons extends Object {
  /**
   * The shared empty-list sentinel. A Cons whose car and cdr are both itself, representing Lisp `nil`.
   */
  static readonly nil: Cons = new Cons();

  /**
   * The head element of this Cons cell.
   */
  car: LispValue;
  /**
   * The tail of this Cons cell (typically another Cons or nil).
   */
  cdr: LispValue;

  /**
   * Constructor.
   * @constructor
   * @param car the car; defaults to nil when no argument is given.
   * @param cdr the cdr; defaults to nil when no argument is given.
   */
  constructor(car: LispValue = Cons.nil, cdr: LispValue = Cons.nil) {
    super();
    this.car = car;
    this.cdr = cdr;
  }

  /**
   * Appends the given element to the end of this Cons.
   * @param anObject the object to append
   * @return the Cons with the element appended
   */
  add(anObject: LispValue): this {
    const aCons = new Cons(anObject, Cons.nil);
    return this.nconc(aCons);
  }

  /**
   * Clones this Cons and returns the clone.
   * @return the cloned Cons
   */
  clone(): Cons {
    return new Cons(Cons.cloneValue(this.car), Cons.cloneValue(this.cdr));
  }

  /**
   * Clones the given value (a Cons element) and returns the clone.
   * @param value a Cons element
   * @return the cloned element
   */
  static cloneValue(value: LispValue): LispValue {
    if (Cons.isCons(value)) {
      return value.clone();
    }
    if (Cons.isNil(value)) {
      return Cons.nil;
    }
    if (Cons.isNumber(value)) {
      return value;
    }
    if (Cons.isString(value)) {
      return value;
    }
    if (Cons.isSymbol(value)) {
      return value;
    }
    if (Cons.isTable(value)) {
      return value;
    }
    return value;
  }

  /**
   * Returns whether this Cons equals the given object.
   * @param anObject the object to compare against
   * @return a boolean
   */
  equals(anObject: LispValue): boolean {
    if (Cons.isCons(anObject)) {
      return this.equalsAUX(this, anObject);
    }
    return false;
  }

  /**
   * Returns whether both arguments are Cons cells and are equal.
   * @param left the object to compare
   * @param right the object to compare
   * @return a boolean
   */
  equalsAUX(left: LispValue, right: LispValue): boolean {
    if (left === right) {
      return true;
    }
    if (!(Cons.isCons(left) && Cons.isCons(right))) {
      return false;
    }
    if (this.equalsAUX(left.car, right.car)) {
      return this.equalsAUX(left.cdr, right.cdr);
    }

    return false;
  }

  /**
   * Returns whether the given argument is an Atom.
   */
  static isAtom(anObject: LispValue): boolean {
    return Cons.isNotCons(anObject);
  }

  /**
   * Returns whether the given argument is a Cons.
   */
  static isCons(anObject: LispValue): anObject is Cons {
    return anObject !== Cons.nil && anObject instanceof Cons;
  }

  /**
   * Returns whether the given argument is a List.
   */
  static isList(anObject: LispValue): boolean {
    return Cons.isNil(anObject) || Cons.isCons(anObject);
  }

  /**
   * Returns whether the given argument is Nil.
   */
  static isNil(anObject: LispValue): boolean {
    return anObject === Cons.nil;
  }

  /**
   * Returns whether the given argument is not a Cons.
   */
  static isNotCons(anObject: LispValue): boolean {
    return !Cons.isCons(anObject);
  }

  /**
   * Returns whether the given argument is not a List.
   */
  static isNotList(anObject: LispValue): boolean {
    return !Cons.isList(anObject);
  }

  /**
   * Returns whether the given argument is not Nil.
   */
  static isNotNil(anObject: LispValue): boolean {
    return !Cons.isNil(anObject);
  }

  /**
   * Returns whether the given argument is not an interpreted symbol.
   */
  static isNotSymbol(anObject: LispValue): boolean {
    return !Cons.isSymbol(anObject);
  }

  /**
   * Returns whether the given argument is a number.
   */
  static isNumber(anObject: LispValue): anObject is number {
    return typeof anObject === 'number';
  }

  /**
   * Returns whether the given argument is a string.
   */
  static isString(anObject: LispValue): anObject is string {
    return typeof anObject === 'string';
  }

  /**
   * Returns whether the given argument is an interpreted symbol.
   */
  static isSymbol(anObject: LispValue): anObject is InterpretedSymbol {
    return anObject instanceof InterpretedSymbol;
  }

  /**
   * Returns whether the given argument is an environment.
   */
  static isTable(anObject: LispValue): anObject is Table {
    return anObject instanceof Table;
  }

  /**
   * Returns the last cell of this Cons.
   * @return this Cons's last cell
   */
  last(): Cons {
    let theCons: Cons = new Cons(Cons.nil, this);
    let aCons: Cons = this;

    while (Cons.isCons(aCons)) {
      if (!Cons.isCons(aCons.cdr)) {
        break;
      }
      theCons = theCons.cdr as Cons;
      aCons = aCons.cdr;
    }

    return aCons;
  }

  /**
   * Returns an iterator over this Cons.
   * @return an iterator over this Cons
   */
  loop(): Loop {
    return new Loop(this);
  }

  /**
   * Returns the length (depth) of this Cons.
   * @return the length (depth) of this Cons
   */
  length(): number {
    let count = 0;
    let aCons: LispValue = this;

    while (Cons.isCons(aCons)) {
      count++;
      aCons = aCons.cdr;
    }

    return count;
  }

  /**
   * Concatenates the given Cons and returns this Cons.
   * @param aCons the Cons to concatenate
   * @return this Cons
   */
  nconc(aCons: Cons): this {
    this.last().setCdr(aCons);
    return this;
  }

  /**
   * Returns the nth element of this Cons.
   * @param aNumber the index to retrieve
   * @return the element at the given index
   */
  nth(aNumber: number): LispValue {
    if (aNumber <= 0) {
      return Cons.nil;
    }
    let count = 1;
    let aCons: LispValue = this;
    while (Cons.isCons(aCons)) {
      if (count >= aNumber) {
        return aCons.car;
      }
      count++;
      aCons = aCons.cdr;
    }

    return Cons.nil;
  }

  /**
   * Lexes the given string into a Cons and returns it.
   * @param aString the string to lex
   */
  static parse(aString: string): LispValue {
    return Parser.parse(aString);
  }

  /**
   * Sets the car.
   */
  setCar(anObject: LispValue): null {
    this.car = anObject;
    return null;
  }

  /**
   * Sets the cdr.
   */
  setCdr(anObject: LispValue): null {
    this.cdr = anObject;
    return null;
  }

  /**
   * Sets both the car and the cdr.
   */
  setCons(car: LispValue, cdr: LispValue): this {
    this.car = car;
    this.cdr = cdr;
    return this;
  }

  /**
   * Returns a formatted string representation of this Cons.
   */
  override toString(): string {
    let aString = '';
    if (Cons.isNil(this)) {
      aString += Cons.toString(Cons.nil);
    } else {
      aString += '(' + Cons.toString(this.car);

      if (Cons.isNil(this.cdr)) {
        aString += ')';
      } else if (this.cdr instanceof Cons) {
        let aCons: LispValue = this.cdr;
        while (Cons.isCons(aCons)) {
          const head = aCons.car;
          if (!(head instanceof Table)) {
            aString += ' ' + Cons.toString(head);
          }
          aCons = aCons.cdr;
        }
        aString += Cons.isNil(aCons) ? ')' : ' . ' + Cons.toString(aCons) + ')';
      } else {
        aString += ' . ' + Cons.toString(this.cdr) + ')';
      }
    }

    return aString;
  }

  /**
   * Returns a formatted string representation of the given object.
   * @param anObject the object to format
   */
  static override toString(anObject: LispValue): string {
    return Cons.isNil(anObject) ? 'nil' : (anObject as { toString(): string }).toString();
  }
}
