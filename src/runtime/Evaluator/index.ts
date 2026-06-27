import v8 from 'node:v8';
import vm from 'node:vm';

import { Applier } from '../Applier/index.js';
import { Cons } from '../../value/Cons/index.js';
import { EvalError } from '../../errors/EvalError/index.js';
import { ExitError } from '../../errors/ExitError/index.js';
import { InterpretedSymbol } from '../../value/InterpretedSymbol/index.js';
import {
  argumentNotSymbol,
  cannotApply,
  noBinding,
  notSymbol,
  SIZES_DO_NOT_MATCH,
} from '../../constants/index.js';
import { StreamManager } from '../StreamManager/index.js';
import { Table } from '../Table/index.js';
import type { KeiLispPlugin, PluginContext } from '../../plugin/types.js';
import type { LispValue } from '../../types/index.js';

// Lazily expose V8's gc() to user-land on first use, avoiding the need for the
// host process to be started with `--expose-gc`.
let cachedGc: (() => void) | null = null;
const triggerGc = (): void => {
  if (cachedGc == null) {
    v8.setFlagsFromString('--expose_gc');
    cachedGc = vm.runInNewContext('gc') as () => void;
  }
  cachedGc();
};

/**
 * @class
 * @classdesc Class that mimics Lisp's universal function Evaluate.
 * @author Keisuke Ikeda
 * @this {Evaluator}
 */
export class Evaluator extends Object {
  /**
   * Lisp-name to method-name dispatch map for special forms.
   */
  static readonly buildInFunctions: Map<InterpretedSymbol, string> = Evaluator.setup();

  /**
   * Marker symbol stored as the car of the Cons that represents a macro binding,
   * distinguishing macros from ordinary `lambda` closures in the environment.
   */
  static readonly macroMarker: InterpretedSymbol = InterpretedSymbol.of('macro');

  /**
   * The variable binding environment used during evaluation.
   */
  environment: Table;
  /**
   * The stream manager used for trace and spy output.
   */
  streamManager: StreamManager;
  /**
   * The current call depth, used for indenting trace/spy output.
   */
  depth: number;
  /**
   * Registered plugins consulted by `eval` when no special form matches.
   */
  plugins: KeiLispPlugin[];

  /**
   * Constructor.
   * @param aTable the variable binding environment
   * @param aStreamManager the stream manager for trace and spy output
   * @param aNumber the initial call depth
   * @param plugins the plugin chain consulted before falling through to Applier
   */
  constructor(
    aTable: Table,
    aStreamManager: StreamManager,
    aNumber: number,
    plugins: KeiLispPlugin[] = [],
  ) {
    super();
    this.environment = aTable;
    this.streamManager = aStreamManager;
    this.depth = aNumber;
    this.plugins = plugins;
  }

  /**
   * Implementation of the Lisp `and` special form.
   * @param aCons the argument Cons containing the expressions to evaluate
   * @return nil if any expression evaluates to nil, otherwise t
   */
  and(aCons: Cons): LispValue {
    for (const each of aCons.loop()) {
      const anObject = Evaluator.eval(
        each,
        this.environment,
        this.streamManager,
        this.depth,
        this.plugins,
      );
      if (Cons.isNil(anObject)) {
        return Cons.nil;
      }
    }

    return InterpretedSymbol.of('t');
  }

  /**
   * Implementation of the Lisp `apply` special form.
   * @param aCons the argument Cons containing the procedure and its argument list
   * @return the result of applying the procedure to the arguments
   */
  apply_lisp(aCons: Cons): LispValue {
    const procedure = Evaluator.eval(
      aCons.car,
      this.environment,
      this.streamManager,
      this.depth,
      this.plugins,
    );
    const args = Evaluator.eval(
      aCons.nth(2),
      this.environment,
      this.streamManager,
      this.depth,
      this.plugins,
    );
    let aTable: Table = this.environment;
    if (procedure instanceof Cons && procedure.last().car instanceof Table) {
      aTable = procedure.last().car as Table;
    }

    return Applier.apply(procedure, args, aTable, this.streamManager, this.depth, this.plugins);
  }

  /**
   * Implementation of the Lisp `bind` special form.
   * @param aCons the argument Cons whose car is the symbol to look up
   * @return the binding count for the symbol, or nil if unbound
   */
  bind(aCons: Cons): LispValue {
    if (Cons.isNotSymbol(aCons.car)) {
      throw new EvalError(cannotApply('bind', aCons.car));
    }
    const aSymbol = aCons.car as InterpretedSymbol;
    if (!this.environment.has(aSymbol)) {
      return Cons.nil;
    }

    return this.bindAUX(aSymbol);
  }

  /**
   * Counts the number of distinct bindings for the given symbol along the environment chain.
   * @param aSymbol the symbol whose bindings are inspected
   * @return the number of distinct bindings found
   */
  bindAUX(aSymbol: InterpretedSymbol): number {
    let aTable: Table | null = this.environment;
    let anObject: LispValue = aTable.get(aSymbol);
    let count = 1;

    while (aTable != null) {
      if (!aTable.has(aSymbol)) {
        break;
      }
      const theObject: LispValue = aTable.get(aSymbol);
      // Following the original: loose (!=) comparison.
      if (theObject != anObject) {
        count++;
        anObject = theObject;
      }
      aTable = aTable.source;
    }

    return count;
  }

