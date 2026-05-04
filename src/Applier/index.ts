'use strict';

import * as R from 'ramda';

import { Cons, type LispValue } from '../Cons/index.js';
import { Evaluator } from '../Evaluator/index.js';
import { InterpretedSymbol } from '../InterpretedSymbol/index.js';
import type { StreamManager } from '../StreamManager/index.js';
import { Table } from '../Table/index.js';

/**
 * Lispの万能関数のApplyを模倣したクラス
 * @class
 * @classdesc
 * @author Keisuke Ikeda
 * @this {Applier}
 */
export class Applier {
  static buildInFunctions: Map<InterpretedSymbol, string> = Applier.setup();
  static generateNumber = 0;

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
    console.log('Can not apply "abs" to "' + String(args.car) + '"');

    return Cons.nil;
  }

  add(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return this.add_Number(args.car, args.cdr);
    }
    console.log('Can not apply "add" to "' + String(args.car) + '"');

    return Cons.nil;
  }

  add_Number(init: number, args: LispValue): LispValue {
    let result = init;
    let aCons: LispValue = args;

    while (Cons.isNotNil(aCons)) {
      if (!Cons.isCons(aCons)) {
        break;
      }
      const each = aCons.car;
      if (Cons.isNumber(each)) {
        result = result + each;
      } else {
        console.log('Can not apply "add" to "' + String(each) + '"');
        return Cons.nil;
      }
      aCons = aCons.cdr;
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
        console.log('Can not apply "assoc" to "' + String(each) + '"');
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
        console.log('sizes do not match.');
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
        console.log('sizes do not match.');
        return null;
      }
    } else if (Cons.isNotNil(aCons.cdr)) {
      throw new Error('Can not binding value to "' + String(aCons.cdr) + '"');
    }

    return null;
  }

  buildInFunction(procedure: InterpretedSymbol, args: LispValue): LispValue {
    let answer: LispValue = Cons.nil;

    if (this.isSpy(procedure)) {
      this.spyPrint(this.streamManager.spyStream(procedure), new Cons(procedure, args).toString());
      this.setDepth(this.depth + 1);
    }

    const methodName = Applier.buildInFunctions.get(procedure) as string;

    try {
      const method = (this as unknown as Record<string, unknown>)[methodName];
      ((x: unknown) => {
        x;
      })(method);
    } catch {
      console.log('Not Found Method: ' + methodName);
    }

    answer = R.invoker(1, methodName)(args, this) as LispValue;

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
    console.log('Can not apply "cos" to "' + String(args.car) + '"');

    return Cons.nil;
  }

  divide(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return this.divide_Number(args.car, args.cdr);
    }
    console.log('Can not apply "divide" to "' + String(args.car) + '"');

    return Cons.nil;
  }

  divide_Number(init: number, args: LispValue): LispValue {
    let result = init;
    let aCons: LispValue = args;

    while (Cons.isNotNil(aCons)) {
      if (!Cons.isCons(aCons)) {
        break;
      }
      const each = aCons.car;
      if (Cons.isNumber(each)) {
        result = result / each;
      } else {
        console.log('Can not apply "divide" to "' + String(each) + '"');
        return Cons.nil;
      }
      aCons = aCons.cdr;
    }

    return result;
  }

  double_(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return InterpretedSymbol.of('t');
    }
    return Cons.nil;
  }

  entrustEvaluator(procedure: LispValue, args: LispValue): LispValue {
    let anObject: LispValue = Cons.nil;
    if (!Cons.isCons(procedure)) {
      return Cons.nil;
    }
    let aCons = procedure.cdr as Cons;
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
    console.log('Can not apply "exp" to "' + String(args.car) + '"');

    return Cons.nil;
  }

  format(args: Cons): LispValue {
    if (!Cons.isString(args.car)) {
      console.log('Can not apply "format" to "' + String(args.car) + '"');
      return Cons.nil;
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
            if (Cons.isCons(theCons)) {
              buffer += String(theCons.car);
              theCons = theCons.cdr;
            }
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
        let size: number;
        let value = '';

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
            size = Number(token);
            token = '';
            if (Cons.isNil(theCons)) {
              console.log('size do not match.');
              return undefined;
            }
            value = String((theCons as Cons).car);
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
        let size: number;
        let spaces = '';
        let value = '';

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
            size = Number(token);
            token = '';
            if (Cons.isNil(theCons)) {
              console.log('size do not match.');
              return undefined;
            }
            value = String((theCons as Cons).car);
            theCons = (theCons as Cons).cdr;
            spaces = '';
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
        console.log('Error!');
      }
      }
      index++;
    }
    if (Cons.isNotNil(theCons)) {
      console.log('size do not match.');
      return undefined;
    }

    return buffer;
  }

  float_(args: Cons): LispValue {
    if (Cons.isNumber(args.car) && -3.4e38 <= args.car && args.car <= 3.4e38) {
        return InterpretedSymbol.of('t');
      }
    return Cons.nil;
  }

  gensym(): InterpretedSymbol {
    const aSymbol = InterpretedSymbol.of('id' + String(Applier.generateNumber));
    Applier.incrementGenerateNumber();

    return aSymbol;
  }

  getStream(anObject: LispValue): unknown {
    if (this.streamManager == null) {
      return process.stdout;
    }
    if (anObject instanceof String || typeof anObject === 'string') {
      return process.stdout;
    }

    return this.streamManager.getStream();
  }

  greaterThan(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return this.greaterThan_Number(args.car, args.cdr);
    }
    console.log('Can not apply ">" to "' + String(args.car) + '"');

    return Cons.nil;
  }

  greaterThan_Number(init: number, args: LispValue): LispValue {
    let leftValue: number = init;
    let aCons: LispValue = args;
    let aBoolean = true;

    while (Cons.isNotNil(aCons)) {
      if (!Cons.isCons(aCons)) {
        break;
      }
      const rightValue = aCons.car;
      if (Cons.isNumber(rightValue)) {
        aBoolean = leftValue > rightValue;
      } else {
        console.log('Can not apply ">" to "' + String(rightValue) + '"');
        return Cons.nil;
      }
      if (!aBoolean) {
        return Cons.nil;
      }
      leftValue = rightValue;
      aCons = aCons.cdr;
    }

    return InterpretedSymbol.of('t');
  }

  greaterThanOrEqual(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return this.greaterThanOrEqual_Number(args.car, args.cdr);
    }
    console.log('Can not apply ">=" to "' + String(args.car) + '"');

    return Cons.nil;
  }

  greaterThanOrEqual_Number(init: number, args: LispValue): LispValue {
    let leftValue: number = init;
    let aCons: LispValue = args;
    let aBoolean = true;

    while (Cons.isNotNil(aCons)) {
      if (!Cons.isCons(aCons)) {
        break;
      }
      const rightValue = aCons.car;
      if (Cons.isNumber(rightValue)) {
        aBoolean = leftValue >= rightValue;
      } else {
        console.log('Can not apply ">=" to "' + String(rightValue) + '"');
        return Cons.nil;
      }
      if (!aBoolean) {
        return Cons.nil;
      }
      leftValue = rightValue;
      aCons = aCons.cdr;
    }

    return InterpretedSymbol.of('t');
  }

  static incrementGenerateNumber(): null {
    Applier.generateNumber++;
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
    console.log('Can not apply "<" to "' + String(args.car) + '"');

    return Cons.nil;
  }

  lessThan_Number(init: number, args: LispValue): LispValue {
    let leftValue: number = init;
    let aCons: LispValue = args;
    let aBoolean = true;

    while (Cons.isNotNil(aCons)) {
      if (!Cons.isCons(aCons)) {
        break;
      }
      const rightValue = aCons.car;
      if (Cons.isNumber(rightValue)) {
        aBoolean = leftValue < rightValue;
      } else {
        console.log('Can not apply "<" to "' + String(rightValue) + '"');
        return Cons.nil;
      }
      if (!aBoolean) {
        return Cons.nil;
      }
      leftValue = rightValue;
      aCons = aCons.cdr;
    }

    return InterpretedSymbol.of('t');
  }

  lessThanOrEqual(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return this.lessThanOrEqual_Number(args.car, args.cdr);
    }
    console.log('Can not apply "<=" to "' + String(args.car) + '"');

    return Cons.nil;
  }

  lessThanOrEqual_Number(init: number, args: LispValue): LispValue {
    let leftValue: number = init;
    let aCons: LispValue = args;
    let aBoolean = true;

    while (Cons.isNotNil(aCons)) {
      if (!Cons.isCons(aCons)) {
        break;
      }
      const rightValue = aCons.car;
      if (Cons.isNumber(rightValue)) {
        aBoolean = leftValue <= rightValue;
      } else {
        console.log('Can not apply "<=" to "' + String(rightValue) + '"');
        return Cons.nil;
      }
      if (!aBoolean) {
        return Cons.nil;
      }
      leftValue = rightValue;
      aCons = aCons.cdr;
    }

    return InterpretedSymbol.of('t');
  }

  list(args: LispValue): LispValue {
    if (Cons.isNil(args)) {
      return Cons.nil;
    }
    if (!Cons.isCons(args)) {
      return Cons.nil;
    }
    return new Cons(args.car, this.list(args.cdr));
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
    const parameters = args.nth(2);
    const options = (args.cdr as Cons).cdr as Cons;
    let theCons: Cons = aCons;
    let index = 1;

    if (!Cons.isCons(parameters)) {
      return Cons.nil;
    }

    for (const each of parameters.loop()) {
      const argumentsCons = new Cons(Cons.nil, Cons.nil);
      let temporaryCons: Cons = argumentsCons;

      if (Cons.isNotNil(each)) {
        for (const arg of options.loop()) {
          if (Cons.isNotCons(arg)) {
            console.log('sizes do not match.');
            return Cons.nil;
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
        console.log('Can not apply "member" to "' + String(aSymbol) + '"');
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
    console.log('Can not apply "mod" to "' + String(args.car) + '"');

    return Cons.nil;
  }

  mod_Number(init: number, args: LispValue): LispValue {
    let result = init;
    let aCons: LispValue = args;

    while (Cons.isNotNil(aCons)) {
      if (!Cons.isCons(aCons)) {
        break;
      }
      const each = aCons.car;
      if (Cons.isNumber(each)) {
        result = result % each;
      } else {
        console.log('Can not apply "mod" to "' + String(each) + '"');
        return Cons.nil;
      }
      aCons = aCons.cdr;
    }

    return result;
  }

  multiply(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return this.multiply_Number(args.car, args.cdr);
    }
    console.log('Can not apply "multiply" to "' + String(args.car) + '"');

    return Cons.nil;
  }

  multiply_Number(init: number, args: LispValue): LispValue {
    let result = init;
    let aCons: LispValue = args;

    while (Cons.isNotNil(aCons)) {
      if (!Cons.isCons(aCons)) {
        break;
      }
      const each = aCons.car;
      if (Cons.isNumber(each)) {
        result = result * each;
      } else {
        console.log('Can not apply "multiply" to "' + String(each) + '"');
        return Cons.nil;
      }
      aCons = aCons.cdr;
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
    const aCons = args.nth(2);

    if (!Cons.isCons(aCons)) {
      return Cons.nil;
    }
    return aCons.nth(index);
  }

  null_(args: Cons): LispValue {
    if (Cons.isNil(args.car)) {
      return InterpretedSymbol.of('t');
    }
    return Cons.nil;
  }

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
    console.log('Can not apply "round" to "' + String(args.car) + '"');

    return Cons.nil;
  }

  selectProcedure(procedure: InterpretedSymbol, args: LispValue): LispValue {
    if (Applier.buildInFunctions.has(procedure)) {
      return this.buildInFunction(procedure, args);
    }
    if (this.environment.has(procedure)) {
      return this.userFunction(procedure, args);
    }
    console.log('I could find no procedure description for ' + String(procedure));

    return Cons.nil;
  }

  setDepth(aNumber: number): null {
    this.depth = aNumber;
    return null;
  }

  static setup(): Map<InterpretedSymbol, string> {
    try {
      const aTable = new Map<InterpretedSymbol, string>();
      aTable.set(InterpretedSymbol.of('abs'), 'abs');
      aTable.set(InterpretedSymbol.of('add'), 'add');
      aTable.set(InterpretedSymbol.of('assoc'), 'assoc');
      aTable.set(InterpretedSymbol.of('atom'), 'atom_');
      aTable.set(InterpretedSymbol.of('car'), 'car');
      aTable.set(InterpretedSymbol.of('cdr'), 'cdr');
      aTable.set(InterpretedSymbol.of('characterp'), 'character_');
      aTable.set(InterpretedSymbol.of('cons'), 'cons');
      aTable.set(InterpretedSymbol.of('consp'), 'cons_');
      aTable.set(InterpretedSymbol.of('copy'), 'copy');
      aTable.set(InterpretedSymbol.of('cos'), 'cos');
      aTable.set(InterpretedSymbol.of('floatp'), 'float_');
      aTable.set(InterpretedSymbol.of('divide'), 'divide');
      aTable.set(InterpretedSymbol.of('doublep'), 'double_');
      aTable.set(InterpretedSymbol.of('eq'), 'eq_');
      aTable.set(InterpretedSymbol.of('equal'), 'equal_');
      aTable.set(InterpretedSymbol.of('exp'), 'exp');
      aTable.set(InterpretedSymbol.of('format'), 'format');
      aTable.set(InterpretedSymbol.of('gensym'), 'gensym');
      aTable.set(InterpretedSymbol.of('integerp'), 'integer_');
      aTable.set(InterpretedSymbol.of('last'), 'last');
      aTable.set(InterpretedSymbol.of('list'), 'list');
      aTable.set(InterpretedSymbol.of('listp'), 'list_');
      aTable.set(InterpretedSymbol.of('mapcar'), 'mapcar');
      aTable.set(InterpretedSymbol.of('member'), 'member');
      aTable.set(InterpretedSymbol.of('memq'), 'memq');
      aTable.set(InterpretedSymbol.of('mod'), 'mod');
      aTable.set(InterpretedSymbol.of('multiply'), 'multiply');
      aTable.set(InterpretedSymbol.of('napier'), 'napier');
      aTable.set(InterpretedSymbol.of('neq'), 'neq');
      aTable.set(InterpretedSymbol.of('nequal'), 'nequal');
      aTable.set(InterpretedSymbol.of('nth'), 'nth');
      aTable.set(InterpretedSymbol.of('null'), 'null_');
      aTable.set(InterpretedSymbol.of('numberp'), 'number_');
      aTable.set(InterpretedSymbol.of('pi'), 'pi');
      aTable.set(InterpretedSymbol.of('random'), 'random');
      aTable.set(InterpretedSymbol.of('round'), 'round');
      aTable.set(InterpretedSymbol.of('sin'), 'sin');
      aTable.set(InterpretedSymbol.of('sqrt'), 'sqrt');
      aTable.set(InterpretedSymbol.of('subtract'), 'subtract');
      aTable.set(InterpretedSymbol.of('stringp'), 'string_');
      aTable.set(InterpretedSymbol.of('symbolp'), 'symbol_');
      aTable.set(InterpretedSymbol.of('tan'), 'tan');
      aTable.set(InterpretedSymbol.of('+'), 'add');
      aTable.set(InterpretedSymbol.of('-'), 'subtract');
      aTable.set(InterpretedSymbol.of('*'), 'multiply');
      aTable.set(InterpretedSymbol.of('/'), 'divide');
      aTable.set(InterpretedSymbol.of('//'), 'mod');
      aTable.set(InterpretedSymbol.of('=='), 'eq_');
      aTable.set(InterpretedSymbol.of('='), 'equal_');
      aTable.set(InterpretedSymbol.of('~~'), 'neq');
      aTable.set(InterpretedSymbol.of('~='), 'nequal');
      aTable.set(InterpretedSymbol.of('<'), 'lessThan');
      aTable.set(InterpretedSymbol.of('<='), 'lessThanOrEqual');
      aTable.set(InterpretedSymbol.of('>'), 'greaterThan');
      aTable.set(InterpretedSymbol.of('>='), 'greaterThanOrEqual');

      return aTable;
    } catch {
      throw new Error('NullPointerException (Applier, initialize)');
    }
  }

  sin(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return Math.sin(args.car);
    }
    console.log('Can not apply "sin" to "' + String(args.car) + '"');

    return Cons.nil;
  }

  spyPrint(aStream: unknown, line: string): null {
    const aPrintStream = process.stdout;
    if (aStream != null) {
      console.log(aStream);
    }
    console.log(this.indent() + line);
    if (aStream != null) {
      console.log(aPrintStream);
    }
    return null;
  }

  sqrt(args: Cons): LispValue {
    if (Cons.isNumber(args.car)) {
      return Math.sqrt(args.car);
    }
    console.log('Can not apply "sqrt" to "' + String(args.car) + '"');

    return Cons.nil;
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
    console.log('Can not apply "subtract" to "' + String(args.car) + '"');

    return Cons.nil;
  }

  subtract_Number(init: number, args: LispValue): LispValue {
    let result = init;
    let aCons: LispValue = args;

    while (Cons.isNotNil(aCons)) {
      if (!Cons.isCons(aCons)) {
        break;
      }
      const each = aCons.car;
      if (Cons.isNumber(each)) {
        result = result - each;
      } else {
        console.log('Can not apply "subtract" to "' + String(each) + '"');
        return Cons.nil;
      }
      aCons = aCons.cdr;
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
    console.log('Can not apply "tan" to "' + String(args.car) + '"');

    return Cons.nil;
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
