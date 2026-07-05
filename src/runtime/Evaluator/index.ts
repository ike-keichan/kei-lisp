import v8 from 'node:v8';
import vm from 'node:vm';

import { Applier } from '../Applier/index.js';
import { Cons } from '../../value/Cons/index.js';
import { EvalError } from '../../errors/EvalError/index.js';
import { ExitError } from '../../errors/ExitError/index.js';
import { InterpretedSymbol } from '../../value/InterpretedSymbol/index.js';
import { Numeric } from '../../value/Numeric/index.js';
import { KeiLispError } from '../../errors/KeiLispError/index.js';
import { ParseError } from '../../errors/ParseError/index.js';
import { cannotApply, noBinding, notSymbol, SIZES_DO_NOT_MATCH } from '../../constants/index.js';
import { StreamManager } from '../StreamManager/index.js';
import { Table } from '../Table/index.js';
import { TailCall } from '../TailCall/index.js';
import { ThrowSignal } from '../ThrowSignal/index.js';
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
  bindAUX(aSymbol: InterpretedSymbol): bigint {
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

    return BigInt(count);
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
   * Evaluates a sub-form in this Evaluator's environment.
   * @param form the form to evaluate
   * @return the evaluation result
   */
  evalSub(form: LispValue): LispValue {
    return Evaluator.eval(form, this.environment, this.streamManager, this.depth, this.plugins);
  }

  /**
   * Evaluates each form of a (possibly empty) body list and returns the last value.
   * @param body the body list (a Cons of forms, or nil)
   * @return the value of the last form, or nil for an empty body
   */
  evalBody(body: LispValue): LispValue {
    let anObject: LispValue = Cons.nil;
    let current: LispValue = body;
    while (Cons.isCons(current)) {
      anObject = this.evalSub(current.car);
      current = current.cdr;
    }

    return anObject;
  }

  /**
   * Evaluates a form in tail position. Tail-transparent special forms
   * (`if`, `cond`, `case`, `when`, `unless`, `progn`, `let`, `let*`) are
   * unwound iteratively, macros are expanded in place, and a call to a user
   * lambda returns a `TailCall` sentinel instead of recursing — the Applier's
   * lambda-application loop then applies it iteratively (TCO).
   * @param form the form to evaluate in tail position
   * @return the evaluation result, or a TailCall sentinel
   */
  evalTail(form: LispValue): LispValue | TailCall {
    let current: LispValue = form;
    let evaluator: Evaluator = this;

    for (;;) {
      if (Cons.isNotCons(current) || Cons.isNotSymbol((current as Cons).car)) {
        return evaluator.eval(current);
      }
      const formCons = current as Cons;
      const operator = formCons.car as InterpretedSymbol;

      if (Evaluator.buildInFunctions.has(operator)) {
        const step = evaluator.tailSelect(formCons);
        if (step == null) {
          return evaluator.eval(current);
        }
        if (step.kind === 'value') {
          return step.value;
        }
        current = step.form;
        if (step.table !== evaluator.environment) {
          evaluator = new Evaluator(step.table, this.streamManager, this.depth, this.plugins);
        }
        continue;
      }

      const macroLambda = evaluator.lookupMacro(operator);
      if (macroLambda != null) {
        current = evaluator.expandMacro1(formCons, macroLambda);
        continue;
      }

      if (evaluator.plugins.some((plugin) => plugin.has(operator))) {
        return evaluator.eval(current);
      }

      const bound = evaluator.environment.get(operator);
      if (Evaluator.isUserLambda(bound)) {
        return new TailCall(bound as Cons, evaluator.evalArgs(formCons.cdr));
      }

      return evaluator.eval(current);
    }
  }

  /**
   * Selects the tail form of a tail-transparent special form, evaluating any
   * non-tail parts (tests, bindings, leading body forms) along the way.
   * @param formCons the special-form call
   * @return a finished value, the next form (with its table) to evaluate in
   *         tail position, or null when the operator is not tail-transparent
   */
  tailSelect(
    formCons: Cons,
  ): { kind: 'value'; value: LispValue } | { kind: 'form'; form: LispValue; table: Table } | null {
    const operator = (formCons.car as InterpretedSymbol).name;
    const args = formCons.cdr as Cons;
    switch (operator) {
      case 'if': {
        const bool = this.evalSub(args.car);
        return this.tailForm(Cons.isNil(bool) ? args.nth(3) : args.nth(2));
      }
      case 'progn': {
        return this.tailBody(args, Cons.nil);
      }
      case 'when':
      case 'unless': {
        const bool = this.evalSub(args.car);
        const taken = operator === 'when' ? Cons.isNotNil(bool) : Cons.isNil(bool);
        if (!taken) {
          return { kind: 'value', value: Cons.nil };
        }
        return this.tailBody(args.cdr, Cons.nil);
      }
      case 'cond': {
        return this.tailCond(args);
      }
      case 'case': {
        const key = this.evalSub(args.car);
        let clauses: LispValue = args.cdr;
        while (Cons.isCons(clauses)) {
          const clause = clauses.car;
          if (Cons.isNotCons(clause)) {
            throw new EvalError(cannotApply('case', clause));
          }
          if (this.caseMatches(key, (clause as Cons).car)) {
            return this.tailBody((clause as Cons).cdr, Cons.nil);
          }
          clauses = clauses.cdr;
        }
        return { kind: 'value', value: Cons.nil };
      }
      case 'let':
      case 'let*': {
        const aTable = new Table(this.environment);
        if (operator === 'let') {
          this.bindingParallel(args.car as Cons, aTable);
        } else {
          this.binding(args.car as Cons, aTable);
        }
        const inner = new Evaluator(aTable, this.streamManager, this.depth, this.plugins);
        return inner.tailBody(args.cdr, Cons.nil);
      }
      default: {
        return null;
      }
    }
  }

  /**
   * Wraps a form as a tail-position step in the current environment.
   * @param form the form to evaluate next
   * @return a tail step record
   */
  tailForm(form: LispValue): { kind: 'form'; form: LispValue; table: Table } {
    return { kind: 'form', form, table: this.environment };
  }

  /**
   * Evaluates all but the last form of a body and returns the last one as the
   * tail step; an empty body finishes with the given default value.
   * @param body the body list
   * @param empty the value to return for an empty body
   * @return a tail step record or a finished value
   */
  tailBody(
    body: LispValue,
    empty: LispValue,
  ): { kind: 'value'; value: LispValue } | { kind: 'form'; form: LispValue; table: Table } {
    if (Cons.isNotCons(body)) {
      return { kind: 'value', value: empty };
    }
    let current: Cons = body as Cons;
    while (Cons.isCons(current.cdr)) {
      this.evalSub(current.car);
      current = current.cdr;
    }

    return this.tailForm(current.car);
  }

  /**
   * Walks `cond` clauses in tail position: evaluates each test and returns the
   * matching clause's last body form as the tail step (or the test value for
   * an empty consequent, matching `cond`'s behavior).
   * @param clauses the clause list
   * @return a tail step record or a finished value
   */
  tailCond(
    clauses: LispValue,
  ): { kind: 'value'; value: LispValue } | { kind: 'form'; form: LispValue; table: Table } {
    let current: LispValue = clauses;
    while (Cons.isCons(current)) {
      const clause = current.car as Cons;
      const bool = this.evalSub(clause.car);
      if (Cons.isNotNil(bool)) {
        return this.tailBody(clause.cdr, bool);
      }
      current = current.cdr;
    }

    return { kind: 'value', value: Cons.nil };
  }

  /**
   * Evaluates a call-form argument list (stopping at the closure Table
   * sentinel) and returns the evaluated argument list.
   * @param list the unevaluated argument list
   * @return the evaluated argument list
   */
  evalArgs(list: LispValue): LispValue {
    const head = new Cons(Cons.nil, Cons.nil);
    if (Cons.isCons(list)) {
      for (const each of list.loop()) {
        if (each instanceof Table) {
          break;
        }
        head.add(this.evalSub(each));
      }
    }

    return head.cdr;
  }

  /**
   * Returns whether the given value is a user lambda closure (a lambda Cons
   * with a captured environment) rather than a macro or plain data.
   * @param value the environment binding to inspect
   * @return a boolean
   */
  static isUserLambda(value: LispValue): boolean {
    return (
      Cons.isCons(value) &&
      value.car === InterpretedSymbol.of('lambda') &&
      value.last().car instanceof Table
    );
  }

  /**
   * Implementation of the Lisp `catch` special form. Evaluates the tag form,
   * then the body; a `throw` to an `eq` tag during the body unwinds to here
   * and its value becomes the result.
   * @param aCons the argument Cons containing the tag form and the body
   * @return the value of the last body form, or the thrown value
   */
  catch_(aCons: Cons): LispValue {
    const tag = this.evalSub(aCons.car);
    try {
      return this.evalBody(aCons.cdr);
    } catch (error) {
      if (error instanceof ThrowSignal && error.tag === tag) {
        return error.value;
      }
      throw error;
    }
  }

  /**
   * Implementation of the Lisp `throw` special form. Evaluates the tag and
   * value forms and unwinds to the nearest dynamically enclosing `catch`
   * whose tag is `eq` to the thrown tag.
   * @param aCons the argument Cons containing the tag form and the value form
   */
  throw_(aCons: Cons): never {
    const tag = this.evalSub(aCons.car);
    const value = this.evalSub(aCons.nth(2));

    throw new ThrowSignal(tag, value);
  }

  /**
   * Implementation of the Lisp `handler-case` special form (the common subset
   * of CL `handler-case` / Scheme `guard` / Clojure `try`-`catch`). Evaluates
   * the protected form; when it signals an error, runs the body of the first
   * clause whose type matches — `error` matches any interpreter error,
   * `parse-error` / `eval-error` match the specific families. The clause
   * variable (when given) is bound to the error message string. `throw`
   * signals and `exit` are not errors and pass through untouched.
   * @param aCons the argument Cons containing the protected form and the clauses
   * @return the value of the protected form, or of the matching clause body
   */
  handlerCase(aCons: Cons): LispValue {
    try {
      return this.evalSub(aCons.car);
    } catch (error) {
      if (!(error instanceof KeiLispError) || error instanceof ExitError) {
        throw error;
      }
      const clause = this.findHandlerClause(aCons.cdr, error);
      if (clause == null) {
        throw error;
      }
      return this.runHandlerClause(clause, error);
    }
  }

  /**
   * Returns the first `handler-case` clause matching the given error, or null.
   * @param clauses the clause list of a handler-case form
   * @param error the signaled error
   * @return the matching clause Cons, or null
   */
  findHandlerClause(clauses: LispValue, error: KeiLispError): Cons | null {
    let current: LispValue = clauses;
    while (Cons.isCons(current)) {
      const clause = current.car;
      if (Cons.isNotCons(clause)) {
        throw new EvalError(cannotApply('handler-case', clause));
      }
      const clauseCons = clause as Cons;
      if (this.handlerClauseMatches(clauseCons.car, error)) {
        return clauseCons;
      }
      current = current.cdr;
    }

    return null;
  }

  /**
   * Returns whether a `handler-case` clause type symbol matches the error.
   * @param type the clause type designator
   * @param error the signaled error
   * @return a boolean
   */
  handlerClauseMatches(type: LispValue, error: KeiLispError): boolean {
    if (Cons.isNotSymbol(type)) {
      return false;
    }
    switch ((type as InterpretedSymbol).name) {
      case 'error': {
        return true;
      }
      case 'parse-error': {
        return error instanceof ParseError;
      }
      case 'eval-error': {
        return error instanceof EvalError;
      }
      default: {
        return false;
      }
    }
  }

  /**
   * Runs the body of a matched `handler-case` clause, binding its optional
   * variable to the error message string.
   * @param clause the matched clause Cons: (type (var?) body...)
   * @param error the signaled error
   * @return the value of the last body form
   */
  runHandlerClause(clause: Cons, error: KeiLispError): LispValue {
    const varList = clause.nth(2);
    const aTable = new Table(this.environment);
    if (Cons.isCons(varList) && Cons.isSymbol(varList.car)) {
      aTable.set(varList.car, error.message);
    }
    const body = (clause.cdr as Cons).cdr;

    let anObject: LispValue = Cons.nil;
    let current: LispValue = body;
    while (Cons.isCons(current)) {
      anObject = Evaluator.eval(current.car, aTable, this.streamManager, this.depth, this.plugins);
      current = current.cdr;
    }

    return anObject;
  }

  /**
   * Implementation of the Lisp `case` special form. Evaluates the key form and
   * runs the body of the first clause whose (unevaluated) keys match the key;
   * a clause head of `t` or `otherwise` always matches.
   * @param aCons the argument Cons containing the key form and the clauses
   * @return the value of the matching clause's last body form, or nil
   */
  case_(aCons: Cons): LispValue {
    const key = this.evalSub(aCons.car);
    let clauses: LispValue = aCons.cdr;
    while (Cons.isCons(clauses)) {
      const clause = clauses.car;
      if (Cons.isNotCons(clause)) {
        throw new EvalError(cannotApply('case', clause));
      }
      const clauseCons = clause as Cons;
      if (this.caseMatches(key, clauseCons.car)) {
        return this.evalBody(clauseCons.cdr);
      }
      clauses = clauses.cdr;
    }

    return Cons.nil;
  }

  /**
   * Returns whether a `case` clause head matches the given key. A head of `t`
   * or `otherwise` always matches; a list head matches when any of its
   * (unevaluated) elements is identical to the key; an atom head matches when
   * it is identical to the key. A nil head never matches (CL semantics).
   * @param key the evaluated key value
   * @param head the clause head (keys), unevaluated
   * @return a boolean
   */
  caseMatches(key: LispValue, head: LispValue): boolean {
    if (Cons.isSymbol(head) && (head.name === 't' || head.name === 'otherwise')) {
      return true;
    }
    if (Cons.isCons(head)) {
      for (const each of head.loop()) {
        if (each === key) {
          return true;
        }
      }
      return false;
    }
    if (Cons.isNil(head)) {
      return false;
    }

    return head === key;
  }

  /**
   * Implementation of the Lisp `setf` special form. Assigns each value to the
   * corresponding generalized place, like `setq` but accepting places.
   * @param args the argument Cons containing alternating (place value) pairs
   * @return the last assigned value
   */
  setf(args: Cons): LispValue {
    let anObject: LispValue = Cons.nil;
    let current: LispValue = args;
    while (Cons.isCons(current)) {
      const place = current.car;
      if (Cons.isNotCons(current.cdr)) {
        throw new EvalError(SIZES_DO_NOT_MATCH);
      }
      anObject = this.evalSub((current.cdr as Cons).car);
      this.writePlace(place, anObject);
      current = (current.cdr as Cons).cdr;
    }

    return anObject;
  }

  /**
   * Implementation of the Lisp `incf` special form; increments a numeric place.
   * @param aCons the argument Cons containing the place and an optional delta
   * @return the new value of the place
   */
  incf(aCons: Cons): LispValue {
    return this.incrementPlace(aCons, 1);
  }

  /**
   * Implementation of the Lisp `decf` special form; decrements a numeric place.
   * @param aCons the argument Cons containing the place and an optional delta
   * @return the new value of the place
   */
  decf(aCons: Cons): LispValue {
    return this.incrementPlace(aCons, -1);
  }

  /**
   * Shared implementation of `incf` / `decf`: reads a numeric place, adds the
   * (optional, default 1) delta with the given sign, and writes it back.
   * @param aCons the argument Cons containing the place and an optional delta form
   * @param sign +1 for incf, -1 for decf
   * @return the new value of the place
   */
  incrementPlace(aCons: Cons, sign: number): LispValue {
    const place = aCons.car;
    let delta: LispValue = 1n;
    if (Cons.isNotNil(aCons.cdr)) {
      delta = this.evalSub(aCons.nth(2));
    }
    if (!Cons.isNumber(delta)) {
      throw new EvalError(cannotApply(sign === 1 ? 'incf' : 'decf', delta));
    }
    const current = this.evalSub(place);
    if (!Cons.isNumber(current)) {
      throw new EvalError(cannotApply(sign === 1 ? 'incf' : 'decf', current));
    }
    const value = sign === 1 ? Numeric.add(current, delta) : Numeric.subtract(current, delta);
    this.writePlace(place, value);

    return value;
  }

  /**
   * Writes a value into a generalized place (a setf-able location): a symbol,
   * `(car x)`, `(cdr x)`, `(nth n x)`, `(elt x n)`, `(getf sym key)`, or a
   * struct field accessor generated by `defstruct`.
   * @param place the place form, unevaluated
   * @param value the value to store
   * @return the stored value
   */
  writePlace(place: LispValue, value: LispValue): LispValue {
    if (Cons.isSymbol(place)) {
      if (this.environment.setIfExist(place, value) == null) {
        this.environment.set(place, value);
      }
      return value;
    }
    if (Cons.isNotCons(place) || Cons.isNotSymbol((place as Cons).car)) {
      throw new EvalError(cannotApply('setf', place));
    }

    return this.writePlaceCons(place as Cons, value);
  }

  /**
   * Writes a value into a compound place form; see `writePlace`.
   * @param place the compound place form whose car is the place operator
   * @param value the value to store
   * @return the stored value
   */
  writePlaceCons(place: Cons, value: LispValue): LispValue {
    const operator = place.car as InterpretedSymbol;
    switch (operator.name) {
      case 'car': {
        this.placeTargetCons(place).setCar(value);
        return value;
      }
      case 'cdr': {
        this.placeTargetCons(place).setCdr(value);
        return value;
      }
      case 'nth': {
        // `nth` is 1-based in kei-lisp, matching the reader function.
        const index = this.evalSub(place.nth(2));
        const list = this.evalSub(place.nth(3));
        this.nthCell(list, index, 'nth').setCar(value);
        return value;
      }
      case 'elt': {
        const list = this.evalSub(place.nth(2));
        const index = this.evalSub(place.nth(3));
        if (Cons.isVector(list)) {
          const position = Numeric.toIndex(index);
          if (position == null) {
            throw new EvalError(cannotApply('elt', index));
          }
          try {
            return list.set(position, value);
          } catch (error) {
            if (error instanceof RangeError) {
              throw new EvalError(error.message);
            }
            throw error;
          }
        }
        this.nthCell(list, Cons.isNumber(index) ? Numeric.add(index, 1n) : index, 'elt').setCar(
          value,
        );
        return value;
      }
      case 'getf': {
        return this.writeGetfPlace(place, value);
      }
      case 'gethash': {
        const key = this.evalSub(place.nth(2));
        const table = this.evalSub(place.nth(3));
        if (!Cons.isHashTable(table)) {
          throw new EvalError(cannotApply('setf', table));
        }
        return table.set(key, value);
      }
      case 'aref':
      case 'svref': {
        const target = this.evalSub(place.nth(2));
        const index = Numeric.toIndex(this.evalSub(place.nth(3)));
        if (!Cons.isVector(target) || index == null) {
          throw new EvalError(cannotApply('setf', place));
        }
        try {
          return target.set(index, value);
        } catch (error) {
          if (error instanceof RangeError) {
            throw new EvalError(error.message);
          }
          throw error;
        }
      }
      default: {
        const position = this.rootTable().structAccessors.get(operator);
        if (position == null) {
          throw new EvalError(cannotApply('setf', place));
        }
        const target = this.evalSub(place.nth(2));
        this.nthCell(target, position, 'setf').setCar(value);
        return value;
      }
    }
  }

  /**
   * Evaluates the single target sub-form of a `(car x)` / `(cdr x)` place and
   * requires it to be a Cons.
   * @param place the place form
   * @return the target Cons
   */
  placeTargetCons(place: Cons): Cons {
    const target = this.evalSub(place.nth(2));
    if (Cons.isNotCons(target)) {
      throw new EvalError(cannotApply('setf', target));
    }

    return target as Cons;
  }

  /**
   * Returns the cell holding the element at the given 1-based position of a list.
   * @param list the list value
   * @param position the 1-based position (as used by `nth`)
   * @param operator the operator name used in error messages
   * @return the Cons cell whose car is the addressed element
   */
  nthCell(list: LispValue, position: LispValue, operator: string): Cons {
    const index = Numeric.toIndex(position);
    if (index == null || index < 1) {
      throw new EvalError(cannotApply(operator, position));
    }
    let current: LispValue = list;
    let count = 1;
    while (Cons.isCons(current)) {
      if (count >= index) {
        return current;
      }
      count++;
      current = current.cdr;
    }

    throw new EvalError(cannotApply(operator, list));
  }

  /**
   * Implements `(setf (getf plist key) value)`. When the property list already
   * contains the key its value cell is mutated; otherwise a new (key value)
   * pair is appended. An empty property list is only supported when the plist
   * form is a symbol, which is then rebound to the fresh list.
   * @param place the (getf plist key) place form
   * @param value the value to store
   * @return the stored value
   */
  writeGetfPlace(place: Cons, value: LispValue): LispValue {
    const plistForm = place.nth(2);
    const key = this.evalSub(place.nth(3));
    const plist = this.evalSub(plistForm);

    if (Cons.isCons(plist)) {
      let current: LispValue = plist;
      while (Cons.isCons(current) && Cons.isCons(current.cdr)) {
        if (current.car === key) {
          current.cdr.setCar(value);
          return value;
        }
        current = current.cdr.cdr;
      }
      plist.nconc(new Cons(key, new Cons(value, Cons.nil)));
      return value;
    }
    if (Cons.isNil(plist) && Cons.isSymbol(plistForm)) {
      this.writePlace(plistForm, new Cons(key, new Cons(value, Cons.nil)));
      return value;
    }

    throw new EvalError(cannotApply('setf', place));
  }

  /**
   * Returns the root table of this Evaluator's environment chain.
   * @return the root Table
   */
  rootTable(): Table {
    let aTable: Table = this.environment;
    while (aTable.source != null) {
      aTable = aTable.source;
    }

    return aTable;
  }

  /**
   * Implementation of the Lisp `destructuring-bind` special form. Binds the
   * symbols of a (possibly nested or dotted) pattern to the corresponding
   * parts of the evaluated expression and evaluates the body.
   * @param aCons the argument Cons containing the pattern, the expression, and the body
   * @return the value of the last body form
   */
  destructuringBind(aCons: Cons): LispValue {
    const pattern = aCons.car;
    const value = this.evalSub(aCons.nth(2));
    const aTable = new Table(this.environment);
    this.destructure(pattern, value, aTable);
    const body = (aCons.cdr as Cons).cdr;

    let anObject: LispValue = Cons.nil;
    let current: LispValue = body;
    while (Cons.isCons(current)) {
      anObject = Evaluator.eval(current.car, aTable, this.streamManager, this.depth, this.plugins);
      current = current.cdr;
    }

    return anObject;
  }

  /**
   * Recursively binds a destructuring pattern against a value into the given table.
   * @param pattern the pattern (a symbol, nil, or a possibly dotted Cons of patterns)
   * @param value the value to destructure
   * @param aTable the table receiving the bindings
   */
  destructure(pattern: LispValue, value: LispValue, aTable: Table): null {
    if (Cons.isNil(pattern)) {
      if (Cons.isNotNil(value)) {
        throw new EvalError(SIZES_DO_NOT_MATCH);
      }
      return null;
    }
    if (Cons.isSymbol(pattern)) {
      aTable.set(pattern, value);
      return null;
    }
    if (Cons.isNotCons(pattern)) {
      throw new EvalError(cannotApply('destructuring-bind', pattern));
    }
    if (Cons.isNotCons(value)) {
      throw new EvalError(SIZES_DO_NOT_MATCH);
    }
    this.destructure((pattern as Cons).car, (value as Cons).car, aTable);
    this.destructure((pattern as Cons).cdr, (value as Cons).cdr, aTable);

    return null;
  }

  /**
   * Implementation of the Lisp `defstruct` special form. Defines a structure
   * type represented as a tagged list `(name field1 field2 ...)` and generates
   * a positional constructor `make-<name>`, a predicate `<name>-p`, and one
   * accessor `<name>-<field>` per field. Accessors are registered as `setf`
   * places. (Keyword-argument constructors arrive with the keyword type.)
   * @param aCons the argument Cons containing the struct name and the field symbols
   * @return the struct name symbol
   */
  defstruct(aCons: Cons): LispValue {
    if (Cons.isNotSymbol(aCons.car)) {
      throw new EvalError(notSymbol(aCons.car));
    }
    const name = aCons.car as InterpretedSymbol;
    const fields: InterpretedSymbol[] = [];
    let current: LispValue = aCons.cdr;
    while (Cons.isCons(current)) {
      if (Cons.isNotSymbol(current.car)) {
        throw new EvalError(notSymbol(current.car));
      }
      fields.push(current.car as InterpretedSymbol);
      current = current.cdr;
    }

    const params = fields.map((field) => field.name).join(' ');
    this.defineDerivedLambda(
      `make-${name.name}`,
      `(lambda (${params}) (list (quote ${name.name}) ${params}))`,
    );
    this.defineDerivedLambda(
      `${name.name}-p`,
      `(lambda (anObject) (if (consp anObject) (if (eq (car anObject) (quote ${name.name})) t nil) nil))`,
    );
    for (const [index, field] of fields.entries()) {
      const accessorName = `${name.name}-${field.name}`;
      const position = String(index + 2);
      this.defineDerivedLambda(accessorName, `(lambda (anObject) (nth ${position} anObject))`);
      this.rootTable().structAccessors.set(InterpretedSymbol.of(accessorName), index + 2);
    }

    return name;
  }

  /**
   * Parses a lambda source string, captures the current environment, and binds
   * the resulting closure under the given name (used by `defstruct`).
   * @param name the function name to bind
   * @param source the lambda source string
   */
  defineDerivedLambda(name: string, source: string): null {
    const lambda = Cons.parse(source) as Cons;
    lambda.last().setCdr(new Cons(this.environment, Cons.nil));
    this.environment.set(InterpretedSymbol.of(name), lambda);

    return null;
  }

  /**
   * Implementation of the Lisp `with-output-to-string` special form. Evaluates
   * the body while capturing program output (`princ`, `print`, `terpri`,
   * `format`) and returns the captured text as a string. The CL stream
   * variable list is accepted for compatibility but no stream is bound
   * (kei-lisp has no stream objects yet), so it must be empty or is ignored.
   * @param aCons the argument Cons containing an optional stream variable list and the body
   * @return the captured output string
   */
  withOutputToString(aCons: Cons): LispValue {
    let body: LispValue = aCons;
    if (Cons.isCons(aCons) && Cons.isList(aCons.car)) {
      body = aCons.cdr;
    }
    this.streamManager.pushCapture();
    try {
      this.evalBody(body);
    } catch (error) {
      this.streamManager.popCapture();
      throw error;
    }

    return this.streamManager.popCapture();
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
    // Keyword symbols (:foo) evaluate to themselves (CL / Clojure semantics).
    if (aSymbol.name.startsWith(':')) {
      return aSymbol;
    }
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
    const pair = (key: string, value: number): Cons =>
      new Cons(InterpretedSymbol.of(key), BigInt(value));
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
   * Implementation of the Lisp `pop` special form. Pops the first element off
   * the list stored in a generalized place (CL semantics).
   * @param aCons the argument Cons whose car is the place bound to a list
   * @return the popped element, or nil if the place value is not a Cons
   */
  pop_(aCons: Cons): LispValue {
    const place = aCons.car;
    const anObject = this.evalSub(place);
    if (Cons.isNotCons(anObject)) {
      return Cons.nil;
    }
    const consObject = anObject as Cons;
    this.writePlace(place, consObject.cdr);

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
    this.streamManager.writeOutput(String(anObject));

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
    this.streamManager.writeOutput(String(anObject) + '\n');

    return anObject;
  }

  /**
   * Implementation of the Lisp `push` special form. Prepends a value onto the
   * list stored in a generalized place (CL semantics).
   * @param aCons the argument Cons containing the value to push and the target place
   * @return the new Cons stored in the place
   */
  push_(aCons: Cons): LispValue {
    const value = this.evalSub(aCons.car);
    const place = aCons.nth(2);
    const anObject = new Cons(value, this.evalSub(place));
    this.writePlace(place, anObject);

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
   * Appends the elements of a spliced value (`,@`) onto the accumulator. The
   * value must be a proper list (or nil); an atom or an improper (dotted) list
   * is rejected rather than silently dropping the dotted tail.
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
    let current: LispValue = value;
    while (Cons.isCons(current)) {
      parts.push(current.car);
      current = current.cdr;
    }
    if (Cons.isNotNil(current)) {
      throw new EvalError(cannotApply('unquote-splicing', value));
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
        ['case', 'case_'],
        ['catch', 'catch_'],
        ['cond', 'cond'],
        ['decf', 'decf'],
        ['defmacro', 'defmacro'],
        ['defstruct', 'defstruct'],
        ['defun', 'defun'],
        ['destructuring-bind', 'destructuringBind'],
        ['do', 'do_'],
        ['dolist', 'doList'],
        ['do*', 'doStar'],
        ['eval', 'eval_lisp'],
        ['exit', 'exit'],
        ['gc', 'gc'],
        ['handler-case', 'handlerCase'],
        ['if', 'if_'],
        ['incf', 'incf'],
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
        ['setf', 'setf'],
        ['setq', 'setq'],
        ['set-allq', 'set_allq'],
        ['with-output-to-string', 'withOutputToString'],
        ['terpri', 'terpri'],
        ['throw', 'throw_'],
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
    this.streamManager.writeOutput('\n');
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
