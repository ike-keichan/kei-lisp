import { Cons } from '../../value/Cons/index.js';
import { EvalError } from '../../errors/EvalError/index.js';
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

// Splits a string into an array of Unicode code points. Intentional choice over
// .length / charAt, which would split surrogate pairs (emoji etc.) into halves.
// eslint-disable-next-line @typescript-eslint/no-misused-spread
const toCodePoints = (s: string): string[] => [...s];

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
    throw new EvalError(cannotApply('abs', args.car));

    return Cons.nil;
  }

  add(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return this.add_Number(args.car, args.cdr);
    }
    throw new EvalError(cannotApply('add', args.car));

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
        throw new EvalError(cannotApply('add', each));
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
        throw new EvalError(cannotApply('assoc', each));
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
        throw new EvalError(SIZES_DO_NOT_MATCH);
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
        throw new EvalError(SIZES_DO_NOT_MATCH);
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
    throw new EvalError(cannotApply('divide', args.car));

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
        throw new EvalError(cannotApply('divide', each));
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
      throw new EvalError(cannotApply('format', args.car));
    }
    const aCons = args.cdr;
    const format = this.format_AUX(args.car, aCons);
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
                throw new EvalError(SIZE_DO_NOT_MATCH);
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
                throw new EvalError(SIZE_DO_NOT_MATCH);
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
          throw new EvalError(`unknown format directive: ~${aCharacter}`);
        }
      }
      index++;
    }
    if (Cons.isNotNil(theCons)) {
      throw new EvalError(SIZE_DO_NOT_MATCH);
      return undefined;
    }

    return buffer;
  }

  // Common Lisp's floatp is a type-tag predicate (integer vs float), but JS has only one
  // numeric type (double). Approximated here as a range check: "is this number representable
  // in IEEE 32-bit (single-precision) float?". Revisit if numeric types are split.
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
    throw new EvalError(cannotApply('>', args.car));

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
        throw new EvalError(cannotApply('>', rightValue));
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
    throw new EvalError(cannotApply('>=', args.car));

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
        throw new EvalError(cannotApply('>=', rightValue));
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

  even_(args: Cons): LispValue {
    if (Cons.isNumber(args.car) && Number.isInteger(args.car) && args.car % 2 === 0) {
      return InterpretedSymbol.of('t');
    }
    return Cons.nil;
  }

  odd_(args: Cons): LispValue {
    if (Cons.isNumber(args.car) && Number.isInteger(args.car) && args.car % 2 !== 0) {
      return InterpretedSymbol.of('t');
    }
    return Cons.nil;
  }

  zero_(args: Cons): LispValue {
    if (Cons.isNumber(args.car) && args.car === 0) {
      return InterpretedSymbol.of('t');
    }
    return Cons.nil;
  }

  plus_(args: Cons): LispValue {
    if (Cons.isNumber(args.car) && args.car > 0) {
      return InterpretedSymbol.of('t');
    }
    return Cons.nil;
  }

  minus_(args: Cons): LispValue {
    if (Cons.isNumber(args.car) && args.car < 0) {
      return InterpretedSymbol.of('t');
    }
    return Cons.nil;
  }

  expt(args: Cons): LispValue {
    const base = args.car;
    const exponent = args.nth(2);
    if (Cons.isNumber(base) && Cons.isNumber(exponent)) {
      return Math.pow(base, exponent);
    }
    throw new EvalError(cannotApply('expt', base));
  }

  truncate(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return Math.trunc(args.car);
    }
    throw new EvalError(cannotApply('truncate', args.car));
  }

  floor(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return Math.floor(args.car);
    }
    throw new EvalError(cannotApply('floor', args.car));
  }

  ceiling(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return Math.ceil(args.car);
    }
    throw new EvalError(cannotApply('ceiling', args.car));
  }

  min(args: Cons): LispValue {
    const values: number[] = [];
    for (const each of args.loop()) {
      if (!Cons.isNumber(each)) {
        throw new EvalError(cannotApply('min', each));
      }
      values.push(each);
    }
    if (values.length === 0) {
      throw new EvalError('min requires at least one argument');
    }
    return Math.min(...values);
  }

  max(args: Cons): LispValue {
    const values: number[] = [];
    for (const each of args.loop()) {
      if (!Cons.isNumber(each)) {
        throw new EvalError(cannotApply('max', each));
      }
      values.push(each);
    }
    if (values.length === 0) {
      throw new EvalError('max requires at least one argument');
    }
    return Math.max(...values);
  }

  length(args: Cons): LispValue {
    const target = args.car;
    if (Cons.isString(target)) {
      return toCodePoints(target).length;
    }
    if (Cons.isCons(target)) {
      return target.length();
    }
    if (Cons.isNil(target)) {
      return 0;
    }
    throw new EvalError(cannotApply('length', target));
  }

  stringUpcase(args: Cons): LispValue {
    if (Cons.isString(args.car)) {
      return args.car.toUpperCase();
    }
    throw new EvalError(cannotApply('string-upcase', args.car));
  }

  stringDowncase(args: Cons): LispValue {
    if (Cons.isString(args.car)) {
      return args.car.toLowerCase();
    }
    throw new EvalError(cannotApply('string-downcase', args.car));
  }

  stringTrim(args: Cons): LispValue {
    if (Cons.isString(args.car)) {
      return args.car.trim();
    }
    throw new EvalError(cannotApply('string-trim', args.car));
  }

  substring(args: Cons): LispValue {
    const target = args.car;
    const start = args.nth(2);
    const end = args.nth(3);
    if (!Cons.isString(target)) {
      throw new EvalError(cannotApply('substring', target));
    }
    if (!Cons.isNumber(start)) {
      throw new EvalError(cannotApply('substring', start));
    }
    const chars = toCodePoints(target);
    if (Cons.isNil(end)) {
      return chars.slice(start).join('');
    }
    if (!Cons.isNumber(end)) {
      throw new EvalError(cannotApply('substring', end));
    }
    return chars.slice(start, end).join('');
  }

  concatenate(args: Cons): LispValue {
    let result = '';
    for (const each of args.loop()) {
      if (!Cons.isString(each)) {
        throw new EvalError(cannotApply('concatenate', each));
      }
      result += each;
    }
    return result;
  }

  elt(args: Cons): LispValue {
    const target = args.car;
    const index = args.nth(2);
    if (!Cons.isNumber(index)) {
      throw new EvalError(cannotApply('elt', index));
    }
    if (Cons.isString(target)) {
      const chars = toCodePoints(target);
      if (index < 0 || index >= chars.length) {
        throw new EvalError(`elt: index ${String(index)} out of range`);
      }
      return chars[index];
    }
    if (Cons.isCons(target)) {
      if (index < 0 || index >= target.length()) {
        throw new EvalError(`elt: index ${String(index)} out of range`);
      }
      return target.nth(index + 1);
    }
    throw new EvalError(cannotApply('elt', target));
  }

  subseq(args: Cons): LispValue {
    const target = args.car;
    const start = args.nth(2);
    const end = args.nth(3);
    if (!Cons.isNumber(start)) {
      throw new EvalError(cannotApply('subseq', start));
    }
    if (Cons.isString(target)) {
      const chars = toCodePoints(target);
      if (Cons.isNil(end)) {
        return chars.slice(start).join('');
      }
      if (!Cons.isNumber(end)) {
        throw new EvalError(cannotApply('subseq', end));
      }
      return chars.slice(start, end).join('');
    }
    if (Cons.isCons(target)) {
      const stop = Cons.isNil(end) ? target.length() : (end as number);
      if (!Cons.isNumber(stop)) {
        throw new EvalError(cannotApply('subseq', end));
      }
      let result: Cons = Cons.nil;
      for (let i = stop - 1; i >= start; i--) {
        result = new Cons(target.nth(i + 1), result);
      }
      return result;
    }
    throw new EvalError(cannotApply('subseq', target));
  }

  count(args: Cons): LispValue {
    const item = args.car;
    const target = args.nth(2);
    let n = 0;
    if (Cons.isString(target)) {
      if (!Cons.isString(item) || item.length !== 1) {
        return 0;
      }
      for (const ch of target) {
        if (ch === item) n++;
      }
      return n;
    }
    if (Cons.isCons(target) || Cons.isNil(target)) {
      const list = Cons.isNil(target) ? Cons.nil : target;
      if (Cons.isCons(list)) {
        for (const each of list.loop()) {
          if (each === item) n++;
        }
      }
      return n;
    }
    throw new EvalError(cannotApply('count', target));
  }

  reduce(args: Cons): LispValue {
    const procedure = args.car;
    const list = args.nth(2);
    const hasInit = args.length() >= 3;
    const init = args.nth(3);

    if (Cons.isNil(list)) {
      if (hasInit) return init;
      // CL semantics: (reduce fn '()) calls fn with no args
      return Applier.apply(procedure, Cons.nil, this.environment, this.streamManager, this.depth);
    }
    if (!Cons.isCons(list)) {
      throw new EvalError(cannotApply('reduce', list));
    }

    const iter = list.loop();
    let acc: LispValue;
    if (hasInit) {
      acc = init;
    } else {
      if (!iter.hasNext()) {
        return Applier.apply(procedure, Cons.nil, this.environment, this.streamManager, this.depth);
      }
      acc = iter.next();
    }
    while (iter.hasNext()) {
      const next = iter.next();
      acc = Applier.apply(
        procedure,
        new Cons(acc, new Cons(next, Cons.nil)),
        this.environment,
        this.streamManager,
        this.depth,
      );
    }
    return acc;
  }

  every(args: Cons): LispValue {
    const procedure = args.car;
    const list = args.nth(2);

    if (Cons.isNil(list)) {
      return InterpretedSymbol.of('t');
    }
    if (!Cons.isCons(list)) {
      throw new EvalError(cannotApply('every', list));
    }
    for (const each of list.loop()) {
      const result = Applier.apply(
        procedure,
        new Cons(each, Cons.nil),
        this.environment,
        this.streamManager,
        this.depth,
      );
      if (Cons.isNil(result)) {
        return Cons.nil;
      }
    }
    return InterpretedSymbol.of('t');
  }

  some(args: Cons): LispValue {
    const procedure = args.car;
    const list = args.nth(2);

    if (Cons.isNil(list)) {
      return Cons.nil;
    }
    if (!Cons.isCons(list)) {
      throw new EvalError(cannotApply('some', list));
    }
    for (const each of list.loop()) {
      const result = Applier.apply(
        procedure,
        new Cons(each, Cons.nil),
        this.environment,
        this.streamManager,
        this.depth,
      );
      if (Cons.isNotNil(result)) {
        return result;
      }
    }
    return Cons.nil;
  }

  find(args: Cons): LispValue {
    const item = args.car;
    const list = args.nth(2);

    if (Cons.isNil(list)) return Cons.nil;
    if (!Cons.isCons(list)) {
      throw new EvalError(cannotApply('find', list));
    }
    for (const each of list.loop()) {
      // Use eq_ (identity) for matching, mirroring CL's default :test #'eql semantics.
      if (this.eq_(new Cons(item, new Cons(each, Cons.nil))) === InterpretedSymbol.of('t')) {
        return each;
      }
    }
    return Cons.nil;
  }

  mapcan(args: Cons): LispValue {
    const procedure = args.car;
    const list = args.nth(2);

    if (Cons.isNil(list)) return Cons.nil;
    if (!Cons.isCons(list)) {
      throw new EvalError(cannotApply('mapcan', list));
    }

    const collected: LispValue[] = [];
    for (const each of list.loop()) {
      const part = Applier.apply(
        procedure,
        new Cons(each, Cons.nil),
        this.environment,
        this.streamManager,
        this.depth,
      );
      if (Cons.isCons(part)) {
        for (const x of part.loop()) {
          collected.push(x);
        }
      }
      // nil and non-cons results contribute nothing (matches CL nconc-of-nil)
    }
    let result: Cons = Cons.nil;
    for (let i = collected.length - 1; i >= 0; i--) {
      result = new Cons(collected[i], result);
    }
    return result;
  }

  sort(args: Cons): LispValue {
    const list = args.car;
    const procedure = args.nth(2);

    if (Cons.isNil(list)) return Cons.nil;
    if (!Cons.isCons(list)) {
      throw new EvalError(cannotApply('sort', list));
    }

    const items: LispValue[] = [];
    for (const each of list.loop()) {
      items.push(each);
    }
    items.sort((a, b) => {
      const result = Applier.apply(
        procedure,
        new Cons(a, new Cons(b, Cons.nil)),
        this.environment,
        this.streamManager,
        this.depth,
      );
      // CL: predicate returns truthy when a should come before b.
      return Cons.isNil(result) ? 1 : -1;
    });
    let result: Cons = Cons.nil;
    for (let i = items.length - 1; i >= 0; i--) {
      result = new Cons(items[i], result);
    }
    return result;
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
    throw new EvalError(cannotApply('<', args.car));

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
        throw new EvalError(cannotApply('<', rightValue));
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
    throw new EvalError(cannotApply('<=', args.car));

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
        throw new EvalError(cannotApply('<=', rightValue));
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
        throw new EvalError(cannotApply('member', aSymbol));
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
    throw new EvalError(cannotApply('mod', args.car));

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
        throw new EvalError(cannotApply('mod', each));
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
    throw new EvalError(cannotApply('multiply', args.car));

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
        throw new EvalError(cannotApply('multiply', each));
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
    throw new EvalError(noProcedure(procedure));

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
        ['ceiling', 'ceiling'],
        ['cos', 'cos'],
        ['floatp', 'float_'],
        ['floor', 'floor'],
        ['divide', 'divide'],
        ['doublep', 'number_'],
        ['eq', 'eq_'],
        ['equal', 'equal_'],
        ['evenp', 'even_'],
        ['every', 'every'],
        ['exp', 'exp'],
        ['expt', 'expt'],
        ['find', 'find'],
        ['format', 'format'],
        ['gensym', 'gensym'],
        ['integerp', 'integer_'],
        ['concatenate', 'concatenate'],
        ['count', 'count'],
        ['elt', 'elt'],
        ['last', 'last'],
        ['length', 'length'],
        ['list', 'list'],
        ['listp', 'list_'],
        ['mapcan', 'mapcan'],
        ['mapcar', 'mapcar'],
        ['max', 'max'],
        ['member', 'member'],
        ['memq', 'memq'],
        ['min', 'min'],
        ['minusp', 'minus_'],
        ['mod', 'mod'],
        ['multiply', 'multiply'],
        ['napier', 'napier'],
        ['neq', 'neq'],
        ['nequal', 'nequal'],
        ['nth', 'nth'],
        ['null', 'null_'],
        ['numberp', 'number_'],
        ['oddp', 'odd_'],
        ['pi', 'pi'],
        ['plusp', 'plus_'],
        ['random', 'random'],
        ['reduce', 'reduce'],
        ['round', 'round'],
        ['sin', 'sin'],
        ['some', 'some'],
        ['sort', 'sort'],
        ['sqrt', 'sqrt'],
        ['string-downcase', 'stringDowncase'],
        ['string-trim', 'stringTrim'],
        ['string-upcase', 'stringUpcase'],
        ['stringp', 'string_'],
        ['subseq', 'subseq'],
        ['substring', 'substring'],
        ['subtract', 'subtract'],
        ['symbolp', 'symbol_'],
        ['tan', 'tan'],
        ['truncate', 'truncate'],
        ['zerop', 'zero_'],
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
    throw new EvalError(cannotApply('subtract', args.car));

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
        throw new EvalError(cannotApply('subtract', each));
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
