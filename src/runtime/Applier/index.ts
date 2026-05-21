import { Cons } from '../../value/Cons/index.js';
import { Evaluator } from '../Evaluator/index.js';
import { InterpretedSymbol } from '../../value/InterpretedSymbol/index.js';
import {
  cannotApply,
  noProcedure,
  SIZE_DO_NOT_MATCH,
  SIZES_DO_NOT_MATCH,
} from '../../constants/index.js';
import type { StreamManager } from '../StreamManager/index.js';
import { Table } from '../Table/index.js';
import type { LispValue } from '../../types/index.js';

const SELECT_PRINT_FUNCTION_NOT_DEFINED = 'selectPrintFunction is not defined';

/**
 * Class that mimics Lisp's universal function Apply.
 * @class
 * @classdesc
 * @author Keisuke Ikeda
 * @this {Applier}
 */
export class Applier {
  static readonly buildInFunctions: Map<InterpretedSymbol, string> = Applier.setup();
  static #generateNumber = 0;

  environment: Table;
  streamManager: StreamManager;
  depth: number;

  constructor(aTable: Table, aStreamManager: StreamManager, aNumber: number) {
    this.environment = new Table(aTable);
    this.streamManager = aStreamManager;
    this.depth = aNumber;
  }

  abs(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return Math.abs(args.car);
    }
    console.error(cannotApply('abs', args.car));