  /**
   * Sequentially evaluates and binds each (symbol value) pair into the given table; used by let*.
   * @param parameters the Cons of (symbol value) pairs to bind
   * @param aTable the table into which the bindings are written
   */
  binding(parameters: Cons, aTable: Table): null {
    for (const each of parameters.loop()) {
      const theCons = each as Cons;
      if (Cons.isNotSymbol(theCons.car)) {
        throw new EvalError(notSymbol(theCons.car));
      }
      const key = theCons.car as InterpretedSymbol;
      const value = Evaluator.eval(
        theCons.nth(2),
        aTable,
        this.streamManager,
        this.depth,
        this.plugins,
      );
      aTable.set(key, value);
    }

    return null;
  }

  /**
   * Evaluates all (symbol value) pairs first and then writes them into the given table in parallel; used by let.
   * @param parameters the Cons of (symbol value) pairs to bind
   * @param aTable the table into which the bindings are written
   */
  bindingParallel(parameters: Cons, aTable: Table): null {
    const theTable = new Map<unknown, LispValue>();
    for (const each of parameters.loop()) {
      const theCons = each as Cons;
      if (Cons.isNotSymbol(theCons.car)) {
        throw new EvalError(notSymbol(theCons.car));
      }
      const key = theCons.car as InterpretedSymbol;
      const value = Evaluator.eval(
        theCons.nth(2),
        aTable,
        this.streamManager,
        this.depth,
        this.plugins,
      );
      theTable.set(key, value);
    }

    for (const [key, value] of theTable) {
      aTable.set(key, value);
    }

    return null;
  }

  /**
   * Implementation of the Lisp `cond` special form.
   * @param aCons the argument Cons of (test consequent...) clauses
   * @return the result of the first clause whose test is non-nil, or nil
   */
  cond(aCons: LispValue): LispValue {
    if (Cons.isNil(aCons)) {
      return Cons.nil;
    }
    const consCell = aCons as Cons;
    const clause = consCell.car as Cons;
    let anObject: LispValue = Evaluator.eval(
      clause.car,
      this.environment,
      this.streamManager,
      this.depth,
      this.plugins,
    );
    if (Cons.isNil(anObject)) {
      return this.cond(consCell.cdr);
    }
    const consequent = clause.cdr as Cons;
    for (const each of consequent.loop()) {
      anObject = Evaluator.eval(
        each,
        this.environment,
        this.streamManager,
        this.depth,
        this.plugins,
      );
    }
    return anObject;
  }

  /**
   * Implementation of the Lisp `defun` special form.
   * @param aCons the argument Cons containing the function name, parameter list, and body
   * @return the function name symbol
   */
  defun(aCons: Cons): LispValue {
    const variable = aCons.car;
    let lambda: LispValue = aCons.cdr;
    lambda =
      aCons.length() === 2
        ? (lambda as Cons).car
        : new Cons(InterpretedSymbol.of('lambda'), lambda);
    lambda = Evaluator.eval(
      lambda,
      new Table(this.environment),
      this.streamManager,
      this.depth,
      this.plugins,
    );
    this.environment.set(variable, lambda);

    return variable;
  }

  /**
   * Implementation of the Lisp `defmacro` special form. Defines a macro: a
   * transformer whose body receives its arguments unevaluated and returns a
   * form that is then evaluated in the caller's environment.
   * @param aCons the argument Cons containing the macro name, parameter list, and body
   * @return the macro name symbol
   */
  defmacro(aCons: Cons): LispValue {
    const variable = aCons.car;
    const lambda = Evaluator.eval(
      new Cons(InterpretedSymbol.of('lambda'), aCons.cdr),
      new Table(this.environment),
      this.streamManager,
      this.depth,
      this.plugins,
    );
    const macro = new Cons(Evaluator.macroMarker, new Cons(lambda, Cons.nil));
    this.environment.set(variable, macro);

    return variable;
  }

  /**
   * Returns the macro transformer (a lambda Cons) bound to the given symbol, or
   * null when the symbol is not bound to a macro. Special-form symbols are never
   * treated as macros.
   * @param car the operator position of a call form
   * @return the macro's lambda Cons, or null
   */
  lookupMacro(car: LispValue): Cons | null {
    if (Cons.isNotSymbol(car) || Evaluator.buildInFunctions.has(car as InterpretedSymbol)) {
      return null;
    }
    const value = this.environment.get(car);
    if (Cons.isCons(value) && value.car === Evaluator.macroMarker) {
      return value.nth(2) as Cons;
    }

    return null;
  }

  /**
   * Expands a macro call exactly once by applying its transformer to the
   * unevaluated argument forms in the macro's captured environment.
   * @param form the call form whose car names the macro
   * @param macroLambda the macro's transformer lambda Cons
   * @return the expansion form
   */
  expandMacro1(form: Cons, macroLambda: Cons): LispValue {
    const capturedEnvironment = macroLambda.last().car as Table;

    return Applier.apply(
      macroLambda,
      form.cdr,
      capturedEnvironment,
      this.streamManager,
      this.depth,
      this.plugins,
    );
  }

  /**
   * Expands a macro call once and evaluates the resulting form in the current
   * environment.
   * @param form the call form whose car names the macro
   * @param macroLambda the macro's transformer lambda Cons
   * @return the result of evaluating the expansion
   */
  evalMacroCall(form: Cons, macroLambda: Cons): LispValue {
    const expansion = this.expandMacro1(form, macroLambda);

    return Evaluator.eval(
      expansion,
      this.environment,
      this.streamManager,
      this.depth,
      this.plugins,
    );
  }

