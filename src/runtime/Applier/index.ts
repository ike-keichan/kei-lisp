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
import type { KeiLispPlugin } from '../../plugin/types.js';
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
export class Applier extends Object {
  /**
   * Dispatch map from a Lisp function name (InterpretedSymbol) to the name of the Applier method that implements it.
   */
  static readonly buildInFunctions: Map<InterpretedSymbol, string> = Applier.setup();
  static #generateNumber = 0;

  /**
   * The environment (variable bindings) used while applying procedures.
   */
  environment: Table;
  /**
   * The stream manager used for I/O and spy output.
   */
  streamManager: StreamManager;
  /**
   * The current recursion depth, used for spy indentation.
   */
  depth: number;
  /**
   * Registered plugins forwarded back into Evaluator on recursive evaluation (e.g. `entrustEvaluator`).
   */
  plugins: KeiLispPlugin[];

  /**
   * Constructor.
   * @constructor
   * @param aTable the parent environment to extend
   * @param aStreamManager the stream manager for I/O
   * @param aNumber the initial recursion depth
   * @param plugins the plugin chain to forward when re-entering the Evaluator
   */
  constructor(
    aTable: Table,
    aStreamManager: StreamManager,
    aNumber: number,
    plugins: KeiLispPlugin[] = [],
  ) {
    super();
    this.environment = new Table(aTable);
    this.streamManager = aStreamManager;
    this.depth = aNumber;
    this.plugins = plugins;
  }

  /**
   * Implementation of the Lisp `abs` function. Returns the absolute value of the given number.
   * @param args the argument Cons containing the target number
   * @return the absolute value
   */
  abs(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return Math.abs(args.car);
    }
    throw new EvalError(cannotApply('abs', args.car));

