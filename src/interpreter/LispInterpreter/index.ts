import { Cons } from '../../value/Cons/index.js';
import { Evaluator } from '../../runtime/Evaluator/index.js';
import { InterpretedSymbol } from '../../value/InterpretedSymbol/index.js';
import { StreamManager } from '../../runtime/StreamManager/index.js';
import { Table } from '../../runtime/Table/index.js';
import type { LispValue } from '../../types/index.js';

/**
 * @class
 * @classdesc Class for the interpreter.
 * @author Keisuke Ikeda
 * @this {LispInterpreter}
 */
export class LispInterpreter {
  root: Table;
  streamManager: StreamManager;

  constructor() {
    this.root = this.initializeTable();
    this.streamManager = new StreamManager();
  }

  /**
   * Evaluates the given expression and returns the result. Throws `ParseError`,
   * `EvalError`, or `ExitError` on failure; library users are expected to catch
   * these (see the `KeiLispError` base class for the parse/eval family).
   */
  eval(aCons: LispValue): LispValue {
    return Evaluator.eval(aCons, this.root, this.streamManager);
  }

  /**
   * Parses the source string, evaluates every expression it contains, and returns the results as an array.
   */
  evalAll(source: string): LispValue[] {
    const ast = this.parse(source);
    const results: LispValue[] = [];
    for (const expr of ast.loop()) {
      results.push(this.eval(expr));
    }
    return results;
  }

  /**
   * Parses and evaluates the source string and returns the value of the last expression.
   */
  evalString(source: string): LispValue {
    const results = this.evalAll(source);
    return results.length === 0 ? Cons.nil : (results.at(-1) ?? Cons.nil);
  }

  /**
   * Parses the given string into a list of top-level expressions and returns
   * it. The result is always a `Cons` (possibly `Cons.nil` for empty input)
   * because the source is wrapped in an outer list before parsing. Throws
   * `ParseError` if the source cannot be parsed.
   */
  parse(aString: string): Cons {
    return Cons.parse('(' + aString + '\n);') as Cons;
  }

  /**
   * Sets the given environment as the root of the environment chain.
   */
  setRoot(environment: Table): null {
    if (environment instanceof Table) {
      environment.setRoot(true);
      this.root = environment;
    }

    return null;
  }

  /**
   * Initializes the environment table.
   */
  initializeTable(): Table {
    const aList: string[] = [];
    const aTable = new Table();
    aTable.setRoot(true);

    aList.push(
      'abs',
      'add',
      'and',
      'apply',
      'assoc',
      'atom',
      'bind',
      'car',
      'cdr',
      'characterp',
      'cond',
      'ceiling',
      'concatenate',
      'cons',
      'consp',
      'copy',
      'cos',
      'count',
      'floatp',
      'floor',
      'defun',
      'divide',
      'do',
      'do*',
      'dolist',
      'doublep',
      'elt',
      'eq',
      'equal',
      'eval',
      'evenp',
      'every',
      'exit',
      'exp',
      'expt',
      'find',
      'format',
      'gc',
      'gensym',
      'if',
      'integerp',
      'lambda',
      'let',
      'let*',
      'last',
      'length',
      'list',
      'listp',
      'mapcan',
      'mapcar',
      'max',
      'member',
      'memq',
      'min',
      'minusp',
      'mod',
      'multiply',
      'napier',
      'neq',
      'nequal',
      'not',
      'notrace',
      'nth',
      'null',
      'numberp',
      'oddp',
      'or',
      'pi',
      'plusp',
      'pop',
      'princ',
      'print',
      'progn',
      'push',
      'quote',
      'random',
      'reduce',
      'round',
      'rplaca',
      'rplacd',
      'setq',
      'set-allq',
      'sin',
      'some',
      'sort',
      'sqrt',
      'string-downcase',
      'string-trim',
      'string-upcase',
      'stringp',
      'subseq',
      'substring',
      'subtract',
      'symbolp',
      'tan',
      'terpri',
      'time',
      'trace',
      'truncate',
      'unless',
      'when',
      'zerop',
      '+',
      '-',
      '*',
      '/',
      '//',
      '=',
      '==',
      '~=',
      '~~',
      '<',
      '<=',
      '>',
      '>=',
    );

    for (const each of aList) {
      const aSymbol = InterpretedSymbol.of(each);
      aTable.set(aSymbol, aSymbol);
    }

    let aString: string;
    let aCons: Cons;
    aString =
      '(lambda (list1 list2) (cond ((null (listp list1)) nil) ((null (listp list2)) nil) ((null list1) list2) (t (cons (car list1) (append (cdr list1) list2)))))';
    aCons = Cons.parse(aString) as Cons;
    aCons.last().setCdr(new Cons(aTable, Cons.nil));
    aTable.set(InterpretedSymbol.of('append'), aCons);

    aString =
      '(lambda (l n) (cond ((<= (length l) n) nil) (t (cons (car l) (butlast (cdr l) n)))))';
    aCons = Cons.parse(aString) as Cons;
    aCons.last().setCdr(new Cons(aTable, Cons.nil));
    aTable.set(InterpretedSymbol.of('butlast'), aCons);

    aString =
      '(lambda (n l) (cond ((> n (length l)) nil) ((= 0 n) l) (t (nthcdr (- n 1) (cdr l)))))';
    aCons = Cons.parse(aString) as Cons;
    aCons.last().setCdr(new Cons(aTable, Cons.nil));
    aTable.set(InterpretedSymbol.of('nthcdr'), aCons);

    aString =
      "(lambda (l) (cond ((null (listp l)) l) ((null l) '()) (t (append (reverse (cdr l)) (list (car l))))))";
    aCons = Cons.parse(aString) as Cons;
    aCons.last().setCdr(new Cons(aTable, Cons.nil));
    aTable.set(InterpretedSymbol.of('reverse'), aCons);

    aTable.set(InterpretedSymbol.of('t'), InterpretedSymbol.of('t'));

    return aTable;
  }
}