  /**
   * Implementation of the Lisp `macroexpand-1` special form. Evaluates its
   * argument to obtain a form and, when that form is a macro call, expands it
   * exactly once without evaluating the result.
   * @param aCons the argument Cons whose car evaluates to the form to expand
   * @return the once-expanded form, or the form unchanged when it is not a macro call
   */
  macroexpand_1(aCons: Cons): LispValue {
    const form = Evaluator.eval(
      aCons.car,
      this.environment,
      this.streamManager,
      this.depth,
      this.plugins,
    );
    if (Cons.isNotCons(form)) {
      return form;
    }
    const macroLambda = this.lookupMacro((form as Cons).car);
    if (macroLambda == null) {
      return form;
    }

    return this.expandMacro1(form as Cons, macroLambda);
  }

  /**
   * Implementation of the Lisp `macroexpand` special form. Evaluates its
   * argument to obtain a form and repeatedly expands it until the result is no
   * longer a macro call, without evaluating the result.
   * @param aCons the argument Cons whose car evaluates to the form to expand
   * @return the fully expanded form
   */
  macroexpand(aCons: Cons): LispValue {
    let form = Evaluator.eval(
      aCons.car,
      this.environment,
      this.streamManager,
      this.depth,
      this.plugins,
    );
    while (Cons.isCons(form)) {
      const macroLambda = this.lookupMacro(form.car);
      if (macroLambda == null) {
        break;
      }
      form = this.expandMacro1(form, macroLambda);
    }

    return form;
  }

  /**
   * Implementation of the Lisp `do` special form (parallel binding update).
   * @param aCons the argument Cons containing bindings, termination clause, and body
   * @return the value of the termination clause's result form
   */
  do_(aCons: Cons): LispValue {
    const parameters = aCons.car as Cons;
    const bool = aCons.nth(2) as Cons;
    const expressions = (aCons.cdr as Cons).cdr as Cons;
    this.bindingParallel(parameters, this.environment);
    if (Cons.isNil(bool)) {
      bool.setCar(Cons.nil);
    }

    while (
      Cons.isNil(
        Evaluator.eval(bool.car, this.environment, this.streamManager, this.depth, this.plugins),
      )
    ) {
      const theTable = new Map<InterpretedSymbol, LispValue>();
      for (const each of expressions.loop()) {
        Evaluator.eval(each, this.environment, this.streamManager, this.depth, this.plugins);
      }
      for (const each of parameters.loop()) {
        const theCons = each as Cons;
        if (Cons.isNotSymbol(theCons.car)) {
          throw new EvalError(notSymbol(theCons.car));
        }
        const key = theCons.car as InterpretedSymbol;
        if (Cons.isNotNil(theCons.nth(3))) {
          const value = Evaluator.eval(
            theCons.nth(3),
            this.environment,
            this.streamManager,
            this.depth,
            this.plugins,
          );
          theTable.set(key, value);
        }
      }
      for (const [key, value] of theTable) {
        this.environment.set(key, value);
      }
    }
    return Evaluator.eval(
      bool.nth(2),
      this.environment,
      this.streamManager,
      this.depth,
      this.plugins,
    );
  }

  /**
   * Implementation of the Lisp `dolist` special form.
   * @param aCons the argument Cons containing the binding clause and body
   * @return the value of the result form
   */
  doList(aCons: Cons): LispValue {
    const parameter = aCons.car as Cons;
    const theCons = aCons.cdr as Cons;
    const args = Evaluator.eval(
      parameter.nth(2),
      this.environment,
      this.streamManager,
      this.depth,
      this.plugins,
    ) as Cons;
    for (const element of args.loop()) {
      this.environment.set(parameter.car, element);
      for (const each of theCons.loop()) {
        Evaluator.eval(each, this.environment, this.streamManager, this.depth, this.plugins);
      }
    }

    return Evaluator.eval(
      parameter.nth(3),
      this.environment,
      this.streamManager,
      this.depth,
      this.plugins,
    );
  }

  /**
   * Implementation of the Lisp `do*` special form (sequential binding update).
   * @param aCons the argument Cons containing bindings, termination clause, and body
   * @return the value of the termination clause's result form
   */
  doStar(aCons: Cons): LispValue {
    const parameters = aCons.car as Cons;
    const bool = aCons.nth(2) as Cons;
    const expressions = (aCons.cdr as Cons).cdr as Cons;
    this.binding(parameters, this.environment);
    if (Cons.isNil(bool)) {
      bool.setCar(Cons.nil);
    }

    while (
      Cons.isNil(
        Evaluator.eval(bool.car, this.environment, this.streamManager, this.depth, this.plugins),
      )
    ) {
      for (const each of expressions.loop()) {
        Evaluator.eval(each, this.environment, this.streamManager, this.depth, this.plugins);
      }
      for (const each of parameters.loop()) {
        const theCons = each as Cons;
        if (Cons.isNotSymbol(theCons.car)) {
          throw new EvalError(notSymbol(theCons.car));
        }
        const key = theCons.car as InterpretedSymbol;
        if (Cons.isNotNil(theCons.nth(3))) {
          const value = Evaluator.eval(
            theCons.nth(3),
            this.environment,
            this.streamManager,
            this.depth,
            this.plugins,
          );
          this.environment.set(key, value);
        }
      }
    }
    return Evaluator.eval(
      bool.nth(2),
      this.environment,
      this.streamManager,
      this.depth,
      this.plugins,
    );
  }

