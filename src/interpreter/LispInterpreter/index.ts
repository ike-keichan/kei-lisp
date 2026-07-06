import { Cons } from '../../value/Cons/index.js';
import { EvalError } from '../../errors/EvalError/index.js';
import { Evaluator } from '../../runtime/Evaluator/index.js';
import { InterpretedSymbol } from '../../value/InterpretedSymbol/index.js';
import { StreamManager } from '../../runtime/StreamManager/index.js';
import { Table } from '../../runtime/Table/index.js';
import { ThrowSignal } from '../../runtime/ThrowSignal/index.js';
import type { KeiLispPlugin } from '../../plugin/types.js';
import type { LispValue } from '../../types/index.js';

/**
 * @class
 * @classdesc Class for the interpreter.
 * @author Keisuke Ikeda
 * @this {LispInterpreter}
 */
export class LispInterpreter extends Object {
  /**
   * The root (top-level) environment table, pre-populated with built-in symbols.
   */
  root: Table;
  /**
   * The stream manager that owns the interpreter's output / spy streams.
   */
  streamManager: StreamManager;
  /**
   * Registered plugins consulted by the evaluator on every call. See `use`.
   */
  plugins: KeiLispPlugin[];

  /**
   * Constructor.
   * @constructor
   */
  constructor() {
    super();
    this.root = this.initializeTable();
    this.streamManager = new StreamManager();
    this.plugins = [];
  }

  /**
   * Registers a plugin. Subsequent `eval` calls will consult the plugin chain
   * (in registration order, first match wins) when no special form matches a
   * symbol, before falling through to the Applier built-ins.
   * @param plugin the plugin to register
   * @return this interpreter, for chaining
   */
  use(plugin: KeiLispPlugin): this {
    this.plugins.push(plugin);
    return this;
  }

  /**
   * Evaluates the given expression and returns the result. Throws `ParseError`,
   * `EvalError`, or `ExitError` on failure; library users are expected to catch
   * these (see the `KeiLispError` base class for the parse/eval family).
   * @param aCons the expression to evaluate
   * @return the evaluation result
   */
  eval(aCons: LispValue): LispValue {
    try {
      return Evaluator.eval(aCons, this.root, this.streamManager, 1, this.plugins);
    } catch (error) {
      // A `throw` with no dynamically enclosing `catch` is an error (CL semantics).
      if (error instanceof ThrowSignal) {
        throw new EvalError(error.message);
      }
      throw error;
    }
  }

  /**
   * Parses the source string, evaluates every expression it contains, and returns the results as an array.
   * @param source the Lisp source string
   * @return the array of evaluation results, one per top-level expression
   */
  evalAll(source: string): LispValue[] {
    const ast = this.parse(source);
    const results: LispValue[] = Array.from(ast.loop(), (expr) => this.eval(expr));
    return results;
  }

  /**
   * Parses and evaluates the source string and returns the value of the last expression.
   * @param source the Lisp source string
   * @return the value of the last expression, or `Cons.nil` for empty input
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
   * @param aString the Lisp source string
   * @return a Cons containing the parsed top-level expressions
   */
  parse(aString: string): Cons {
    return Cons.parse('(' + aString + '\n);') as Cons;
  }

  /**
   * Sets the given environment as the root of the environment chain.
   * @param environment the environment table to install as root
   * @return null
   */
  setRoot(environment: Table): null {
    if (environment instanceof Table) {
      environment.setRoot(true);
      this.root = environment;
    }

    return null;
  }

  /**
   * Builds the root environment table by pre-registering every built-in symbol and the small set of bootstrap lambdas (append / butlast / nthcdr / reverse).
   * @return the freshly initialized root environment
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
      'aref',
      'assoc',
      'atom',
      'bind',
      'car',
      'case',
      'catch',
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
      'decf',
      'destructuring-bind',
      'floatp',
      'floor',
      'defmacro',
      'defstruct',
      'defun',
      'divide',
      'do',
      'do*',
      'dolist',
      'elt',
      'eq',
      'equal',
      'error',
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
      'getf',
      'gethash',
      'hash-table-count',
      'hash-table-p',
      'handler-case',
      'if',
      'incf',
      'integerp',
      'lambda',
      'let',
      'let*',
      'last',
      'length',
      'list',
      'listp',
      'load',
      'make-array',
      'make-hash-table',
      'macroexpand',
      'macroexpand-1',
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
      'position',
      'princ',
      'print',
      'progn',
      'push',
      'quasiquote',
      'quote',
      'random',
      'rationalp',
      'read-from-string',
      'reduce',
      'remove',
      'remove-if',
      'round',
      'rplaca',
      'remhash',
      'rplacd',
      'setf',
      'setq',
      'set-allq',
      'sin',
      'some',
      'sort',
      'sqrt',
      'svref',
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
      'throw',
      'time',
      'trace',
      'truncate',
      'unless',
      'vector',
      'vectorp',
      'unquote',
      'unquote-splicing',
      'when',
      'with-output-to-string',
      'zerop',
      '1+',
      '1-',
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
