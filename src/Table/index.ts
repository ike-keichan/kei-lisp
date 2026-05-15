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
    for (const key of this.keys()) {
      const value = Cons.cloneValue(this.get(key));
      if (value == null) {
        throw new Error('RuntimeException!');
      }
      aTable.set(key, value);
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
   * 最も内側のスコープで束縛されているシンボルを再代入するメソッド (Common Lisp の setq 相当)。
   * 現スコープに束縛があれば現スコープを更新して終了し、無ければ親スコープに再帰する。
   */
  setIfExit(aSymbol: unknown, anObject: LispValue): LispValue {
    if (super.has(aSymbol)) {
      this.set(aSymbol, anObject);
      return anObject;
    }
    if (this.isRoot()) {
      return null;
    }
    return (this.source as Table).setIfExit(aSymbol, anObject);
  }

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

  /**
   * 自身を整形し、文字列として返すメソッド
   */
  toString(): string {
    return '#<Environment>';
  }
}