  /**
   * Evaluates a procedure call by delegating to the Applier after evaluating each argument.
   * @param form the call form whose car is the procedure and whose cdr is the argument list
   * @return the result of applying the procedure
   */
  entrustApplier(form: Cons): LispValue {
    const aCons = form.cdr as Cons;
    let args: Cons = new Cons(Cons.nil, Cons.nil);
    const procedure = form.car;
    let aSymbol: InterpretedSymbol | null = null;

    if (Cons.isSymbol(procedure)) {
      aSymbol = procedure;
    }
    if (this.isSpy(aSymbol)) {
      this.spyPrint(this.streamManager.spyStream(aSymbol), form.toString());
      this.setDepth(this.depth + 1);
    }

    for (const each of aCons.loop()) {
      if (each instanceof Table) {
        break;
      }
      args.add(
        Evaluator.eval(each, this.environment, this.streamManager, this.depth, this.plugins),
      );
    }
    if (this.isSpy(aSymbol)) {
      this.setDepth(this.depth - 1);
    }

    args = args.cdr as Cons;
    return Applier.apply(
      procedure,
      args,
      this.environment,
      this.streamManager,
      this.depth,
      this.plugins,
    );
  }

  /**
   * Evaluates the given form in the given environment.
   * @param form the form to evaluate
   * @param environment the variable binding environment
   * @param aStreamManager the stream manager for trace and spy output
   * @param depth the current call depth
   * @param plugins the plugin chain consulted before falling through to Applier
   * @return the evaluation result
   */
  static eval(
    form: LispValue,
    environment: Table,
    aStreamManager: StreamManager = new StreamManager(),
    depth: number = 1,
    plugins: KeiLispPlugin[] = [],
  ): LispValue {
    return new Evaluator(environment, aStreamManager, depth, plugins).eval(form);
  }

  /**
   * Evaluates the given form using this Evaluator's environment.
   * @param form the form to evaluate
   * @return the evaluation result
   */
  eval(form: LispValue): LispValue {
    if (Cons.isSymbol(form)) {
      return this.evaluateSymbol(form);
    }
    if (Cons.isNil(form) || Cons.isNotList(form)) {
      return form;
    }
    const formCons = form as Cons;
    if (Cons.isSymbol(formCons.car) && Evaluator.buildInFunctions.has(formCons.car)) {
      return this.specialForm(formCons);
    }
    if (Cons.isSymbol(formCons.car)) {
      const macroLambda = this.lookupMacro(formCons.car);
      if (macroLambda != null) {
        return this.evalMacroCall(formCons, macroLambda);
      }
    }
    if (Cons.isSymbol(formCons.car) && this.plugins.length > 0) {
      const symbol = formCons.car;
      const plugin = this.plugins.find((p) => p.has(symbol));
      if (plugin !== undefined) {
        return this.entrustPlugin(plugin, formCons);
      }
    }

    return this.entrustApplier(formCons);
  }

  /**
   * Evaluates the argument list (the same way `entrustApplier` does), then
   * delegates the call to the matched plugin with a context that allows
   * recursive evaluation.
   * @param plugin the plugin that claimed the call symbol
   * @param form the call form whose car is the symbol and whose cdr is the argument list
   * @return the result returned by the plugin
   */
  entrustPlugin(plugin: KeiLispPlugin, form: Cons): LispValue {
    const aCons = form.cdr as Cons;
    let args: Cons = new Cons(Cons.nil, Cons.nil);
    const symbol = form.car as InterpretedSymbol;

    if (this.isSpy(symbol)) {
      this.spyPrint(this.streamManager.spyStream(symbol), form.toString());
      this.setDepth(this.depth + 1);
    }

    for (const each of aCons.loop()) {
      if (each instanceof Table) {
        break;
      }
      args.add(
        Evaluator.eval(each, this.environment, this.streamManager, this.depth, this.plugins),
      );
    }
    if (this.isSpy(symbol)) {
      this.setDepth(this.depth - 1);
    }

    args = args.cdr as Cons;
    const ctx: PluginContext = {
      environment: this.environment,
      streamManager: this.streamManager,
      depth: this.depth,
      eval: (subForm: LispValue): LispValue =>
        Evaluator.eval(subForm, this.environment, this.streamManager, this.depth, this.plugins),
    };
    return plugin.apply(symbol, args, ctx);
  }

  /**
   * Implementation of the Lisp `eval` special form.
   * @param aCons the argument Cons whose car is the form to evaluate twice
   * @return the result of evaluating the form
   */
  eval_lisp(aCons: Cons): LispValue {
    return Evaluator.eval(
      Evaluator.eval(aCons.car, this.environment, this.streamManager, this.depth, this.plugins),
      this.environment,
      this.streamManager,
      this.depth,
      this.plugins,
    );
  }

  /**
   * Resolves the value bound to the given symbol in the current environment.
   * @param aSymbol the symbol to resolve
   * @return the value bound to the symbol
   */
  evaluateSymbol(aSymbol: InterpretedSymbol): LispValue {
    if (!this.environment.has(aSymbol)) {
      throw new EvalError(noBinding(aSymbol));
    }
    if (this.isSpy(aSymbol)) {
      this.spyPrint(this.streamManager.spyStream(aSymbol), aSymbol.toString());
      this.setDepth(this.depth + 1);
    }

    let answer: LispValue = this.environment.get(aSymbol);
    if (answer instanceof Cons && answer.cdr instanceof Table) {
      answer = answer.car;
    }

    if (this.isSpy(aSymbol)) {
      this.setDepth(this.depth - 1);
      this.spyPrint(
        this.streamManager.spyStream(aSymbol),
        String(answer) + ' <== ' + String(aSymbol),
      );
    }

    return answer;
  }