    return Cons.nil;
  }

  /**
   * Implementation of the Lisp `+` / `add` function. Returns the sum of the given numbers.
   * @param args the argument Cons containing the numbers to add
   * @return the sum of the arguments
   */
  add(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return this.add_Number(args.car, args.cdr);
    }
    throw new EvalError(cannotApply('add', args.car));

    return Cons.nil;
  }

  /**
   * Helper that accumulates the sum starting from an initial number and the remaining argument list.
   * @param init the initial number
   * @param args the remaining numbers to add
   * @return the sum of init and all remaining numbers
   */
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

  /**
   * Static entry point that instantiates an Applier and applies the given procedure to the arguments.
   * @param procedure the procedure to apply (a symbol or a lambda Cons)
   * @param args the argument list
   * @param environment the environment to use
   * @param aStreamManager the stream manager for I/O
   * @param depth the current recursion depth
   * @param plugins the plugin chain to forward when re-entering the Evaluator
   * @return the result of applying the procedure
   */
  static override apply(
    procedure: LispValue,
    args: LispValue,
    environment: Table,
    aStreamManager: StreamManager,
    depth: number,
    plugins: KeiLispPlugin[] = [],
  ): LispValue {
    return new Applier(environment, aStreamManager, depth, plugins).apply(procedure, args);
  }

  /**
   * Applies the given procedure to the given arguments.
   * @param procedure the procedure to apply (a symbol or a lambda Cons)
   * @param args the argument list
   * @return the result of applying the procedure
   */
  apply(procedure: LispValue, args: LispValue): LispValue {
    if (Cons.isSymbol(procedure)) {
      return this.selectProcedure(procedure, args);
    }
    return this.entrustEvaluator(procedure, args);
  }

  /**
   * Implementation of the Lisp `assoc` function. Looks up an association in an association list.
   * @param args the argument Cons containing the key and the association list
   * @return the matching pair, or nil if no match was found
   */
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

  /**
   * Implementation of the Lisp `atom` predicate. Returns t if the argument is an atom, otherwise nil.
   * @param args the argument Cons containing the value to test
   * @return t if atom, nil otherwise
   */
  atom_(args: Cons): LispValue {
    if (Cons.isAtom(args.car)) {
      return InterpretedSymbol.of('t');
    }
    return Cons.nil;
  }

  /**
   * Binds the given parameter symbols to the corresponding argument values in this environment.
   * @param parameter the parameter list (a Cons of symbols, possibly dotted)
   * @param args the argument list to bind to the parameters
   */
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

  /**
   * Invokes the built-in method associated with the given procedure symbol.
   * @param procedure the symbol naming the built-in function
   * @param args the argument list
   * @return the result of the built-in function
   */
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

  /**
   * Implementation of the Lisp `car` function. Returns the car of the given Cons.
   * @param args the argument Cons containing the target Cons
   * @return the car of the target
   */
  car(args: Cons): LispValue {
    return (args.car as Cons).car;
  }

  /**
   * Implementation of the Lisp `cdr` function. Returns the cdr of the given Cons.
   * @param args the argument Cons containing the target Cons
   * @return the cdr of the target
   */
  cdr(args: Cons): LispValue {
    return (args.car as Cons).cdr;
  }

  /**
   * Implementation of the Lisp `characterp` predicate. Returns t if the argument is a single-character string.
   * @param args the argument Cons containing the value to test
   * @return t if a character, nil otherwise
   */
  character_(args: Cons): LispValue {
    if (Cons.isString(args.car) && args.car.length === 1) {
      return InterpretedSymbol.of('t');
    }
    return Cons.nil;
  }

  /**
   * Implementation of the Lisp `cons` function. Constructs a new Cons from the given car and cdr.
   * @param args the argument Cons containing the car and cdr
   * @return the newly constructed Cons
   */
  cons(args: Cons): LispValue {
    return new Cons(args.car, args.nth(2));
  }

  /**
   * Implementation of the Lisp `consp` predicate. Returns t if the argument is a Cons, otherwise nil.
   * @param args the argument Cons containing the value to test
   * @return t if a Cons, nil otherwise
   */
  cons_(args: Cons): LispValue {
    if (Cons.isCons(args.car)) {
      return InterpretedSymbol.of('t');
    }
    return Cons.nil;
  }

  /**
   * Implementation of the Lisp `copy` function. Returns a deep clone of the given value.
   * @param args the argument Cons containing the value to copy
   * @return the cloned value
   */
  copy(args: Cons): LispValue {
    return Cons.cloneValue(args.car);
  }

  /**
   * Implementation of the Lisp `cos` function. Returns the cosine of the given number.
   * @param args the argument Cons containing the angle in radians
   * @return the cosine of the argument
   */
  cos(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return Math.cos(args.car);
    }
    // Following the original: calls the undefined `selectPrintFunction`, so it throws ReferenceError.
    throw new ReferenceError(SELECT_PRINT_FUNCTION_NOT_DEFINED);
  }

  /**
   * Implementation of the Lisp `/` / `divide` function. Returns the quotient of the given numbers.
   * @param args the argument Cons containing the numbers to divide
   * @return the quotient of the arguments
   */
  divide(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return this.divide_Number(args.car, args.cdr);
    }
    throw new EvalError(cannotApply('divide', args.car));

    return Cons.nil;
  }

  /**
   * Helper that accumulates the quotient starting from an initial number and the remaining argument list.
   * @param init the initial number (numerator)
   * @param args the remaining numbers to divide by
   * @return the quotient of init divided by all remaining numbers
   */
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

  /**
   * Delegates evaluation of a lambda body to the Evaluator after binding its parameters.
   * @param procedure the lambda Cons to apply
   * @param args the argument list to bind to the lambda's parameters
   * @return the result of evaluating the lambda body
   */
  entrustEvaluator(procedure: LispValue, args: LispValue): LispValue {
    let anObject: LispValue = Cons.nil;
    let aCons = (procedure as Cons).cdr as Cons;
    this.binding(aCons.car, args);
    aCons = aCons.cdr as Cons;

    for (const each of aCons.loop()) {
      if (each instanceof Table) {
        break;
      }
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

  // NOTE: Implements Common Lisp's eq as JS strict identity (===). Symbols are eq because
  //       InterpretedSymbol.of interns by name; numbers / strings are eq because JS primitive
  //       equality is by value; Cons / Table / other objects are eq only when they are the same
  //       reference. Edge cases: NaN is never eq to itself (matches IEEE 754 and most CL
  //       implementations); +0 and -0 are eq (CL leaves this implementation-defined).
  /**
   * Implementation of the Lisp `eq` predicate. Returns t when both arguments are identical (JS `===`).
   * @param args the argument Cons containing the two values to compare
   * @return t when identical, nil otherwise
   */
  eq_(args: Cons): LispValue {
    const first = args.car;
    const second = args.nth(2);
    if (first === second) {
      return InterpretedSymbol.of('t');
    }

    return Cons.nil;
  }

  /**
   * Implementation of the Lisp `equal` / `=` predicate. Returns t when both arguments are structurally equal.
   * @param args the argument Cons containing the two values to compare
   * @return t when equal, nil otherwise
   */
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

  /**
   * Implementation of the Lisp `exp` function. Returns e raised to the given power.
   * @param args the argument Cons containing the exponent
   * @return e raised to the given power
   */
  exp(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return Math.exp(args.car);
    }
    // Following the original: calls the undefined `selectPrintFunction`, so it throws ReferenceError.
    throw new ReferenceError(SELECT_PRINT_FUNCTION_NOT_DEFINED);
  }

  /**
   * Implementation of the Lisp `format` function. Writes a formatted string to standard output.
   * @param args the argument Cons containing the format string followed by its arguments
   * @return nil
   */
  format(args: Cons): LispValue {
    if (!Cons.isString(args.car)) {
      throw new EvalError(cannotApply('format', args.car));
    }
    const aCons = args.cdr;
    const format = this.format_AUX(args.car, aCons);
    process.stdout.write(String(format));

    return Cons.nil;
  }

  /**
   * Helper that expands the given format string with the supplied arguments.
   * @param format the format string containing directives such as `~a`, `~%`, and width specifiers
   * @param aCons the argument list to interpolate into the directives
   * @return the formatted string
   */
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
  /**
   * Implementation of the Lisp `floatp` predicate. Returns t if the argument is a number representable as IEEE 32-bit float.
   * @param args the argument Cons containing the value to test
   * @return t if a float, nil otherwise
   */
  float_(args: Cons): LispValue {
    if (Cons.isNumber(args.car) && -3.4e38 <= args.car && args.car <= 3.4e38) {
      return InterpretedSymbol.of('t');
    }
    return Cons.nil;
  }

  /**
   * Implementation of the Lisp `gensym` function. Generates a fresh, unique symbol.
   * @return a new, unique InterpretedSymbol
   */
  gensym(): InterpretedSymbol {
    const aSymbol = InterpretedSymbol.of('id' + String(Applier.#generateNumber));
    Applier.incrementGenerateNumber();

    return aSymbol;
  }

  /**
   * Returns the appropriate stream for the given object.
   * @param anObject the object used to select the stream
   * @return the selected stream
   */
  getStream(anObject: LispValue): unknown {
    if (typeof anObject === 'string') {
      return (process as unknown as { out?: unknown }).out;
    }

    return this.streamManager.getStream();
  }

  /**
   * Implementation of the Lisp `>` / `greaterThan` predicate. Returns t when arguments are in strictly decreasing order.
   * @param args the argument Cons containing the numbers to compare
   * @return t when each is greater than the next, nil otherwise
   */
  greaterThan(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return this.greaterThan_Number(args.car, args.cdr);
    }
    throw new EvalError(cannotApply('>', args.car));

    return Cons.nil;
  }

  /**
   * Helper that checks `>` ordering starting from an initial number against the remaining argument list.
   * @param init the initial number on the left side of the first comparison
   * @param args the remaining numbers to compare against
   * @return t when strictly decreasing, nil otherwise
   */
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

  /**
   * Implementation of the Lisp `>=` / `greaterThanOrEqual` predicate. Returns t when arguments are in non-increasing order.
   * @param args the argument Cons containing the numbers to compare
   * @return t when each is greater than or equal to the next, nil otherwise
   */
  greaterThanOrEqual(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return this.greaterThanOrEqual_Number(args.car, args.cdr);
    }
    throw new EvalError(cannotApply('>=', args.car));

    return Cons.nil;
  }

  /**
   * Helper that checks `>=` ordering starting from an initial number against the remaining argument list.
   * @param init the initial number on the left side of the first comparison
   * @param args the remaining numbers to compare against
   * @return t when non-increasing, nil otherwise
   */
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

  /**
   * Increments the internal counter used by `gensym` to ensure uniqueness.
   */
  static incrementGenerateNumber(): null {
    Applier.#generateNumber++;
    return null;
  }

  /**
   * Returns a string of indentation used as a prefix for spy output, based on the current depth.
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
   * Implementation of the Lisp `integerp` predicate. Returns t if the argument is an integer.
   * @param args the argument Cons containing the value to test
   * @return t if an integer, nil otherwise
   */
  integer_(args: Cons): LispValue {
    if (Cons.isNumber(args.car) && Number.isInteger(args.car)) {
      return InterpretedSymbol.of('t');
    }
    return Cons.nil;
  }

  /**
   * Implementation of the Lisp `evenp` predicate. Returns t if the argument is an even integer.
   * @param args the argument Cons containing the value to test
   * @return t if even, nil otherwise
   */
  even_(args: Cons): LispValue {
    if (Cons.isNumber(args.car) && Number.isInteger(args.car) && args.car % 2 === 0) {
      return InterpretedSymbol.of('t');
    }
    return Cons.nil;
  }

  /**
   * Implementation of the Lisp `oddp` predicate. Returns t if the argument is an odd integer.
   * @param args the argument Cons containing the value to test
   * @return t if odd, nil otherwise
   */
  odd_(args: Cons): LispValue {
    if (Cons.isNumber(args.car) && Number.isInteger(args.car) && args.car % 2 !== 0) {
      return InterpretedSymbol.of('t');
    }
    return Cons.nil;
  }

  /**
   * Implementation of the Lisp `zerop` predicate. Returns t if the argument equals zero.
   * @param args the argument Cons containing the value to test
   * @return t if zero, nil otherwise
   */
  zero_(args: Cons): LispValue {
    if (Cons.isNumber(args.car) && args.car === 0) {
      return InterpretedSymbol.of('t');
    }
    return Cons.nil;
  }

  /**
   * Implementation of the Lisp `plusp` predicate. Returns t if the argument is strictly positive.
   * @param args the argument Cons containing the value to test
   * @return t if positive, nil otherwise
   */
  plus_(args: Cons): LispValue {
    if (Cons.isNumber(args.car) && args.car > 0) {
      return InterpretedSymbol.of('t');
    }
    return Cons.nil;
  }

  /**
   * Implementation of the Lisp `minusp` predicate. Returns t if the argument is strictly negative.
   * @param args the argument Cons containing the value to test
   * @return t if negative, nil otherwise
   */
  minus_(args: Cons): LispValue {
    if (Cons.isNumber(args.car) && args.car < 0) {
      return InterpretedSymbol.of('t');
    }
    return Cons.nil;
  }

  /**
   * Implementation of the Lisp `1+` function. Returns the argument incremented by one.
   * @param args the argument Cons containing the target number
   * @return the argument plus one
   */
  oneplus(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return args.car + 1;
    }
    throw new EvalError(cannotApply('1+', args.car));
  }

  /**
   * Implementation of the Lisp `1-` function. Returns the argument decremented by one.
   * @param args the argument Cons containing the target number
   * @return the argument minus one
   */
  oneminus(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return args.car - 1;
    }
    throw new EvalError(cannotApply('1-', args.car));
  }

  /**
   * Implementation of the Lisp `expt` function. Returns the base raised to the exponent.
   * @param args the argument Cons containing the base followed by the exponent
   * @return base raised to the exponent
   */
  expt(args: Cons): LispValue {
    const base = args.car;
    const exponent = args.nth(2);
    if (Cons.isNumber(base) && Cons.isNumber(exponent)) {
      return Math.pow(base, exponent);
    }
    throw new EvalError(cannotApply('expt', base));
  }

  /**
   * Implementation of the Lisp `truncate` function. Returns the integer part of the given number.
   * @param args the argument Cons containing the target number
   * @return the truncated integer
   */
  truncate(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return Math.trunc(args.car);
    }
    throw new EvalError(cannotApply('truncate', args.car));
  }

  /**
   * Implementation of the Lisp `floor` function. Returns the largest integer not greater than the given number.
   * @param args the argument Cons containing the target number
   * @return the floor of the argument
   */
  floor(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return Math.floor(args.car);
    }
    throw new EvalError(cannotApply('floor', args.car));
  }

  /**
   * Implementation of the Lisp `ceiling` function. Returns the smallest integer not less than the given number.
   * @param args the argument Cons containing the target number
   * @return the ceiling of the argument
   */
  ceiling(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return Math.ceil(args.car);
    }
    throw new EvalError(cannotApply('ceiling', args.car));
  }

  /**
   * Implementation of the Lisp `min` function. Returns the minimum of the given numbers.
   * @param args the argument Cons containing the numbers to compare
   * @return the smallest number
   */
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

  /**
   * Implementation of the Lisp `max` function. Returns the maximum of the given numbers.
   * @param args the argument Cons containing the numbers to compare
   * @return the largest number
   */
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

  /**
   * Implementation of the Lisp `length` function. Returns the length of a list or string.
   * @param args the argument Cons containing the target sequence
   * @return the length of the sequence
   */
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

  /**
   * Implementation of the Lisp `string-upcase` function. Returns the upper-cased form of the given string.
   * @param args the argument Cons containing the target string
   * @return the upper-cased string
   */
  stringUpcase(args: Cons): LispValue {
    if (Cons.isString(args.car)) {
      return args.car.toUpperCase();
    }
    throw new EvalError(cannotApply('string-upcase', args.car));
  }

  /**
   * Implementation of the Lisp `string-downcase` function. Returns the lower-cased form of the given string.
   * @param args the argument Cons containing the target string
   * @return the lower-cased string
   */
  stringDowncase(args: Cons): LispValue {
    if (Cons.isString(args.car)) {
      return args.car.toLowerCase();
    }
    throw new EvalError(cannotApply('string-downcase', args.car));
  }

  /**
   * Implementation of the Lisp `string-trim` function. Returns the given string with surrounding whitespace removed.
   * @param args the argument Cons containing the target string
   * @return the trimmed string
   */
  stringTrim(args: Cons): LispValue {
    if (Cons.isString(args.car)) {
      return args.car.trim();
    }
    throw new EvalError(cannotApply('string-trim', args.car));
  }

  /**
   * Implementation of the Lisp `substring` function. Returns a portion of the given string between start and end (in code points).
   * @param args the argument Cons containing the target string, start index, and optional end index
   * @return the requested substring
   */
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

  /**
   * Implementation of the Lisp `concatenate` function. Returns the concatenation of all the given strings.
   * @param args the argument Cons containing the strings to concatenate
   * @return the concatenated string
   */
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

  /**
   * Implementation of the Lisp `elt` function. Returns the element at the given index of a string or list.
   * @param args the argument Cons containing the target sequence and the index
   * @return the element at the given index
   */
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

  /**
   * Implementation of the Lisp `subseq` function. Returns a subsequence of a string or list between start and end.
   * @param args the argument Cons containing the target sequence, start index, and optional end index
   * @return the requested subsequence
   */
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

  /**
   * Implementation of the Lisp `count` function. Counts the occurrences of an item within a string or list.
   * @param args the argument Cons containing the item and the target sequence
   * @return the number of occurrences
   */
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

  /**
   * Implementation of the Lisp `reduce` function. Combines the elements of a list using a binary procedure.
   * @param args the argument Cons containing the procedure, the list, and an optional initial value
   * @return the result of folding the procedure over the list
   */
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

  /**
   * Implementation of the Lisp `every` function. Returns t when the predicate holds for every element of the list.
   * @param args the argument Cons containing the predicate and the list
   * @return t when the predicate holds for every element, nil otherwise
   */
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

  /**
   * Implementation of the Lisp `some` function. Returns the first non-nil predicate result, or nil if all are nil.
   * @param args the argument Cons containing the predicate and the list
   * @return the first non-nil result, or nil
   */
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

  /**
   * Implementation of the Lisp `find` function. Returns the first element of the list that matches the given item.
   * @param args the argument Cons containing the item and the list
   * @return the matching element, or nil if none found
   */
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

  /**
   * Implementation of the Lisp `mapcan` function. Applies the procedure to each element and concatenates the resulting lists.
   * @param args the argument Cons containing the procedure and the list
   * @return the concatenation of the per-element results
   */
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

  /**
   * Implementation of the Lisp `sort` function. Returns a new list sorted by the given comparison predicate.
   * @param args the argument Cons containing the list and the comparison predicate
   * @return the sorted list
   */
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

  /**
   * Returns whether the given symbol is currently being spied on.
   * @param aSymbol the symbol to check
   * @return true if spied on, false otherwise
   */
  isSpy(aSymbol: InterpretedSymbol): boolean {
    return this.streamManager.isSpy(aSymbol);
  }

  /**
   * Implementation of the Lisp `last` function. Returns the last cell of the given list.
   * @param args the argument Cons containing the target list
   * @return the last cell of the list
   */
  last(args: Cons): LispValue {
    if (Cons.isNotCons(args)) {
      return Cons.nil;
    }
    const aCons = args.car as Cons;

    return aCons.last();
  }

  /**
   * Implementation of the Lisp `<` / `lessThan` predicate. Returns t when arguments are in strictly increasing order.
   * @param args the argument Cons containing the numbers to compare
   * @return t when each is less than the next, nil otherwise
   */
  lessThan(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return this.lessThan_Number(args.car, args.cdr);
    }
    throw new EvalError(cannotApply('<', args.car));

    return Cons.nil;
  }

  /**
   * Helper that checks `<` ordering starting from an initial number against the remaining argument list.
   * @param init the initial number on the left side of the first comparison
   * @param args the remaining numbers to compare against
   * @return t when strictly increasing, nil otherwise
   */
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

  /**
   * Implementation of the Lisp `<=` / `lessThanOrEqual` predicate. Returns t when arguments are in non-decreasing order.
   * @param args the argument Cons containing the numbers to compare
   * @return t when each is less than or equal to the next, nil otherwise
   */
  lessThanOrEqual(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return this.lessThanOrEqual_Number(args.car, args.cdr);
    }
    throw new EvalError(cannotApply('<=', args.car));

    return Cons.nil;
  }

  /**
   * Helper that checks `<=` ordering starting from an initial number against the remaining argument list.
   * @param init the initial number on the left side of the first comparison
   * @param args the remaining numbers to compare against
   * @return t when non-decreasing, nil otherwise
   */
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

  /**
   * Implementation of the Lisp `list` function. Returns a list of the given arguments.
   * @param args the argument list
   * @return a Cons list of the arguments
   */
  list(args: LispValue): LispValue {
    if (Cons.isNil(args)) {
      return Cons.nil;
    }
    return new Cons((args as Cons).car, this.list((args as Cons).cdr));
  }

  /**
   * Implementation of the Lisp `listp` predicate. Returns t if the argument is a list (Cons or nil).
   * @param args the argument Cons containing the value to test
   * @return t if a list, nil otherwise
   */
  list_(args: Cons): LispValue {
    if (Cons.isList(args.car)) {
      return InterpretedSymbol.of('t');
    }
    return Cons.nil;
  }

  /**
   * Implementation of the Lisp `mapcar` function. Applies the procedure to each tuple of corresponding elements.
   * @param args the argument Cons containing the procedure followed by one or more lists
   * @return the list of results
   */
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

  /**
   * Implementation of the Lisp `member` function. Returns the sublist whose car matches the given item.
   * @param args the argument Cons containing the item, the list, and an optional comparator symbol
   * @return the matching sublist, or nil if not found
   */
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

  /**
   * Implementation of the Lisp `memq` predicate. Returns t when `member` finds a match, nil otherwise.
   * @param args the argument Cons forwarded to `member`
   * @return t when found, nil otherwise
   */
  memq(args: Cons): LispValue {
    if (this.member(args) === Cons.nil) {
      return Cons.nil;
    }
    return InterpretedSymbol.of('t');
  }

  /**
   * Implementation of the Lisp `mod` / `//` function. Returns the remainder of dividing the arguments in sequence.
   * @param args the argument Cons containing the numbers
   * @return the modulo result
   */
  mod(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return this.mod_Number(args.car, args.cdr);
    }
    throw new EvalError(cannotApply('mod', args.car));

    return Cons.nil;
  }

  /**
   * Helper that accumulates the modulo starting from an initial number and the remaining argument list.
   * @param init the initial number
   * @param args the remaining numbers to mod by
   * @return the remainder after taking modulo with each of the remaining numbers
   */
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

  /**
   * Implementation of the Lisp `*` / `multiply` function. Returns the product of the given numbers.
   * @param args the argument Cons containing the numbers to multiply
   * @return the product of the arguments
   */
  multiply(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return this.multiply_Number(args.car, args.cdr);
    }
    throw new EvalError(cannotApply('multiply', args.car));

    return Cons.nil;
  }

  /**
   * Helper that accumulates the product starting from an initial number and the remaining argument list.
   * @param init the initial number
   * @param args the remaining numbers to multiply
   * @return the product of init and all remaining numbers
   */
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

  /**
   * Implementation of the Lisp `napier` function. Returns Napier's constant (e).
   * @return Math.E
   */
  napier(): number {
    return Math.E;
  }

  /**
   * Implementation of the Lisp `neq` / `~~` predicate. The negation of `eq`.
   * @param args the argument Cons forwarded to `eq_`
   * @return nil when eq, t otherwise
   */
  neq(args: Cons): LispValue {
    if (this.eq_(args) === InterpretedSymbol.of('t')) {
      return Cons.nil;
    }
    return InterpretedSymbol.of('t');
  }

  /**
   * Implementation of the Lisp `nequal` / `~=` predicate. The negation of `equal`.
   * @param args the argument Cons forwarded to `equal_`
   * @return nil when equal, t otherwise
   */
  nequal(args: Cons): LispValue {
    if (this.equal_(args) === InterpretedSymbol.of('t')) {
      return Cons.nil;
    }
    return InterpretedSymbol.of('t');
  }

  /**
   * Implementation of the Lisp `nth` function. Returns the nth element of a list.
   * @param args the argument Cons containing the index and the list
   * @return the element at the given index
   */
  nth(args: Cons): LispValue {
    if (!Number.isInteger(args.car)) {
      return Cons.nil;
    }
    const index = args.car as number;
    const aCons = args.nth(2) as Cons;

    return aCons.nth(index);
  }

  /**
   * Implementation of the Lisp `null` predicate. Returns t if the argument is nil, otherwise nil.
   * @param args the argument Cons containing the value to test
   * @return t if nil, nil otherwise
   */
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
  /**
   * Implementation of the Lisp `numberp` / `doublep` predicate. Returns t if the argument is a number.
   * @param args the argument Cons containing the value to test
   * @return t if a number, nil otherwise
   */
  number_(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return InterpretedSymbol.of('t');
    }
    return Cons.nil;
  }

  /**
   * Implementation of the Lisp `pi` function. Returns the mathematical constant pi.
   * @return Math.PI
   */
  pi(): number {
    return Math.PI;
  }

  /**
   * Implementation of the Lisp `random` function. Returns a pseudo-random number in [0, 1).
   * @return a random number in [0, 1)
   */
  random(): number {
    return Math.random();
  }

  /**
   * Implementation of the Lisp `round` function. Returns the given number rounded to the nearest integer.
   * @param args the argument Cons containing the target number
   * @return the rounded integer
   */
  round(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return Math.round(args.car);
    }
    // Following the original: calls the undefined `selectPrintFunction`, so it throws ReferenceError.
    throw new ReferenceError(SELECT_PRINT_FUNCTION_NOT_DEFINED);
  }

  /**
   * Dispatches the call to either a built-in function or a user-defined function based on the symbol.
   * @param procedure the symbol naming the function
   * @param args the argument list
   * @return the result of the dispatched function
   */
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

  /**
   * Sets the current recursion depth.
   * @param aNumber the new depth value
   */
  setDepth(aNumber: number): null {
    this.depth = aNumber;
    return null;
  }

  /**
   * Builds and returns the Lisp-name to method-name dispatch map.
   * @return a Map associating each Lisp function name (as an InterpretedSymbol) with the corresponding Applier method name
   */
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
        ['1+', 'oneplus'],
        ['1-', 'oneminus'],
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

  /**
   * Implementation of the Lisp `sin` function. Returns the sine of the given number.
   * @param args the argument Cons containing the angle in radians
   * @return the sine of the argument
   */
  sin(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return Math.sin(args.car);
    }
    // Following the original: calls the undefined `selectPrintFunction`, so it throws ReferenceError.
    throw new ReferenceError(SELECT_PRINT_FUNCTION_NOT_DEFINED);
  }

  /**
   * Writes a single line of spy output (with indentation) to the given stream.
   * @param aStream the stream to write to, or null/string to fall back to process.stdout
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
   * Implementation of the Lisp `sqrt` function. Returns the square root of the given number.
   * @param args the argument Cons containing the target number
   * @return the square root of the argument
   */
  sqrt(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return Math.sqrt(args.car);
    }
    // Following the original: calls the undefined `selectPrintFunction`, so it throws ReferenceError.
    throw new ReferenceError(SELECT_PRINT_FUNCTION_NOT_DEFINED);
  }

  /**
   * Implementation of the Lisp `stringp` predicate. Returns t if the argument is a string.
   * @param args the argument Cons containing the value to test
   * @return t if a string, nil otherwise
   */
  string_(args: Cons): LispValue {
    if (Cons.isString(args.car)) {
      return InterpretedSymbol.of('t');
    }
    return Cons.nil;
  }

  /**
   * Implementation of the Lisp `-` / `subtract` function. Returns the difference of the given numbers.
   * @param args the argument Cons containing the numbers to subtract
   * @return the difference of the arguments
   */
  subtract(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return this.subtract_Number(args.car, args.cdr);
    }
    throw new EvalError(cannotApply('subtract', args.car));

    return Cons.nil;
  }

  /**
   * Helper that accumulates the difference starting from an initial number and the remaining argument list.
   * @param init the initial number
   * @param args the remaining numbers to subtract
   * @return init with all remaining numbers subtracted
   */
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

  /**
   * Implementation of the Lisp `symbolp` predicate. Returns t if the argument is an interpreted symbol.
   * @param args the argument Cons containing the value to test
   * @return t if a symbol, nil otherwise
   */
  symbol_(args: Cons): LispValue {
    if (Cons.isSymbol(args.car)) {
      return InterpretedSymbol.of('t');
    }
    return Cons.nil;
  }

  /**
   * Implementation of the Lisp `tan` function. Returns the tangent of the given number.
   * @param args the argument Cons containing the angle in radians
   * @return the tangent of the argument
   */
  tan(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return Math.tan(args.car);
    }
    // Following the original: calls the undefined `selectPrintFunction`, so it throws ReferenceError.
    throw new ReferenceError(SELECT_PRINT_FUNCTION_NOT_DEFINED);
  }

  /**
   * Invokes a user-defined function (lambda) bound in the environment under the given symbol.
   * @param procedure the symbol naming the user function
   * @param args the argument list
   * @return the result of evaluating the user function
   */
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
