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
import type { LispValue } from '../../types/index.js';

/**
 * Equivalent to the old `expose-gc/function` package: lets us call GC without the `--expose-gc` flag.
 * The original package executed the equivalent setup at require time, so we lazily initialize on the first gc() call.
 */
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
export class Evaluator {
  static readonly buildInFunctions: Map<InterpretedSymbol, string> = Evaluator.setup();

  environment: Table;
  streamManager: StreamManager;
  depth: number;

  constructor(aTable: Table, aStreamManager: StreamManager, aNumber: number) {
    this.environment = aTable;
    this.streamManager = aStreamManager;
    this.depth = aNumber;
  }

  and(aCons: Cons): LispValue {
    for (const each of aCons.loop()) {
      const anObject = Evaluator.eval(each, this.environment, this.streamManager, this.depth);
      if (Cons.isNil(anObject)) {
        return Cons.nil;
      }
    }

    return InterpretedSymbol.of('t');
  }

  apply_lisp(aCons: Cons): LispValue {
    const procedure = Evaluator.eval(aCons.car, this.environment, this.streamManager, this.depth);
    const args = Evaluator.eval(aCons.nth(2), this.environment, this.streamManager, this.depth);
    let aTable: Table = this.environment;
    if (procedure instanceof Cons && procedure.last().car instanceof Table) {
      aTable = procedure.last().car as Table;
    }

    return Applier.apply(procedure, args, aTable, this.streamManager, this.depth);
  }

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

  binding(parameters: Cons, aTable: Table): null {
    for (const each of parameters.loop()) {
      const theCons = each as Cons;
      if (Cons.isNotSymbol(theCons.car)) {
        throw new EvalError(notSymbol(theCons.car));
      }
      const key = theCons.car as InterpretedSymbol;
      const value = Evaluator.eval(theCons.nth(2), aTable, this.streamManager, this.depth);
      aTable.set(key, value);
    }

    return null;
  }