  /**
   * Implementation of the Lisp `exit` special form; terminates the REPL by throwing an ExitError.
   */
  exit(): never {
    console.log('Bye!');
    throw new ExitError();
  }

  /**
   * Implementation of the Lisp `gc` special form; triggers garbage collection and returns memory usage.
   * @return an association list of memory usage statistics
   */
  gc(): Cons {
    triggerGc();
    const usage = process.memoryUsage();
    // Returns an association list so callers can do (assoc 'heap-used (gc)).
    const pair = (key: string, value: number): Cons => new Cons(InterpretedSymbol.of(key), value);
    const entries: Cons[] = [
      pair('rss', usage.rss),
      pair('heap-total', usage.heapTotal),
      pair('heap-used', usage.heapUsed),
    ];
    let result: Cons = Cons.nil;
    for (const entry of entries) {
      result = new Cons(entry, result);
    }
    return result;
  }

  /**
   * Implementation of the Lisp `if` special form.
   * @param aCons the argument Cons containing the test, then-form, and else-form
   * @return the result of evaluating the selected branch
   */
  if_(aCons: Cons): LispValue {
    const bool = Evaluator.eval(
      aCons.car,
      this.environment,
      this.streamManager,
      this.depth,
      this.plugins,
    );
    const anObject: LispValue = Cons.isNil(bool) ? aCons.nth(3) : aCons.nth(2);

    return Evaluator.eval(anObject, this.environment, this.streamManager, this.depth, this.plugins);
  }

  /**
   * Returns the indentation string used for trace and spy output at the current depth.
   * @return the indentation string
   */
  indent(): string {
    let index = 0;
    let aString = '';
    while (index++ < this.depth) {
      aString += '| ';
    }

    return aString;
  }

  /**
   * Returns whether the given symbol is currently being spied on.
   * @param aSymbol the symbol to check
   * @return a boolean
   */
  isSpy(aSymbol: InterpretedSymbol | null): boolean {
    if (aSymbol == null) {
      return false;
    }
    return this.streamManager.isSpy(aSymbol);
  }

  /**
   * Implementation of the Lisp `lambda` special form; captures the current environment as a closure.
   * @param args the argument Cons containing the parameter list and body
   * @return a lambda form with the captured environment appended
   */
  lambda(args: Cons): LispValue {
    const aCons = Cons.cloneValue(args) as Cons;
    const theCons = aCons.cdr as Cons;
    theCons.setCdr(new Cons(this.environment, Cons.nil));

    return new Cons(InterpretedSymbol.of('lambda'), aCons);
  }

  /**
   * Implementation of the Lisp `let` special form (parallel binding).
   * @param aCons the argument Cons containing bindings and body
   * @return the value of the last body form
   */
  let(aCons: Cons): LispValue {
    const aTable = new Table(this.environment);
    const parameters = aCons.car as Cons;
    const forms = aCons.cdr as Cons;
    let anObject: LispValue = Cons.nil;
    this.bindingParallel(parameters, aTable);
    for (const each of forms.loop()) {
      anObject = Evaluator.eval(each, aTable, this.streamManager, this.depth, this.plugins);
    }

    return anObject;
  }

  /**
   * Implementation of the Lisp `let*` special form (sequential binding).
   * @param aCons the argument Cons containing bindings and body
   * @return the value of the last body form
   */
  letStar(aCons: Cons): LispValue {
    const aTable = new Table(this.environment);
    const parameters = aCons.car as Cons;
    const forms = aCons.cdr as Cons;
    let anObject: LispValue = Cons.nil;
    this.binding(parameters, aTable);
    for (const each of forms.loop()) {
      anObject = Evaluator.eval(each, aTable, this.streamManager, this.depth, this.plugins);
    }

    return anObject;
  }

  /**
   * Implementation of the Lisp `not` special form.
   * @param aCons the argument Cons whose car is the expression to negate
   * @return t if the expression evaluates to nil, otherwise nil
   */
  not(aCons: Cons): LispValue {
    if (
      Cons.isNil(
        Evaluator.eval(aCons.car, this.environment, this.streamManager, this.depth, this.plugins),
      )
    ) {
      return InterpretedSymbol.of('t');
    }
    return Cons.nil;
  }

  /**
   * Implementation of the Lisp `notrace` special form; disables tracing.
   * @return the symbol t
   */
  notrace(): InterpretedSymbol {
    this.streamManager.noTrace();
    return InterpretedSymbol.of('t');
  }

  /**
   * Implementation of the Lisp `or` special form.
   * @param aCons the argument Cons containing the expressions to evaluate
   * @return t if any expression evaluates to non-nil, otherwise nil
   */
  or(aCons: Cons): LispValue {
    for (const each of aCons.loop()) {
      const anObject = Evaluator.eval(
        each,
        this.environment,
        this.streamManager,
        this.depth,
        this.plugins,
      );
      if (Cons.isNotNil(anObject)) {
        return InterpretedSymbol.of('t');
      }
    }

    return Cons.nil;
  }

  /**
   * Implementation of the Lisp `pop` special form.
   * @param aCons the argument Cons whose car is the symbol bound to a list
   * @return the popped element, or nil if the binding is not a Cons
   */
  pop_(aCons: Cons): LispValue {
    if (Cons.isNotSymbol(aCons.car)) {
      throw new EvalError(argumentNotSymbol(1));
    }
    const aSymbol = aCons.car as InterpretedSymbol;
    const anObject = Evaluator.eval(
      aSymbol,
      this.environment,
      this.streamManager,
      this.depth,
      this.plugins,
    );
    if (Cons.isNotCons(anObject)) {
      return Cons.nil;
    }
    const consObject = anObject as Cons;
    this.environment.setIfExist(aSymbol, consObject.cdr);

    return consObject.car;
  }

