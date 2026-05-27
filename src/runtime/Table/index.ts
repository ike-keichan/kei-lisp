import { Cons } from '../../value/Cons/index.js';
import type { LispValue } from '../../types/index.js';

/**
 * @class
 * @classdesc Class that manages bindings of interpreted symbols.
 * @author Keisuke Ikeda
 * @this {Table}
 */
export class Table extends Map<unknown, LispValue> {
  /**
   * The enclosing (parent) environment, or null when this is the root.
   */
  source: Table | null;
  /**
   * Whether this environment is the root of its chain.
   */
  root: boolean;

  /**
   * Constructor.
   * @constructor
   * @param aTable the environment in which this environment was created
   */
  constructor(aTable: Table | null = null) {
    super();
    this.source = aTable;
    this.root = aTable == null;
  }

  /**
   * Clones this Table and returns the clone.
   * @return the cloned Table
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
   * Returns whether anything is bound to the given property (key).
   * @param aSymbol the symbol to look up
   * @return true if a binding exists in this scope or any enclosing scope
   */
  override has(aSymbol: unknown): boolean {
    if (super.has(aSymbol)) {
      return true;
    }
    if (this.isRoot()) {
      return false;
    }

    // source is guaranteed non-null when isRoot=false (the constructor sets root=true iff aTable is null).
    return (this.source as Table).has(aSymbol);
  }

  /**
   * Returns whether this instance equals the given object.
   * @param anObject the object to compare against
   * @return true when the underlying Map.equals would return true
   */
  equals(anObject: unknown): boolean {
    // Kept for interface uniformity with Cons.equals / InterpretedSymbol.equals.
    // Delegates to Map.prototype.equals which does not exist in JS (throws TypeError).
    return (Map.prototype as unknown as { equals(o: unknown): boolean }).equals(anObject);
  }

  /**
   * Returns the value bound to the given interpreted symbol, walking up the scope chain.
   * @param aSymbol the symbol to look up
   * @return the bound value, or null when no binding exists
   */
  override get(aSymbol: unknown): LispValue {
    if (super.has(aSymbol)) {
      return super.get(aSymbol) as LispValue;
    }
    if (this.isRoot()) {
      return null;
    }

    // source is guaranteed non-null when isRoot=false.
    return (this.source as Table).get(aSymbol);
  }

  /**
   * Returns whether this instance is the root of the environment chain.
   * @return true if this is the root environment
   */
  isRoot(): boolean {
    return this.root;
  }

  /**
   * Reassigns the symbol bound in the innermost scope (equivalent to Common Lisp's setq). If a binding exists in the current scope, update it and return; otherwise recurse into the parent scope.
   * @param aSymbol the symbol to update
   * @param anObject the new bound value
   * @return the new bound value, or null when no enclosing scope has a binding
   */
  setIfExist(aSymbol: unknown, anObject: LispValue): LispValue {
    if (super.has(aSymbol)) {
      this.set(aSymbol, anObject);
      return anObject;
    }
    if (this.isRoot()) {
      return null;
    }
    return (this.source as Table).setIfExist(aSymbol, anObject);
  }

  /**
   * Sets whether this instance is the root of its environment chain.
   * @param aBoolean the new root flag
   * @return null
   */
  setRoot(aBoolean: boolean): null {
    this.root = aBoolean;
    return null;
  }

  /**
   * Sets the parent environment.
   * @param aTable the new parent environment (or null)
   * @return null
   */
  setSource(aTable: Table | null): null {
    this.source = aTable;
    return null;
  }

  /**
   * Returns a formatted string representation of this instance.
   * @return the formatted string
   */
  override toString(): string {
    return '#<Environment>';
  }
}