  bindingParallel(parameters: Cons, aTable: Table): null {
    const theTable = new Map<unknown, LispValue>();
    for (const each of parameters.loop()) {
      const theCons = each as Cons;
      if (Cons.isNotSymbol(theCons.car)) {
        throw new EvalError(notSymbol(theCons.car));
      }
      const key = theCons.car as InterpretedSymbol;
      const value = Evaluator.eval(theCons.nth(2), aTable, this.streamManager, this.depth);
      theTable.set(key, value);
    }

    for (const [key, value] of theTable) {
      aTable.set(key, value);
    }

    return null;
  }

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
    );
    if (Cons.isNil(anObject)) {
      return this.cond(consCell.cdr);
    }
    const consequent = clause.cdr as Cons;
    for (const each of consequent.loop()) {
      anObject = Evaluator.eval(each, this.environment, this.streamManager, this.depth);
    }
    return anObject;
  }

  defun(aCons: Cons): LispValue {
    const variable = aCons.car;
    let lambda: LispValue = aCons.cdr;
    lambda =
      aCons.length() === 2
        ? (lambda as Cons).car
        : new Cons(InterpretedSymbol.of('lambda'), lambda);
    lambda = Evaluator.eval(lambda, new Table(this.environment), this.streamManager, this.depth);
    this.environment.set(variable, lambda);

    return variable;
  }

  do_(aCons: Cons): LispValue {
    const parameters = aCons.car as Cons;
    const bool = aCons.nth(2) as Cons;
    const expressions = (aCons.cdr as Cons).cdr as Cons;
    this.bindingParallel(parameters, this.environment);
    if (Cons.isNil(bool)) {
      bool.setCar(Cons.nil);
    }

    while (Cons.isNil(Evaluator.eval(bool.car, this.environment, this.streamManager, this.depth))) {
      const theTable = new Map<InterpretedSymbol, LispValue>();
      for (const each of expressions.loop()) {
        Evaluator.eval(each, this.environment, this.streamManager, this.depth);
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
          );
          theTable.set(key, value);
        }
      }
      for (const [key, value] of theTable) {
        this.environment.set(key, value);
      }
    }
    return Evaluator.eval(bool.nth(2), this.environment, this.streamManager, this.depth);
  }

  doList(aCons: Cons): LispValue {
    const parameter = aCons.car as Cons;
    const theCons = aCons.cdr as Cons;
    const args = Evaluator.eval(
      parameter.nth(2),
      this.environment,
      this.streamManager,
      this.depth,
    ) as Cons;
    for (const element of args.loop()) {
      this.environment.set(parameter.car, element);
      for (const each of theCons.loop()) {
        Evaluator.eval(each, this.environment, this.streamManager, this.depth);
      }
    }

    return Evaluator.eval(parameter.nth(3), this.environment, this.streamManager, this.depth);
  }

  doStar(aCons: Cons): LispValue {
    const parameters = aCons.car as Cons;
    const bool = aCons.nth(2) as Cons;
    const expressions = (aCons.cdr as Cons).cdr as Cons;
    this.binding(parameters, this.environment);
    if (Cons.isNil(bool)) {
      bool.setCar(Cons.nil);
    }

    while (Cons.isNil(Evaluator.eval(bool.car, this.environment, this.streamManager, this.depth))) {
      for (const each of expressions.loop()) {
        Evaluator.eval(each, this.environment, this.streamManager, this.depth);
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
          );
          this.environment.set(key, value);
        }
      }
    }
    return Evaluator.eval(bool.nth(2), this.environment, this.streamManager, this.depth);
  }

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
      args.add(Evaluator.eval(each, this.environment, this.streamManager, this.depth));
    }
    if (this.isSpy(aSymbol)) {
      this.setDepth(this.depth - 1);
    }

    args = args.cdr as Cons;
    return Applier.apply(procedure, args, this.environment, this.streamManager, this.depth);
  }

  static eval(
    form: LispValue,
    environment: Table,
    aStreamManager: StreamManager = new StreamManager(),
    depth: number = 1,
  ): LispValue {
    return new Evaluator(environment, aStreamManager, depth).eval(form);
  }

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

    return this.entrustApplier(formCons);
  }

  eval_lisp(aCons: Cons): LispValue {
    return Evaluator.eval(
      Evaluator.eval(aCons.car, this.environment, this.streamManager, this.depth),
      this.environment,
      this.streamManager,
      this.depth,
    );
  }

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

  exit(): never {
    console.log('Bye!');
    throw new ExitError();
  }

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

  if_(aCons: Cons): LispValue {
    const bool = Evaluator.eval(aCons.car, this.environment, this.streamManager, this.depth);
    const anObject: LispValue = Cons.isNil(bool) ? aCons.nth(3) : aCons.nth(2);

    return Evaluator.eval(anObject, this.environment, this.streamManager, this.depth);
  }

  indent(): string {
    let index = 0;
    let aString = '';
    while (index++ < this.depth) {
      aString += '| ';
    }

    return aString;
  }

  isSpy(aSymbol: InterpretedSymbol | null): boolean {
    if (aSymbol == null) {
      return false;
    }
    return this.streamManager.isSpy(aSymbol);
  }

  lambda(args: Cons): LispValue {
    const aCons = Cons.cloneValue(args) as Cons;
    const theCons = aCons.cdr as Cons;
    theCons.setCdr(new Cons(this.environment, Cons.nil));

    return new Cons(InterpretedSymbol.of('lambda'), aCons);
  }

  let(aCons: Cons): LispValue {
    const aTable = new Table(this.environment);
    const parameters = aCons.car as Cons;
    const forms = aCons.cdr as Cons;
    let anObject: LispValue = Cons.nil;
    this.bindingParallel(parameters, aTable);
    for (const each of forms.loop()) {
      anObject = Evaluator.eval(each, aTable, this.streamManager, this.depth);
    }

    return anObject;
  }

  letStar(aCons: Cons): LispValue {
    const aTable = new Table(this.environment);
    const parameters = aCons.car as Cons;
    const forms = aCons.cdr as Cons;
    let anObject: LispValue = Cons.nil;
    this.binding(parameters, aTable);
    for (const each of forms.loop()) {
      anObject = Evaluator.eval(each, aTable, this.streamManager, this.depth);
    }

    return anObject;
  }

  not(aCons: Cons): LispValue {
    if (Cons.isNil(Evaluator.eval(aCons.car, this.environment, this.streamManager, this.depth))) {
      return InterpretedSymbol.of('t');
    }
    return Cons.nil;
  }

  notrace(): InterpretedSymbol {
    this.streamManager.noTrace();
    return InterpretedSymbol.of('t');
  }

  or(aCons: Cons): LispValue {
    for (const each of aCons.loop()) {
      const anObject = Evaluator.eval(each, this.environment, this.streamManager, this.depth);
      if (Cons.isNotNil(anObject)) {
        return InterpretedSymbol.of('t');
      }
    }

    return Cons.nil;
  }

  pop_(aCons: Cons): LispValue {
    if (Cons.isNotSymbol(aCons.car)) {
      throw new EvalError(argumentNotSymbol(1));
    }
    const aSymbol = aCons.car as InterpretedSymbol;
    const anObject = Evaluator.eval(aSymbol, this.environment, this.streamManager, this.depth);
    if (Cons.isNotCons(anObject)) {
      return Cons.nil;
    }
    const consObject = anObject as Cons;
    this.environment.setIfExist(aSymbol, consObject.cdr);

    return consObject.car;
  }

  progn(aCons: Cons): LispValue {
    let anObject: LispValue = Cons.nil;
    for (const each of aCons.loop()) {
      anObject = Evaluator.eval(each, this.environment, this.streamManager, this.depth);
    }

    return anObject;
  }

  princ(aCons: Cons): LispValue {
    const anObject = Evaluator.eval(aCons.car, this.environment, this.streamManager, this.depth);
    process.stdout.write(String(anObject));

    return anObject;
  }

  print(aCons: Cons): LispValue {
    const anObject = Evaluator.eval(aCons.car, this.environment, this.streamManager, this.depth);
    process.stdout.write(String(anObject) + '\n');

    return anObject;
  }

  push_(aCons: Cons): LispValue {
    let anObject = Evaluator.eval(aCons.car, this.environment, this.streamManager, this.depth);
    if (Cons.isNotSymbol(aCons.nth(2))) {
      throw new EvalError(argumentNotSymbol(2));
    }
    const aSymbol = aCons.nth(2) as InterpretedSymbol;
    anObject = new Cons(
      anObject,
      Evaluator.eval(aSymbol, this.environment, this.streamManager, this.depth),
    );
    this.environment.setIfExist(aSymbol, anObject);

    return anObject;
  }

  quote(aCons: Cons): LispValue {
    return aCons.car;
  }

  rplaca(args: Cons): LispValue {
    let anObject = Evaluator.eval(args.car, this.environment, this.streamManager, this.depth);
    if (Cons.isNotCons(anObject)) {
      throw new EvalError(cannotApply('set-car!', anObject));
    }
    const aCons = anObject as Cons;
    anObject = Evaluator.eval(args.nth(2), this.environment, this.streamManager, this.depth);
    aCons.setCar(anObject);

    return Evaluator.eval(args.car, this.environment, this.streamManager, this.depth);
  }

  rplacd(args: Cons): LispValue {
    let anObject = Evaluator.eval(args.car, this.environment, this.streamManager, this.depth);
    if (Cons.isNotCons(anObject)) {
      throw new EvalError(cannotApply('set-cdr!', anObject));
    }
    const aCons = anObject as Cons;
    anObject = Evaluator.eval(args.nth(2), this.environment, this.streamManager, this.depth);
    aCons.setCdr(anObject);

    return Evaluator.eval(args.car, this.environment, this.streamManager, this.depth);
  }

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
      );
      this.environment.set(key, anObject);
    }

    return anObject;
  }

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
      );
      this.environment.setIfExist(key, anObject);
    }

    return anObject;
  }

  setDepth(aNumber: number): null {
    this.depth = aNumber;
    return null;
  }

  static setup(): Map<InterpretedSymbol, string> {
    try {
      const entries: Array<[string, string]> = [
        ['and', 'and'],
        ['apply', 'apply_lisp'],
        ['bind', 'bind'],
        ['cond', 'cond'],
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
        ['not', 'not'],
        ['notrace', 'notrace'],
        ['or', 'or'],
        ['pop', 'pop_'],
        ['progn', 'progn'],
        ['princ', 'princ'],
        ['print', 'print'],
        ['push', 'push_'],
        ['quote', 'quote'],
        ['rplaca', 'rplaca'],
        ['rplacd', 'rplacd'],
        ['setq', 'setq'],
        ['set-allq', 'set_allq'],
        ['terpri', 'terpri'],
        ['time', 'time'],
        ['trace', 'trace'],
        ['unless', 'unless'],
        ['when', 'when'],
      ];
      return new Map(entries.map(([key, value]) => [InterpretedSymbol.of(key), value]));
    } catch {
      throw new Error('NullPointerException (Evaluator, initialize)');
    }
  }

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

  // NOTE: Lisp's trace/spy writes the call line to a designated output stream. The original
  //       implementation logged the stream object itself rather than writing to it (a bug that
  //       went unnoticed because trace/spy is rarely exercised). We now write the indented line
  //       to the given WritableStream, falling back to stdout when the argument is a string
  //       descriptor (stored by `(spy fn "label")`) or null.
  spyPrint(aStream: NodeJS.WritableStream | string | null, line: string): null {
    const target: NodeJS.WritableStream =
      aStream != null && typeof aStream === 'object' && 'write' in aStream
        ? aStream
        : process.stdout;
    target.write(this.indent() + line + '\n');
    return null;
  }

  terpri(): InterpretedSymbol {
    process.stdout.write('\n');
    return InterpretedSymbol.of('t');
  }

  time(aCons: Cons): number {
    const start = process.hrtime();
    Evaluator.eval(aCons.car, this.environment, this.streamManager, this.depth);
    const end = process.hrtime(start);

    return end[1] / 1_000_000;
  }

  trace(): InterpretedSymbol {
    this.streamManager.trace();
    return InterpretedSymbol.of('t');
  }

  unless(aCons: Cons): LispValue {
    let anObject: LispValue = Cons.nil;
    const theCons = aCons.cdr as Cons;
    const flag = Evaluator.eval(aCons.car, this.environment, this.streamManager, this.depth);
    if (Cons.isNotNil(flag)) {
      return Cons.nil;
    }
    for (const each of theCons.loop()) {
      anObject = Evaluator.eval(each, this.environment, this.streamManager, this.depth);
    }

    return anObject;
  }

  when(aCons: Cons): LispValue {
    let anObject: LispValue = Cons.nil;
    const theCons = aCons.cdr as Cons;
    const flag = Evaluator.eval(aCons.car, this.environment, this.streamManager, this.depth);
    if (Cons.isNil(flag)) {
      return Cons.nil;
    }
    for (const each of theCons.loop()) {
      anObject = Evaluator.eval(each, this.environment, this.streamManager, this.depth);
    }

    return anObject;
  }
}