  /**
   * Implementation of the Lisp `progn` special form.
   * @param aCons the argument Cons containing the body expressions
   * @return the value of the last body form, or nil if there are none
   */
  progn(aCons: Cons): LispValue {
    let anObject: LispValue = Cons.nil;
    for (const each of aCons.loop()) {
      anObject = Evaluator.eval(
        each,
        this.environment,
        this.streamManager,
        this.depth,
        this.plugins,
      );
    }

    return anObject;
  }

  /**
   * Implementation of the Lisp `princ` special form; writes the evaluated argument without a trailing newline.
   * @param aCons the argument Cons whose car is the expression to print
   * @return the printed value
   */
  princ(aCons: Cons): LispValue {
    const anObject = Evaluator.eval(
      aCons.car,
      this.environment,
      this.streamManager,
      this.depth,
      this.plugins,
    );
    process.stdout.write(String(anObject));

    return anObject;
  }

  /**
   * Implementation of the Lisp `print` special form; writes the evaluated argument followed by a newline.
   * @param aCons the argument Cons whose car is the expression to print
   * @return the printed value
   */
  print(aCons: Cons): LispValue {
    const anObject = Evaluator.eval(
      aCons.car,
      this.environment,
      this.streamManager,
      this.depth,
      this.plugins,
    );
    process.stdout.write(String(anObject) + '\n');

    return anObject;
  }

  /**
   * Implementation of the Lisp `push` special form.
   * @param aCons the argument Cons containing the value to push and the target symbol
   * @return the new Cons stored in the symbol
   */
  push_(aCons: Cons): LispValue {
    let anObject = Evaluator.eval(
      aCons.car,
      this.environment,
      this.streamManager,
      this.depth,
      this.plugins,
    );
    if (Cons.isNotSymbol(aCons.nth(2))) {
      throw new EvalError(argumentNotSymbol(2));
    }
    const aSymbol = aCons.nth(2) as InterpretedSymbol;
    anObject = new Cons(
      anObject,
      Evaluator.eval(aSymbol, this.environment, this.streamManager, this.depth, this.plugins),
    );
    this.environment.setIfExist(aSymbol, anObject);

    return anObject;
  }

  /**
   * Implementation of the Lisp `quote` special form.
   * @param aCons the argument Cons whose car is the form to return unevaluated
   * @return the quoted form
   */
  quote(aCons: Cons): LispValue {
    return aCons.car;
  }

  /**
   * Implementation of the Lisp `quasiquote` (`` ` ``) special form. Returns the
   * template with every `unquote` (`,`) and `unquote-splicing` (`,@`) at the
   * matching nesting level replaced by the evaluation of its operand. Nested
   * quasiquotes increase the level so inner unquotes are preserved.
   * @param aCons the argument Cons whose car is the template
   * @return the constructed form
   */
  quasiquote(aCons: Cons): LispValue {
    return this.quasiquoteExpand(aCons.car, 1);
  }

  /**
   * Recursively expands a quasiquote template at the given nesting level.
   * @param template the template to expand
   * @param level the current quasiquote nesting level (1 is the outermost)
   * @return the expanded value
   */
  quasiquoteExpand(template: LispValue, level: number): LispValue {
    if (Cons.isNotCons(template)) {
      return template;
    }
    const aCons = template as Cons;
    if (aCons.car === InterpretedSymbol.of('unquote')) {
      if (level === 1) {
        return Evaluator.eval(
          aCons.nth(2),
          this.environment,
          this.streamManager,
          this.depth,
          this.plugins,
        );
      }
      return new Cons(
        InterpretedSymbol.of('unquote'),
        new Cons(this.quasiquoteExpand(aCons.nth(2), level - 1), Cons.nil),
      );
    }
    if (aCons.car === InterpretedSymbol.of('quasiquote')) {
      return new Cons(
        InterpretedSymbol.of('quasiquote'),
        new Cons(this.quasiquoteExpand(aCons.nth(2), level + 1), Cons.nil),
      );
    }

    return this.quasiquoteList(aCons, level);
  }

  /**
   * Expands the elements of a quasiquoted list, handling `unquote-splicing`
   * (`,@`) elements and a possible dotted `unquote` (`,`) tail.
   * @param template the list template to expand
   * @param level the current quasiquote nesting level
   * @return the constructed list
   */
  quasiquoteList(template: Cons, level: number): LispValue {
    const parts: LispValue[] = [];
    let tail: LispValue = Cons.nil;
    let current: LispValue = template;

    while (Cons.isCons(current)) {
      // A dotted `(... . ,x)` tail surfaces as a cell whose car is the `unquote` symbol.
      if (current.car === InterpretedSymbol.of('unquote')) {
        tail = this.quasiquoteExpand(current, level);
        current = Cons.nil;
        break;
      }
      const head = current.car;
      if (Cons.isCons(head) && head.car === InterpretedSymbol.of('unquote-splicing')) {
        if (level === 1) {
          this.spliceInto(
            parts,
            Evaluator.eval(
              head.nth(2),
              this.environment,
              this.streamManager,
              this.depth,
              this.plugins,
            ),
          );
        } else {
          parts.push(
            new Cons(
              InterpretedSymbol.of('unquote-splicing'),
              new Cons(this.quasiquoteExpand(head.nth(2), level - 1), Cons.nil),
            ),
          );
        }
      } else {
        parts.push(this.quasiquoteExpand(head, level));
      }
      current = current.cdr;
    }
    if (Cons.isNotNil(current)) {
      tail = current;
    }

    let result: LispValue = tail;
    for (let index = parts.length - 1; index >= 0; index--) {
      result = new Cons(parts[index], result);
    }

    return result;
  }

