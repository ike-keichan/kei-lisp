import { InterpretedSymbol } from '../InterpretedSymbol/index.js';
import { Loop } from '../Loop/index.js';
import { Parser } from '../Parser/index.js';
import { Table } from '../Table/index.js';

export type LispValue = Cons | InterpretedSymbol | Table | number | string | null;

/**
 * @class
 * @classdesc Consを模倣したクラス
 * @author Keisuke Ikeda
 * @this {Cons}
 */
export class Cons {
  static readonly nil: Cons = new Cons();

  car: LispValue;
  cdr: LispValue;

  /**
   * コンストラクタメソッド
   * @constructor
   * @param car car、引数なしでnilが参照される。
   * @param cdr cdr、引数なしでnilが参照される。
   */
  constructor(car: LispValue = Cons.nil, cdr: LispValue = Cons.nil) {
    this.car = car;
    this.cdr = cdr;
  }

  /**
   * Consの最後に指定された要素を加えるメソッド
   * @param anObject 加えるオブジェクト
   * @return 要素を加えたCons
   */
  add(anObject: LispValue): Cons {
    const aCons = new Cons(anObject, Cons.nil);
    return this.nconc(aCons);
  }

  /**
   * 自身（Cons）を複製し、応答するメソッド
   * @return 複製したCons
   */
  clone(): Cons {
    return new Cons(Cons.cloneValue(this.car), Cons.cloneValue(this.cdr));
  }

  /**
   * 引数の値(Consの要素)を複製し、応答するメソッド
   * @param value Consの要素
   * @return 複製したConsの要素
   */
  static cloneValue(value: LispValue): LispValue {
    if (Cons.isCons(value)) {
      return value.clone();
    }
    if (Cons.isNil(value)) {
      return Cons.nil;
    }
    if (Cons.isNumber(value)) {
      return Number(value);
    }
    if (Cons.isString(value)) {
      return String(value);
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
   * 自身と引数が等しいかをどうかを判別し、応答するメソッド
   * @param anObject 判別するオブジェクト
   * @return 真偽値
   */
  equals(anObject: LispValue): boolean {
    if (Cons.isCons(anObject)) {
      return this.equalsAUX(this, anObject);
    }
    return false;
  }

  /**
   * 2つ引数がともにConsであり、等しいかをどうかを判別し、応答するメソッド
   * @param left 判別するオブジェクト
   * @param right 判別するオブジェクト
   * @return 真偽値
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
   * 引数がAtomかどうかを判別し、応答するメソッド
   */
  static isAtom(anObject: LispValue): boolean {
    return Cons.isNotCons(anObject);
  }

  /**
   * 引数がConsかどうかを判別し、応答するメソッド
   */
  static isCons(anObject: LispValue): anObject is Cons {
    return anObject !== Cons.nil && anObject instanceof Cons;
  }

  /**
   * 引数がListかどうかを判別し、応答するメソッド
   */
  static isList(anObject: LispValue): boolean {
    return Cons.isNil(anObject) || Cons.isCons(anObject);
  }

  /**
   * 引数がNilかどうかを判別し、応答するメソッド
   */
  static isNil(anObject: LispValue): boolean {
    return anObject === Cons.nil;
  }

  /**
   * 引数がConsでないかどうかを判別し、応答するメソッド
   */
  static isNotCons(anObject: LispValue): boolean {
    return !Cons.isCons(anObject);
  }

  /**
   * 引数がListでないかどうかを判別し、応答するメソッド
   */
  static isNotList(anObject: LispValue): boolean {
    return !Cons.isList(anObject);
  }

  /**
   * 引数がNilでないかどうかを判別し、応答するメソッド
   */
  static isNotNil(anObject: LispValue): boolean {
    return !Cons.isNil(anObject);
  }

  /**
   * 引数がインタプリテッドシンボルでないかどうかを判別し、応答するメソッド
   */
  static isNotSymbol(anObject: LispValue): boolean {
    return !Cons.isSymbol(anObject);
  }

  /**
   * 引数が数字かどうかを判別し、応答するメソッド
   */
  static isNumber(anObject: LispValue): anObject is number {
    return typeof anObject === 'number';
  }

  /**
   * 引数が文字列かどうかを判別し、応答するメソッド
   */
  static isString(anObject: LispValue): anObject is string {
    return typeof anObject === 'string';
  }

  /**
   * 引数がインタプリテッドシンボルかどうかを判別し、応答するメソッド
   */
  static isSymbol(anObject: LispValue): anObject is InterpretedSymbol {
    return anObject instanceof InterpretedSymbol;
  }

  /**
   * 引数が環境かどうかを判別し、応答するメソッド
   */
  static isTable(anObject: LispValue): anObject is Table {
    return anObject instanceof Table;
  }

  /**
   * Consの最後のセルを応答するメソッド
   * @return 自身の最後のセル
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
   * Consのイテレータを応答するメソッド
   * @return Consのイテレータ
   */
  loop(): Loop {
    return new Loop(this);
  }

  /**
   * 自身の長さ（深さ）を応答するメソッド
   * @return 自身の長さ（深さ）
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
   * Consを結合するし、自身を応答するメソッド
   * @param aCons 結合するCons
   * @return 自身
   */
  nconc(aCons: Cons): Cons {
    this.last().setCdr(aCons);
    return this;
  }

  /**
   * Consのn番目の要素を応答するメソッド
   * @param aNumber 指定する番号
   * @return 指定した番号の要素
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
   * 指定された文字列を字句解析してConsを生成し、応答するメソッド
   * @param aString 字句解析する文字列
   */
  static parse(aString: string): LispValue {
    return Parser.parse(aString);
  }

  /**
   * carを設定するメソッド
   */
  setCar(anObject: LispValue): null {
    this.car = anObject;
    return null;
  }

  /**
   * cdrを設定するメソッド
   */
  setCdr(anObject: LispValue): null {
    this.cdr = anObject;
    return null;
  }

  /**
   * Consを設定するメソッド
   */
  setCons(car: LispValue, cdr: LispValue): Cons {
    this.car = car;
    this.cdr = cdr;
    return this;
  }

  /**
   * 自身を整形し、文字列として返すメソッド
   */
  toString(): string {
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
   * 引数のオブジェクトを整形し、文字列として返すメソッド
   * @param anObject 整形するオブジェクト
   */
  static toString(anObject: LispValue): string {
    return Cons.isNil(anObject) ? 'nil' : (anObject as { toString(): string }).toString();
  }
}
