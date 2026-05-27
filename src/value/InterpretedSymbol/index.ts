import { Table } from '../../runtime/Table/index.js';

/**
 * @class
 * @classdesc Interpreted symbol with uniqueness, where each printed name maps to a single canonical instance (identity equals equality). A class that mimics canonical strings, distinct from JS's standard Symbol.
 * @author Keisuke Ikeda
 * @this {InterpretedSymbol}
 */
export class InterpretedSymbol extends Object {
  /**
   * Table that stores InterpretedSymbol instances (lazily initialized to avoid a circular dependency).
   */
  static #intern: Table | null = null;
  /**
   * Lazy accessor for the intern table that holds every InterpretedSymbol instance.
   * @return the intern Table (created on first access)
   */
  static get table(): Table {
    this.#intern ??= new Table();
    return this.#intern;
  }

  /**
   * The printed name of this symbol.
   */
  name: string;

  /**
   * Constructor.
   * @constructor
   * @param name printed name
   */
  constructor(name: string = 'null') {
    super();
    this.name = name;
  }

  /**
   * Compares this interpreted symbol with the given one by printed name.
   * @param aSymbol the symbol to compare against
   * @return the difference in string length
   */
  compareTo(aSymbol: InterpretedSymbol): number {
    const left = this.name.codePointAt(0) ?? 0;
    const right = aSymbol.name.codePointAt(0) ?? 0;
    let aNumber = left < right ? aSymbol.name.length - left : left - aSymbol.name.length;
    aNumber = left === right ? 0 : aNumber;

    return aNumber;
  }

  /**
   * Returns whether this symbol equals the given object.
   * @param anObject the object to compare against
   * @return true when identity-equal (since intern guarantees uniqueness)
   */
  equals(anObject: unknown): boolean {
    return this === anObject;
  }

  /**
   * Returns the same interpreted symbol for a given printed name.
   * @param aString printed name
   * @return the canonical InterpretedSymbol for that name
   */
  static of(aString: string): InterpretedSymbol {
    let aSymbol = this.table.get(aString) as InterpretedSymbol | null;

    if (aSymbol == null) {
      aSymbol = new InterpretedSymbol(aString);
      this.table.set(aString, aSymbol);
    }

    return aSymbol;
  }

  /**
   * Returns the string representation of this symbol.
   * @return the printed name
   */
  override toString(): string {
    return this.name;
  }
}