  /**
   * Appends the elements of a spliced value (`,@`) onto the accumulator.
   * @param parts the accumulator of list elements
   * @param value the value produced by an `unquote-splicing` operand
   */
  spliceInto(parts: LispValue[], value: LispValue): null {
    if (Cons.isNil(value)) {
      return null;
    }
    if (Cons.isNotCons(value)) {
      throw new EvalError(cannotApply('unquote-splicing', value));
    }
    for (const each of (value as Cons).loop()) {
      parts.push(each);
    }

    return null;
  }

  /**
   * Implementation of the Lisp `unquote` (`,`) special form. Signals an error
   * because unquote is only meaningful inside a `quasiquote` template.
   */
  unquote(): never {
    throw new EvalError('unquote (",") is only valid inside a quasiquote ("`")');
  }

  /**
   * Implementation of the Lisp `unquote-splicing` (`,@`) special form. Signals
   * an error because unquote-splicing is only meaningful inside a `quasiquote`
   * template.
   */
  unquoteSplicing(): never {
    throw new EvalError('unquote-splicing (",@") is only valid inside a quasiquote ("`")');
  }

  /**
   * Implementation of the Lisp `rplaca` special form; destructively replaces the car of a Cons.
   * @param args the argument Cons containing the target Cons expression and the new car value
   * @return the modified Cons
   */
  rplaca(args: Cons): LispValue {
    let anObject = Evaluator.eval(
      args.car,
      this.environment,
      this.streamManager,
      this.depth,
      this.plugins,
    );
    if (Cons.isNotCons(anObject)) {
      throw new EvalError(cannotApply('set-car!', anObject));
    }
    const aCons = anObject as Cons;
    anObject = Evaluator.eval(
      args.nth(2),
      this.environment,
      this.streamManager,
      this.depth,
      this.plugins,
    );
    aCons.setCar(anObject);

    return Evaluator.eval(args.car, this.environment, this.streamManager, this.depth, this.plugins);
  }

  /**
   * Implementation of the Lisp `rplacd` special form; destructively replaces the cdr of a Cons.
   * @param args the argument Cons containing the target Cons expression and the new cdr value
   * @return the modified Cons
   */
  rplacd(args: Cons): LispValue {
    let anObject = Evaluator.eval(
      args.car,
      this.environment,
      this.streamManager,
      this.depth,
      this.plugins,
    );
    if (Cons.isNotCons(anObject)) {
      throw new EvalError(cannotApply('set-cdr!', anObject));
    }
    const aCons = anObject as Cons;
    anObject = Evaluator.eval(
      args.nth(2),
      this.environment,
      this.streamManager,
      this.depth,
      this.plugins,
    );
    aCons.setCdr(anObject);

    return Evaluator.eval(args.car, this.environment, this.streamManager, this.depth, this.plugins);
  }

  /**
   * Implementation of the Lisp `setq` special form; assigns values in the local environment.
   * @param args the argument Cons containing alternating (symbol value) pairs
   * @return the last assigned value
   */
  setq(args: Cons): LispValue {
    let anObject: LispValue = Cons.nil;
    const anIterator = args.loop();
    const index = -1;

    while (anIterator.hasNext()) {
      if (!Cons.isSymbol(args.nth(index + 2))) {
        throw new EvalError(notSymbol(args.car));
      }
      const key = anIterator.next() as InterpretedSymbol;

      if (!anIterator.hasNext()) {
        throw new EvalError(SIZES_DO_NOT_MATCH);
      }
      anObject = Evaluator.eval(
        anIterator.next(),
        this.environment,
        this.streamManager,
        this.depth,
        this.plugins,
      );
      this.environment.set(key, anObject);
    }

    return anObject;
  }

  /**
   * Implementation of the Lisp `set-allq` special form; assigns values in the binding's owning scope.
   * @param args the argument Cons containing alternating (symbol value) pairs
   * @return the last assigned value
   */
  set_allq(args: Cons): LispValue {
    let anObject: LispValue = Cons.nil;
    const anIterator = args.loop();
    const index = -1;

    while (anIterator.hasNext()) {
      if (!Cons.isSymbol(args.nth(index + 2))) {
        throw new EvalError(notSymbol(args.car));
      }
      const key = anIterator.next() as InterpretedSymbol;
      anObject = Evaluator.eval(
        anIterator.next(),
        this.environment,
        this.streamManager,
        this.depth,
        this.plugins,
      );
      this.environment.setIfExist(key, anObject);
    }

    return anObject;
  }

  /**
   * Sets the current call depth used for trace and spy indentation.
   * @param aNumber the new depth
   */
  setDepth(aNumber: number): null {
    this.depth = aNumber;
    return null;
  }

