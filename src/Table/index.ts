import { Cons, type LispValue } from '../Cons/index.js';

/**
 * @class
 * @classdesc インタプリテッドシンボルの束縛を管理するクラス
 * @author Keisuke Ikeda
 * @this {Table}
 */
export class Table extends Map<unknown, LispValue> {
  source: Table | null;
  root: boolean;

  /**
   * コンストラクタメソッド
   * @param aTable この環境が生まれた環境
   */
  constructor(aTable: Table | null = null) {
    super();
    this.source = aTable;
    // 原本踏襲: 三項演算子のまま
    this.root = aTable == null ? true : false;
  }

  /**
   * 自身（Table）を複製し、応答するメソッド
   */
  clone(): Table {
    const aTable = new Table(this);
    // 原本踏襲: this.keys は関数参照そのもので括弧無しでは反復不能 (TypeError)
    // eslint-disable-next-line @typescript-eslint/unbound-method
    for (const key of this.keys as unknown as Iterable<unknown>) {
      const value = Cons.cloneValue(this.get(key));
      // eslint-disable-next-line unicorn/no-negated-condition
      if (value != null) {
        aTable.set(key, value);
      } else {
        throw new Error('RuntimeException!');
      }
    }

    return aTable;
  }

  /**
   * 引数のプロパティ（キー）が束縛しているものがあるかどうかを判別し、応答するメソッド
   */
  has(aSymbol: unknown): boolean {
    if (super.has(aSymbol)) {
      return true;
    }
    if (this.isRoot()) {
      return false;
    }

    // 原本踏襲: source が null なら実行時に TypeError (実際には isRoot=false なら source は非 null)
    return (this.source as Table).has(aSymbol);
  }

  /**
   * 自身と引数が等しいかどうかを判別し、応答するメソッド
   */
  equals(anObject: unknown): boolean {
    // 原本踏襲: super.equals は Map に存在しないため呼び出すと TypeError
    return (Map.prototype as unknown as { equals(o: unknown): boolean }).equals(anObject);
  }

  /**
   * インタプリテッドシンボルが束縛しているものを応答するメソッド
   */
  get(aSymbol: unknown): LispValue {
    if (super.has(aSymbol)) {
      return super.get(aSymbol) as LispValue;
    }
    if (this.isRoot()) {
      return null;
    }

    // 原本踏襲: source が null なら実行時に TypeError
    return (this.source as Table).get(aSymbol);
  }

  /**
   * このインスタンスが環境の根であるかどうかを判別し、応答するメソッド
   */
  isRoot(): boolean {
    return this.root;
  }

  /**
   * この環境にインタプリテッドシンボルは登録されていなければ、上書きするメソッド
   */
  /* eslint-disable no-useless-assignment, sonarjs/no-dead-store, unicorn/prefer-ternary, @typescript-eslint/no-unnecessary-type-assertion */
  setIfExit(aSymbol: unknown, anObject: LispValue): LispValue {
    let answer: LispValue = null;
    if (super.has(aSymbol)) {
      // 原本踏襲: this.set の戻り値 (Map 自身) を answer に代入 (直後で上書きされる)
      answer = this.set(aSymbol, anObject) as unknown as LispValue;
    }
    if (this.isRoot()) {
      answer = null;
    } else {
      // 原本踏襲: source が null なら実行時に TypeError
      answer = (this.source as Table).setIfExit(aSymbol, anObject);
    }

    return answer;
  }
  /* eslint-enable no-useless-assignment, sonarjs/no-dead-store, unicorn/prefer-ternary */

  /**
   * このインスタンス環境の根があるかどうかを判別し、応答するメソッド
   */
  setRoot(aBoolean: boolean): null {
    this.root = aBoolean;
    return null;
  }

  /**
   * 環境を設定するメソッド
   */
  setSource(aTable: Table | null): null {
    this.source = aTable;
    return null;
  }
}