    return Cons.nil;
  }

  add(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return this.add_Number(args.car, args.cdr);
    }
    console.error(cannotApply('add', args.car));

    return Cons.nil;
  }

  add_Number(init: number, args: LispValue): LispValue {
    let result = init;
    let aCons: LispValue = args;

    while (Cons.isNotNil(aCons)) {
      const each = (aCons as Cons).car;
      if (Cons.isNumber(each)) {
        result = result + each;
      } else {
        console.error(cannotApply('add', each));
        return Cons.nil;
      }
      aCons = (aCons as Cons).cdr;
    }

    return result;
  }

  static apply(
    procedure: LispValue,
    args: LispValue,
    environment: Table,
    aStreamManager: StreamManager,
    depth: number,
  ): LispValue {
    return new Applier(environment, aStreamManager, depth).apply(procedure, args);
  }

  apply(procedure: LispValue, args: LispValue): LispValue {
    if (Cons.isSymbol(procedure)) {
      return this.selectProcedure(procedure, args);
    }
    return this.entrustEvaluator(procedure, args);
  }

  assoc(args: Cons): LispValue {
    const target = args.car;

    if (Cons.isNotCons(args.nth(2))) {
      return Cons.nil;
    }
    const aCons = args.nth(2) as Cons;

    for (const each of aCons.loop()) {
      if (Cons.isNotCons(each)) {
        console.error(cannotApply('assoc', each));
      }
      const eachCons = each as Cons;
      const key = eachCons.car;
      if (this.equal_(new Cons(target, new Cons(key, Cons.nil))) === InterpretedSymbol.of('t')) {
        return eachCons;
      }
    }

    return Cons.nil;
  }

  atom_(args: Cons): LispValue {
    if (Cons.isAtom(args.car)) {
      return InterpretedSymbol.of('t');
    }
    return Cons.nil;
  }

  binding(parameter: LispValue, args: LispValue): null {
    if (Cons.isNil(parameter)) {
      return null;
    }
    let aCons = parameter as Cons;
    let theCons = args as Cons;

    while (Cons.isNotNil(aCons)) {
      try {
        this.environment.set(aCons.car, theCons.car);
      } catch {
        console.error(SIZES_DO_NOT_MATCH);
        return null;
      }

      if (Cons.isNotCons(aCons.cdr)) {
        break;
      }
      aCons = aCons.cdr as Cons;
      theCons = theCons.cdr as Cons;
    }

    if (Cons.isNotList(aCons.cdr) && Cons.isNotNil(aCons.cdr)) {
      try {
        this.environment.set(aCons.cdr, theCons.cdr);
      } catch {
        console.error(SIZES_DO_NOT_MATCH);
        return null;
      }
    } else if (Cons.isNotNil(aCons.cdr)) {
      // Following the original: the source code references the undefined variable `aList`,
      // so it throws ReferenceError (the intended Error message is never reached).
      throw new ReferenceError('aList is not defined');
    }

    return null;
  }

  buildInFunction(procedure: InterpretedSymbol, args: LispValue): LispValue {
    if (this.isSpy(procedure)) {
      this.spyPrint(this.streamManager.spyStream(procedure), new Cons(procedure, args).toString());
      this.setDepth(this.depth + 1);
    }

    const methodName = Applier.buildInFunctions.get(procedure) as string;

    const target = this as unknown as Record<string, unknown>;
    const fn = target[methodName];
    if (typeof fn !== 'function') {
      throw new TypeError(`${this.constructor.name} does not have a method named "${methodName}"`);
    }
    const answer = (fn as (a: LispValue) => LispValue).apply(target, [args]);

    if (this.isSpy(procedure)) {
      this.setDepth(this.depth - 1);
      this.spyPrint(
        this.streamManager.spyStream(procedure),
        String(answer) + ' <== ' + new Cons(procedure, args).toString(),
      );
    }

    return answer;
  }

  car(args: Cons): LispValue {
    return (args.car as Cons).car;
  }

  cdr(args: Cons): LispValue {
    return (args.car as Cons).cdr;
  }

  character_(args: Cons): LispValue {
    if (Cons.isString(args.car) && args.car.length === 1) {
      return InterpretedSymbol.of('t');
    }
    return Cons.nil;
  }

  cons(args: Cons): LispValue {
    return new Cons(args.car, args.nth(2));
  }

  cons_(args: Cons): LispValue {
    if (Cons.isCons(args.car)) {
      return InterpretedSymbol.of('t');
    }
    return Cons.nil;
  }

  copy(args: Cons): LispValue {
    return Cons.cloneValue(args.car);
  }

  cos(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return Math.cos(args.car);
    }
    // Following the original: calls the undefined `selectPrintFunction`, so it throws ReferenceError.
    throw new ReferenceError(SELECT_PRINT_FUNCTION_NOT_DEFINED);
  }

  divide(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return this.divide_Number(args.car, args.cdr);
    }
    console.error(cannotApply('divide', args.car));

    return Cons.nil;
  }

  divide_Number(init: number, args: LispValue): LispValue {
    let result = init;
    let aCons: LispValue = args;

    while (Cons.isNotNil(aCons)) {
      const each = (aCons as Cons).car;
      if (Cons.isNumber(each)) {
        result = result / each;
      } else {
        console.error(cannotApply('divide', each));
        return Cons.nil;
      }
      aCons = (aCons as Cons).cdr;
    }

    return result;
  }

  entrustEvaluator(procedure: LispValue, args: LispValue): LispValue {
    let anObject: LispValue = Cons.nil;
    let aCons = (procedure as Cons).cdr as Cons;
    this.binding(aCons.car, args);
    aCons = aCons.cdr as Cons;

    for (const each of aCons.loop()) {
      if (each instanceof Table) {
        break;
      }
      anObject = Evaluator.eval(each, this.environment, this.streamManager, this.depth);
    }

    return anObject;
  }

  // NOTE: Implements Common Lisp's eq as JS strict identity (===). Symbols are eq because
  //       InterpretedSymbol.of interns by name; numbers / strings are eq because JS primitive
  //       equality is by value; Cons / Table / other objects are eq only when they are the same
  //       reference. Edge cases: NaN is never eq to itself (matches IEEE 754 and most CL
  //       implementations); +0 and -0 are eq (CL leaves this implementation-defined).
  eq_(args: Cons): LispValue {
    const first = args.car;
    const second = args.nth(2);
    if (first === second) {
      return InterpretedSymbol.of('t');
    }

    return Cons.nil;
  }

  equal_(args: Cons): LispValue {
    const first = args.car;
    const second = args.nth(2);
    if (this.eq_(args) === InterpretedSymbol.of('t')) {
      return InterpretedSymbol.of('t');
    }
    if (Cons.isCons(first) && Cons.isCons(second)) {
      if (first.equals(second)) {
        return InterpretedSymbol.of('t');
      }
      if (second.equals(first)) {
        return InterpretedSymbol.of('t');
      }
    }

    return Cons.nil;
  }

  exp(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return Math.exp(args.car);
    }
    // Following the original: calls the undefined `selectPrintFunction`, so it throws ReferenceError.
    throw new ReferenceError(SELECT_PRINT_FUNCTION_NOT_DEFINED);
  }

  format(args: Cons): LispValue {
    if (!Cons.isString(args.car)) {
      console.error(cannotApply('format', args.car));
    }
    const aCons = args.cdr;
    // Following the original: pass through after String() coercion even for non-strings.
    const format = this.format_AUX(String(args.car), aCons);
    process.stdout.write(String(format));

    return Cons.nil;
  }

  format_AUX(format: string, aCons: LispValue): string | undefined {
    let theCons: LispValue = aCons;
    let index = 0;
    let state = 0;
    let buffer = '';
    let token = '';

    while (index < format.length) {
      const aCharacter = format[index];
      switch (state) {
        case 0: {
          if (aCharacter === '~') {
            state = 1;
          } else {
            buffer += aCharacter;
          }

          break;
        }
        case 1: {
          switch (aCharacter) {
            case '0':
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9': {
              token += aCharacter;
              state = 2;
              break;
            }
            case 'a': {
              // Following the original: calls theCons.car.toString() directly (throws if null).
              buffer += ((theCons as Cons).car as { toString(): string }).toString();
              theCons = (theCons as Cons).cdr;
              state = 0;
              break;
            }
            case '%': {
              buffer += '\n';
              state = 0;
              break;
            }
            case '-': {
              state = 3;
              break;
            }
            default: {
              buffer += '~';
              buffer += aCharacter;
              state = 0;
            }
          }

          break;
        }
        case 2: {
          switch (aCharacter) {
            case '0':
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9': {
              token += aCharacter;
              state = 2;
              break;
            }
            case 'a': {
              const size = Number(token);
              token = '';
              if (Cons.isNil(theCons)) {
                console.error(SIZE_DO_NOT_MATCH);
                return undefined;
              }
              let value: string = ((theCons as Cons).car as { toString(): string }).toString();
              theCons = (theCons as Cons).cdr;
              while (value.length < size) {
                value += ' ';
              }
              buffer += value;
              state = 0;
              break;
            }
            default: {
              buffer += '~';
              buffer += token + aCharacter;
              token = '';
              state = 0;
            }
          }

          break;
        }
        case 3: {
          switch (aCharacter) {
            case '0':
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9': {
              token += aCharacter;
              state = 3;
              break;
            }
            case 'a': {
              const size = Number(token);
              token = '';
              if (Cons.isNil(theCons)) {
                console.error(SIZE_DO_NOT_MATCH);
                return undefined;
              }
              const value: string = ((theCons as Cons).car as { toString(): string }).toString();
              theCons = (theCons as Cons).cdr;
              let spaces = '';
              while (value.length + spaces.length < size) {
                spaces += ' ';
              }
              buffer += spaces + value;
              state = 0;
              break;
            }
            default: {
              buffer += '~';
              buffer += '-';
              buffer += token + aCharacter;
              token = '';
              state = 0;
            }
          }

          break;
        }
        default: {
          console.error('Error!');
        }
      }
      index++;
    }
    if (Cons.isNotNil(theCons)) {
      console.error(SIZE_DO_NOT_MATCH);
      return undefined;
    }

    return buffer;
  }

  // NOTE: Common Lisp's floatp is a type-tag predicate (integer vs float), but JS has only one
  //       numeric type (double). The original chose to interpret floatp as a range check
  //       "is this number representable in IEEE 32-bit (single-precision) float?" rather than a
  //       type-tag check. Following the original semantics. Revisit if numeric types are split
  //       in a future revision.
  float_(args: Cons): LispValue {
    if (Cons.isNumber(args.car) && -3.4e38 <= args.car && args.car <= 3.4e38) {
      return InterpretedSymbol.of('t');
    }
    return Cons.nil;
  }

  gensym(): InterpretedSymbol {
    const aSymbol = InterpretedSymbol.of('id' + String(Applier.#generateNumber));
    Applier.incrementGenerateNumber();

    return aSymbol;
  }

  getStream(anObject: LispValue): unknown {
    if (typeof anObject === 'string') {
      return (process as unknown as { out?: unknown }).out;
    }

    return this.streamManager.getStream();
  }

  greaterThan(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return this.greaterThan_Number(args.car, args.cdr);
    }
    console.error(cannotApply('>', args.car));

    return Cons.nil;
  }

  greaterThan_Number(init: number, args: LispValue): LispValue {
    let leftValue: number = init;
    let aCons: LispValue = args;
    let aBoolean: boolean;

    while (Cons.isNotNil(aCons)) {
      const rightValue = (aCons as Cons).car;
      if (Cons.isNumber(rightValue)) {
        aBoolean = leftValue > rightValue;
      } else {
        console.error(cannotApply('>', rightValue));
        return Cons.nil;
      }
      if (!aBoolean) {
        return Cons.nil;
      }
      leftValue = rightValue;
      aCons = (aCons as Cons).cdr;
    }

    return InterpretedSymbol.of('t');
  }

  greaterThanOrEqual(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return this.greaterThanOrEqual_Number(args.car, args.cdr);
    }
    console.error(cannotApply('>=', args.car));

    return Cons.nil;
  }

  greaterThanOrEqual_Number(init: number, args: LispValue): LispValue {
    let leftValue: number = init;
    let aCons: LispValue = args;
    let aBoolean: boolean;

    while (Cons.isNotNil(aCons)) {
      const rightValue = (aCons as Cons).car;
      if (Cons.isNumber(rightValue)) {
        aBoolean = leftValue >= rightValue;
      } else {
        console.error(cannotApply('>=', rightValue));
        return Cons.nil;
      }
      if (!aBoolean) {
        return Cons.nil;
      }
      leftValue = rightValue;
      aCons = (aCons as Cons).cdr;
    }

    return InterpretedSymbol.of('t');
  }

  static incrementGenerateNumber(): null {
    Applier.#generateNumber++;
    return null;
  }

  indent(): string {
    let index = 0;
    let aString = '';
    while (index++ < this.depth) {
      aString += '| ';
    }

    return aString;
  }

  integer_(args: Cons): LispValue {
    if (Cons.isNumber(args.car) && Number.isInteger(args.car)) {
      return InterpretedSymbol.of('t');
    }
    return Cons.nil;
  }

  isSpy(aSymbol: InterpretedSymbol): boolean {
    return this.streamManager.isSpy(aSymbol);
  }

  last(args: Cons): LispValue {
    if (Cons.isNotCons(args)) {
      return Cons.nil;
    }
    const aCons = args.car as Cons;

    return aCons.last();
  }

  lessThan(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return this.lessThan_Number(args.car, args.cdr);
    }
    console.error(cannotApply('<', args.car));

    return Cons.nil;
  }

  lessThan_Number(init: number, args: LispValue): LispValue {
    let leftValue: number = init;
    let aCons: LispValue = args;
    let aBoolean: boolean;

    while (Cons.isNotNil(aCons)) {
      const rightValue = (aCons as Cons).car;
      if (Cons.isNumber(rightValue)) {
        aBoolean = leftValue < rightValue;
      } else {
        console.error(cannotApply('<', rightValue));
        return Cons.nil;
      }
      if (!aBoolean) {
        return Cons.nil;
      }
      leftValue = rightValue;
      aCons = (aCons as Cons).cdr;
    }

    return InterpretedSymbol.of('t');
  }

  lessThanOrEqual(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return this.lessThanOrEqual_Number(args.car, args.cdr);
    }
    console.error(cannotApply('<=', args.car));

    return Cons.nil;
  }

  lessThanOrEqual_Number(init: number, args: LispValue): LispValue {
    let leftValue: number = init;
    let aCons: LispValue = args;
    let aBoolean: boolean;

    while (Cons.isNotNil(aCons)) {
      const rightValue = (aCons as Cons).car;
      if (Cons.isNumber(rightValue)) {
        aBoolean = leftValue <= rightValue;
      } else {
        console.error(cannotApply('<=', rightValue));
        return Cons.nil;
      }
      if (!aBoolean) {
        return Cons.nil;
      }
      leftValue = rightValue;
      aCons = (aCons as Cons).cdr;
    }

    return InterpretedSymbol.of('t');
  }

  list(args: LispValue): LispValue {
    if (Cons.isNil(args)) {
      return Cons.nil;
    }
    return new Cons((args as Cons).car, this.list((args as Cons).cdr));
  }

  list_(args: Cons): LispValue {
    if (Cons.isList(args.car)) {
      return InterpretedSymbol.of('t');
    }
    return Cons.nil;
  }

  mapcar(args: Cons): LispValue {
    const aCons = new Cons(Cons.nil, Cons.nil);
    const procedure = args.car;
    const parameters = args.nth(2) as Cons;
    const options = (args.cdr as Cons).cdr as Cons;
    let theCons: Cons = aCons;
    let index = 1;

    for (const each of parameters.loop()) {
      const argumentsCons = new Cons(Cons.nil, Cons.nil);
      let temporaryCons: Cons = argumentsCons;

      if (Cons.isNotNil(each)) {
        for (const arg of options.loop()) {
          if (Cons.isNotCons(arg)) {
            // Following the original: the source code uses `consol.log` (a typo), which throws
            // ReferenceError, so the subsequent `return Cons.nil` is never reached.
            throw new ReferenceError('consol is not defined');
          }
          temporaryCons.setCdr(new Cons((arg as Cons).nth(index), Cons.nil));
          temporaryCons = temporaryCons.cdr as Cons;
        }
      }

      argumentsCons.setCar(each);
      const anObject = Applier.apply(
        procedure,
        argumentsCons,
        this.environment,
        this.streamManager,
        this.depth,
      );
      theCons.setCdr(new Cons(anObject, Cons.nil));
      theCons = theCons.cdr as Cons;
      index++;
    }

    return aCons.cdr;
  }

  member(args: Cons): LispValue {
    let aSymbol = InterpretedSymbol.of('equal?');
    if (Cons.isNotNil(args.nth(3))) {
      aSymbol = args.nth(3) as InterpretedSymbol;
    }
    if (Cons.isNotCons(args.nth(2))) {
      return Cons.nil;
    }
    let aCons = args.nth(2) as Cons;

    while (Cons.isCons(aCons)) {
      let anObject: LispValue = null;

      if (aSymbol === InterpretedSymbol.of('eq?')) {
        anObject = this.eq_(new Cons(args.car, new Cons(aCons.car, Cons.nil)));
      }
      if (aSymbol === InterpretedSymbol.of('equal?')) {
        anObject = this.equal_(new Cons(args.car, new Cons(aCons.car, Cons.nil)));
      }
      if (anObject == null) {
        console.error(cannotApply('member', aSymbol));
      }
      if (anObject === InterpretedSymbol.of('t')) {
        return aCons;
      }

      aCons = aCons.cdr as Cons;
    }

    return Cons.nil;
  }

  memq(args: Cons): LispValue {
    if (this.member(args) === Cons.nil) {
      return Cons.nil;
    }
    return InterpretedSymbol.of('t');
  }

  mod(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return this.mod_Number(args.car, args.cdr);
    }
    console.error(cannotApply('mod', args.car));

    return Cons.nil;
  }

  mod_Number(init: number, args: LispValue): LispValue {
    let result = init;
    let aCons: LispValue = args;

    while (Cons.isNotNil(aCons)) {
      const each = (aCons as Cons).car;
      if (Cons.isNumber(each)) {
        result = result % each;
      } else {
        console.error(cannotApply('mod', each));
        return Cons.nil;
      }
      aCons = (aCons as Cons).cdr;
    }

    return result;
  }

  multiply(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return this.multiply_Number(args.car, args.cdr);
    }
    console.error(cannotApply('multiply', args.car));

    return Cons.nil;
  }

  multiply_Number(init: number, args: LispValue): LispValue {
    let result = init;
    let aCons: LispValue = args;

    while (Cons.isNotNil(aCons)) {
      const each = (aCons as Cons).car;
      if (Cons.isNumber(each)) {
        result = result * each;
      } else {
        console.error(cannotApply('multiply', each));
        return Cons.nil;
      }
      aCons = (aCons as Cons).cdr;
    }

    return result;
  }

  napier(): number {
    return Math.E;
  }

  neq(args: Cons): LispValue {
    if (this.eq_(args) === InterpretedSymbol.of('t')) {
      return Cons.nil;
    }
    return InterpretedSymbol.of('t');
  }

  nequal(args: Cons): LispValue {
    if (this.equal_(args) === InterpretedSymbol.of('t')) {
      return Cons.nil;
    }
    return InterpretedSymbol.of('t');
  }

  nth(args: Cons): LispValue {
    if (!Number.isInteger(args.car)) {
      return Cons.nil;
    }
    const index = args.car as number;
    const aCons = args.nth(2) as Cons;

    return aCons.nth(index);
  }

  null_(args: Cons): LispValue {
    if (Cons.isNil(args.car)) {
      return InterpretedSymbol.of('t');
    }
    return Cons.nil;
  }

  // NOTE: Lisp's numberp and doublep are originally distinct predicates, but because JS has only
  //       one numeric type (double), we share a single implementation. In Applier.setup() both
  //       Lisp function names numberp / doublep map to this method. Split into separate methods if
  //       a future revision introduces additional numeric types such as BigInt.
  number_(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return InterpretedSymbol.of('t');
    }
    return Cons.nil;
  }

  pi(): number {
    return Math.PI;
  }

  random(): number {
    return Math.random();
  }

  round(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return Math.round(args.car);
    }
    // Following the original: calls the undefined `selectPrintFunction`, so it throws ReferenceError.
    throw new ReferenceError(SELECT_PRINT_FUNCTION_NOT_DEFINED);
  }

  selectProcedure(procedure: InterpretedSymbol, args: LispValue): LispValue {
    if (Applier.buildInFunctions.has(procedure)) {
      return this.buildInFunction(procedure, args);
    }
    if (this.environment.has(procedure)) {
      return this.userFunction(procedure, args);
    }
    console.error(noProcedure(procedure));

    return Cons.nil;
  }

  setDepth(aNumber: number): null {
    this.depth = aNumber;
    return null;
  }

  static setup(): Map<InterpretedSymbol, string> {
    try {
      const entries: Array<[string, string]> = [
        ['abs', 'abs'],
        ['add', 'add'],
        ['assoc', 'assoc'],
        ['atom', 'atom_'],
        ['car', 'car'],
        ['cdr', 'cdr'],
        ['characterp', 'character_'],
        ['cons', 'cons'],
        ['consp', 'cons_'],
        ['copy', 'copy'],
        ['cos', 'cos'],
        ['floatp', 'float_'],
        ['divide', 'divide'],
        ['doublep', 'number_'],
        ['eq', 'eq_'],
        ['equal', 'equal_'],
        ['exp', 'exp'],
        ['format', 'format'],
        ['gensym', 'gensym'],
        ['integerp', 'integer_'],
        ['last', 'last'],
        ['list', 'list'],
        ['listp', 'list_'],
        ['mapcar', 'mapcar'],
        ['member', 'member'],
        ['memq', 'memq'],
        ['mod', 'mod'],
        ['multiply', 'multiply'],
        ['napier', 'napier'],
        ['neq', 'neq'],
        ['nequal', 'nequal'],
        ['nth', 'nth'],
        ['null', 'null_'],
        ['numberp', 'number_'],
        ['pi', 'pi'],
        ['random', 'random'],
        ['round', 'round'],
        ['sin', 'sin'],
        ['sqrt', 'sqrt'],
        ['subtract', 'subtract'],
        ['stringp', 'string_'],
        ['symbolp', 'symbol_'],
        ['tan', 'tan'],
        ['+', 'add'],
        ['-', 'subtract'],
        ['*', 'multiply'],
        ['/', 'divide'],
        ['//', 'mod'],
        ['==', 'eq_'],
        ['=', 'equal_'],
        ['~~', 'neq'],
        ['~=', 'nequal'],
        ['<', 'lessThan'],
        ['<=', 'lessThanOrEqual'],
        ['>', 'greaterThan'],
        ['>=', 'greaterThanOrEqual'],
      ];
      return new Map(entries.map(([key, value]) => [InterpretedSymbol.of(key), value]));
    } catch {
      throw new Error('NullPointerException (Applier, initialize)');
    }
  }

  sin(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return Math.sin(args.car);
    }
    // Following the original: calls the undefined `selectPrintFunction`, so it throws ReferenceError.
    throw new ReferenceError(SELECT_PRINT_FUNCTION_NOT_DEFINED);
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

  sqrt(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return Math.sqrt(args.car);
    }
    // Following the original: calls the undefined `selectPrintFunction`, so it throws ReferenceError.
    throw new ReferenceError(SELECT_PRINT_FUNCTION_NOT_DEFINED);
  }

  string_(args: Cons): LispValue {
    if (Cons.isString(args.car)) {
      return InterpretedSymbol.of('t');
    }
    return Cons.nil;
  }

  subtract(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return this.subtract_Number(args.car, args.cdr);
    }
    console.error(cannotApply('subtract', args.car));

    return Cons.nil;
  }

  subtract_Number(init: number, args: LispValue): LispValue {
    let result = init;
    let aCons: LispValue = args;

    while (Cons.isNotNil(aCons)) {
      const each = (aCons as Cons).car;
      if (Cons.isNumber(each)) {
        result = result - each;
      } else {
        console.error(cannotApply('subtract', each));
        return Cons.nil;
      }
      aCons = (aCons as Cons).cdr;
    }

    return result;
  }

  symbol_(args: Cons): LispValue {
    if (Cons.isSymbol(args.car)) {
      return InterpretedSymbol.of('t');
    }
    return Cons.nil;
  }

  tan(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return Math.tan(args.car);
    }
    // Following the original: calls the undefined `selectPrintFunction`, so it throws ReferenceError.
    throw new ReferenceError(SELECT_PRINT_FUNCTION_NOT_DEFINED);
  }

  userFunction(procedure: InterpretedSymbol, args: LispValue): LispValue {
    if (this.isSpy(procedure)) {
      this.spyPrint(this.streamManager.spyStream(procedure), new Cons(procedure, args).toString());
      this.setDepth(this.depth + 1);
    }

    const lambda = this.environment.get(procedure) as Cons;
    const theEnvironment = lambda.last().car as Table;
    const answer = Applier.apply(lambda, args, theEnvironment, this.streamManager, this.depth);

    if (this.isSpy(procedure)) {
      this.setDepth(this.depth - 1);
      this.spyPrint(
        this.streamManager.spyStream(procedure),
        String(answer) + ' <== ' + new Cons(procedure, args).toString(),
      );
    }

    return answer;
  }
}