  /**
   * Builds and returns the Lisp-name to method-name dispatch map for special forms.
   * @return the dispatch map
   */
  static setup(): Map<InterpretedSymbol, string> {
    try {
      const entries: Array<[string, string]> = [
        ['and', 'and'],
        ['apply', 'apply_lisp'],
        ['bind', 'bind'],
        ['cond', 'cond'],
        ['defmacro', 'defmacro'],
        ['defun', 'defun'],
        ['do', 'do_'],
        ['dolist', 'doList'],
        ['do*', 'doStar'],
        ['eval', 'eval_lisp'],
        ['exit', 'exit'],
        ['gc', 'gc'],
        ['if', 'if_'],
        ['lambda', 'lambda'],
        ['let', 'let'],
        ['let*', 'letStar'],
        ['macroexpand', 'macroexpand'],
        ['macroexpand-1', 'macroexpand_1'],
        ['not', 'not'],
        ['notrace', 'notrace'],
        ['or', 'or'],
        ['pop', 'pop_'],
        ['progn', 'progn'],
        ['princ', 'princ'],
        ['print', 'print'],
        ['push', 'push_'],
        ['quasiquote', 'quasiquote'],
        ['quote', 'quote'],
        ['rplaca', 'rplaca'],
        ['rplacd', 'rplacd'],
        ['setq', 'setq'],
        ['set-allq', 'set_allq'],
        ['terpri', 'terpri'],
        ['time', 'time'],
        ['trace', 'trace'],
        ['unless', 'unless'],
        ['unquote', 'unquote'],
        ['unquote-splicing', 'unquoteSplicing'],
        ['when', 'when'],
      ];
      return new Map(entries.map(([key, value]) => [InterpretedSymbol.of(key), value]));
    } catch {
      throw new Error('NullPointerException (Evaluator, initialize)');
    }
  }

  /**
   * Dispatches a special-form call to the corresponding method via the build-in dispatch map.
   * @param form the form whose car is the special-form symbol
   * @return the result of the special-form method
   */
  specialForm(form: Cons): LispValue {
    const aSymbol = form.car as InterpretedSymbol;

    if (this.isSpy(aSymbol)) {
      this.spyPrint(this.streamManager.spyStream(aSymbol), form.toString());
      this.setDepth(this.depth + 1);
    }

    const aCons = form.cdr as Cons;
    const methodName = Evaluator.buildInFunctions.get(aSymbol) as string;

    const target = this as unknown as Record<string, unknown>;
    const fn = target[methodName];
    if (typeof fn !== 'function') {
      throw new TypeError(`${this.constructor.name} does not have a method named "${methodName}"`);
    }
    const answer = (fn as (a: Cons) => LispValue).apply(target, [aCons]);

    if (this.isSpy(aSymbol)) {
      this.setDepth(this.depth - 1);
      this.spyPrint(
        this.streamManager.spyStream(aSymbol),
        String(answer) + ' <== ' + String(aSymbol),
      );
    }

    return answer;
  }

  /**
   * Writes a trace/spy line to the given stream (or stdout) with the current indentation.
   * @param aStream the destination stream, or null/string to fall back to stdout
   * @param line the line to write
   */
  spyPrint(aStream: NodeJS.WritableStream | string | null, line: string): null {
    const target: NodeJS.WritableStream =
      aStream != null && typeof aStream === 'object' && 'write' in aStream
        ? aStream
        : process.stdout;
    target.write(this.indent() + line + '\n');
    return null;
  }

  /**
   * Implementation of the Lisp `terpri` special form; writes a newline to stdout.
   * @return the symbol t
   */
  terpri(): InterpretedSymbol {
    process.stdout.write('\n');
    return InterpretedSymbol.of('t');
  }

  /**
   * Implementation of the Lisp `time` special form; measures evaluation time in milliseconds.
   * @param aCons the argument Cons whose car is the form to time
   * @return the elapsed time in milliseconds
   */
  time(aCons: Cons): number {
    const start = process.hrtime();
    Evaluator.eval(aCons.car, this.environment, this.streamManager, this.depth, this.plugins);
    const end = process.hrtime(start);

    return end[1] / 1_000_000;
  }

  /**
   * Implementation of the Lisp `trace` special form; enables tracing.
   * @return the symbol t
   */
  trace(): InterpretedSymbol {
    this.streamManager.trace();
    return InterpretedSymbol.of('t');
  }

  /**
   * Implementation of the Lisp `unless` special form.
   * @param aCons the argument Cons containing the test and body
   * @return the value of the last body form if the test is nil, otherwise nil
   */
  unless(aCons: Cons): LispValue {
    let anObject: LispValue = Cons.nil;
    const theCons = aCons.cdr as Cons;
    const flag = Evaluator.eval(
      aCons.car,
      this.environment,
      this.streamManager,
      this.depth,
      this.plugins,
    );
    if (Cons.isNotNil(flag)) {
      return Cons.nil;
    }
    for (const each of theCons.loop()) {
      anObject = Evaluator.eval(
        each,
        this.environment,
        this.streamManager,
        this.depth,
        this.plugins,
      );
    }

    return anObject;
  }

  /**
   * Implementation of the Lisp `when` special form.
   * @param aCons the argument Cons containing the test and body
   * @return the value of the last body form if the test is non-nil, otherwise nil
   */
  when(aCons: Cons): LispValue {
    let anObject: LispValue = Cons.nil;
    const theCons = aCons.cdr as Cons;
    const flag = Evaluator.eval(
      aCons.car,
      this.environment,
      this.streamManager,
      this.depth,
      this.plugins,
    );
    if (Cons.isNil(flag)) {
      return Cons.nil;
    }
    for (const each of theCons.loop()) {
      anObject = Evaluator.eval(
        each,
        this.environment,
        this.streamManager,
        this.depth,
        this.plugins,
      );
    }

    return anObject;
  }
}
