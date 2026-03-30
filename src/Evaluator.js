// #!/usr/bin/env node

'use strict';

// ライブラリ「Ramda」を読み込む。
import * as R from 'ramda';

// モジュール「Applier」を読み込む。
import { Applier } from './Applier.js';

// モジュール「Cons」を読み込む。
import { Cons } from './Cons.js';

//モジュール「InterpretedSymbol」を読み込む。
import { InterpretedSymbol } from './InterpretedSymbol';

// モジュール「StreamManager」を読み込む。
import { StreamManager } from './StreamManager.js';

// モジュール「Table」を読み込む。
import { Table } from './Table.js';

/**
 * @class
 * @classdesc Lispの万能関数のEvaluateを模倣したクラス
 * @author Keisuke Ikeda
 * @this {Evaluator}
 */
export class Evaluator extends Object {
  /**
   * Lispの関数とJSの関数を紐づけるテーブル
   */
  static buildInFunctions = Evaluator.setup();

  /**
   * コンストラクタメソッド
   * @constructor
   * @param {Table} aTable 環境のテーブル（予約語）
   * @param {StreamManager} aStreamManager
   * @param {Number} aNumber 呼び出しの深さ
   * @return {Evaluator} 自身
   */
  constructor(aTable, aStreamManager, aNumber) {
    super();
    this.environment = aTable;
    this.streamManager = aStreamManager;
    this.depth = aNumber;

    return this;
  }

  /**
   * 引数を評価し、その論理積を応答するメソッド
   * @param {Cons} aCons 評価するCons
   * @return {*} 評価結果
   */
  and(aCons) {
    for (let each of aCons.loop()) {
      let anObject = Evaluator.eval(each, this.environment, this.streamManager, this.depth);
      if (Cons.isNil(anObject)) {
        return Cons.nil;
      }
    }

    return InterpretedSymbol.of('t');
  }

  /**
   * 第2引数のリストに対して、第1引数の関数で評価し、応答するメソッド
   * @param {Cons} aCons 評価するCons
   * @return {*} 評価結果
   */
  apply_lisp(aCons) {
    let procedure = Evaluator.eval(aCons.car, this.environment, this.streamManager, this.depth);
    let args = Evaluator.eval(aCons.nth(2), this.environment, this.streamManager, this.depth);
    let aTable = this.environment;
    if (procedure instanceof Cons && procedure.last().car instanceof Table) {
      aTable = procedure.last().car;
    }

    return Applier.apply(procedure, args, aTable, this.streamManager, this.depth);
  }

  /**
   * インタプリテッドシンボルが何重に束縛されているか応答するメソッド
   * @param {Cons} aCons 評価するCons
   * @return {*} 評価結果
   */
  bind(aCons) {
    if (Cons.isNotSymbol(aCons.car)) {
      console.log('Can not apply \"bind\" to \"' + aCons.car + '\"');
      return Cons.nil;
    }
    let aSymbol = aCons.car;
    if (!this.environment.has(aSymbol)) {
      return Cons.nil;
    }

    return this.bindAUX(aSymbol);
  }

  /**
   * bindの補助メソッド
   * @param {InterpretedSymbol} aSymbol 対象のシンボル
   * @return {Number} 束縛されている数
   */
  bindAUX(aSymbol) {
    let aTable = this.environment;
    let anObject = aTable.get(aSymbol);
    let count = 1;

    while (aTable != null) {
      if (!aTable.has(aSymbol)) {
        break;
      }
      let theObject = aTable.get(aSymbol);
      if (theObject != anObject) {
        count++;
        anObject = theObject;
      }
      aTable = aTable.source;
    }

    return count;
  }

  /**
   * 指定された環境に、パラメータを逐次評価し設定する、let*とdo*の補助メソッド
   * @param {Cons} parameters 評価するCons
   * @param {Table} aTable 指定した環境
   * @param {Null} 何も返さない。
   */
  binding(parameters, aTable) {
    for (let each of parameters.loop()) {
      let theCons = each;
      let key = null;
      if (Cons.isSymbol(theCons.car)) {
        key = theCons.car;
      } else {
        console.log('\"' + theCons.car + '\" is not symbol');
      }
      let value = Evaluator.eval(theCons.nth(2), aTable, this.streamManager, this.depth);
      aTable.set(key, value);
    }

    return null;
  }

  /**
   * 指定された環境に、パラメータを並列評価し設定する、letとdoの補助メソッド
   * @param {Cons} parameters 評価するCons
   * @param {Table} aTable 指定した環境
   * @param {Null} 何も返さない。
   */
  bindingParallel(parameters, aTable) {
    let theTable = new Map();
    for (let each of parameters.loop()) {
      let theCons = each;
      let key = null;
      if (Cons.isSymbol(theCons.car)) {
        key = theCons.car;
      } else {
        console.log('\"' + theCons.car + '\" is not symbol');
      }
      let value = Evaluator.eval(theCons.nth(2), aTable, this.streamManager, this.depth);
      theTable.set(key, value);
    }

    for (let [key, value] of theTable) {
      aTable.set(key, value);
    }

    return null;
  }

  /**
   * 最初の式の結果によって、処理を振り分け、式を評価していくメソッド
   * @param {Cons} aCons 評価するCons
   * @return {*} 評価結果
   */
  cond(aCons) {
    if (Cons.isNil(aCons)) {
      return Cons.nil;
    }
    let clause = aCons.car;
    let anObject = Evaluator.eval(clause.car, this.environment, this.streamManager, this.depth);
    if (Cons.isNil(anObject)) {
      return this.cond(aCons.cdr);
    } else {
      let consequent = clause.cdr;
      for (let each of consequent.loop()) {
        anObject = Evaluator.eval(each, this.environment, this.streamManager, this.depth);
      }
      return anObject;
    }
  }

  /**
   * 第1引数を関数名、第2引数を関数の引数、第3引数を式とする関数を定義するメソッド
   * @param {Cons} aCons 評価するCons
   * @return {*} 評価結果
   */
  defun(aCons) {
    let variable = aCons.car;
    let lambda = aCons.cdr;
    if (aCons.length() == 2) {
      lambda = lambda.car;
    } else {
      lambda = new Cons(InterpretedSymbol.of('lambda'), lambda);
    }
    lambda = Evaluator.eval(lambda, new Table(this.environment), this.streamManager, this.depth);
    this.environment.set(variable, lambda);

    return variable;
  }

  /**
   * 条件が成立するまで繰り返し引数の評価を並列に行うメソッド
   * @param {Cons} aCons 評価するCons
   * @return {*} 評価結果
   */
  do_(aCons) {
    let parameters = aCons.car;
    let bool = aCons.nth(2);
    let expressions = aCons.cdr.cdr;
    this.bindingParallel(parameters, this.environment);
    if (Cons.isNil(bool)) {
      bool.setCar(Cons.nil);
    }

    while (Cons.isNil(Evaluator.eval(bool.car, this.environment, this.streamManager, this.depth))) {
      let theTable = new Map();
      let value;
      for (let each of expressions.loop()) {
        Evaluator.eval(each, this.environment, this.streamManager, this.depth);
      }
      for (let each of parameters.loop()) {
        let theCons = each;
        if (Cons.isNotSymbol(theCons.car)) {
          console.log('\"' + theCons.car + '\" is not symbol');
        }
        let key = theCons.car;
        if (Cons.isNotNil(theCons.nth(3))) {
          value = Evaluator.eval(theCons.nth(3), this.environment, this.streamManager, this.depth);
          theTable.set(key, value);
        }
      }
      for (let [key, value] of theTable) {
        this.environment.set(key, value);
      }
    }
    return Evaluator.eval(bool.nth(2), this.environment, this.streamManager, this.depth);
  }

  /**
   * リストの各要素に対して繰り返し引数の評価を順番に行うメソッド
   * @param {Cons} aCons 評価するCons
   * @return {*} 評価結果
   */
  doList(aCons) {
    let parameter = aCons.car;
    let theCons = aCons.cdr;
    let args = Evaluator.eval(parameter.nth(2), this.environment, this.streamManager, this.depth);
    for (let element of args.loop()) {
      this.environment.set(parameter.car, element);
      for (let each of theCons.loop()) {
        Evaluator.eval(each, this.environment, this.streamManager, this.depth);
      }
    }

    return Evaluator.eval(parameter.nth(3), this.environment, this.streamManager, this.depth);
  }

  /**
   * 条件が成立するまで繰り返し引数の評価を順番に行うメソッド
   * @param {Cons} aCons 評価するCons
   * @return {*} 評価結果
   */
  doStar(aCons) {
    let parameters = aCons.car;
    let bool = aCons.nth(2);
    let expressions = aCons.cdr.cdr;
    this.binding(parameters, this.environment);
    if (Cons.isNil(bool)) {
      bool.setCar(Cons.nil);
    }

    while (Cons.isNil(Evaluator.eval(bool.car, this.environment, this.streamManager, this.depth))) {
      for (let each of expressions.loop()) {
        Evaluator.eval(each, this.environment, this.streamManager, this.depth);
      }
      for (let each of parameters.loop()) {
        let theCons = each;
        if (Cons.isNotSymbol(theCons.car)) {
          console.log('\"' + theCons.car + '\" is not symbol');
        }
        let key = theCons.car;
        let value;
        if (Cons.isNotNil(theCons.nth(3))) {
          value = Evaluator.eval(theCons.nth(3), this.environment, this.streamManager, this.depth);
          this.environment.set(key, value);
        }
      }
    }
    return Evaluator.eval(bool.nth(2), this.environment, this.streamManager, this.depth);
  }

  /**
   * EvaluatorでできないことをApplierに任せ、結果を応答するメソッド
   * @param {*} form 評価するCons、又はスペシャルフォーム
   * @return {*} 計算結果
   */
  entrustApplier(form) {
    let aCons = form.cdr;
    let args = new Cons(Cons.nil, Cons.nil);
    let procedure = form.car;
    let aSymbol = null;

    if (Cons.isSymbol(procedure)) {
      aSymbol = procedure;
    }
    if (this.isSpy(aSymbol)) {
      this.spyPrint(this.streamManager.spyStream(aSymbol), form.toString());
      this.setDepth(this.depth + 1);
    }

    for (let each of aCons.loop()) {
      if (each instanceof Table) {
        break;
      }
      args.add(Evaluator.eval(each, this.environment, this.streamManager, this.depth));
    }
    if (this.isSpy(aSymbol)) {
      this.setDepth(this.depth - 1);
    }

    args = args.cdr;
    let anObject = Applier.apply(procedure, args, this.environment, this.streamManager, this.depth);
    return anObject;
  }

  /**
   * Evaluatorを実行するメソッド
   * @param {*} form 評価するCons、又はスペシャルフォーム
   * @param {Table} environment 環境のテーブル（予約語）
   * @param {StreamManager} aStreamManager
   * @param {Number} depth 呼び出しの深さ
   * @return {*} 計算結果
   */
  static eval(form, environment, aStreamManager = new StreamManager(), depth = 1) {
    return new Evaluator(environment, aStreamManager, depth).eval(form);
  }

  /**
   * Evaluatorを実行するメソッド
   * @param {*} form 評価するCons、又はスペシャルフォーム
   * @return {*} 計算結果
   */
  eval(form) {
    if (Cons.isSymbol(form)) {
      return this.evaluateSymbol(form);
    }
    if (Cons.isNil(form) || Cons.isNotList(form)) {
      return form;
    }
    if (Cons.isSymbol(form.car) && Evaluator.buildInFunctions.has(form.car)) {
      return this.specialForm(form);
    }

    return this.entrustApplier(form);
  }

  /**
   * Evaluatorを実行するメソッド
   * @param {Cons} aCons 評価するCons
   * @return {*} 評価結果
   */
  eval_lisp(aCons) {
    return Evaluator.eval(
      Evaluator.eval(aCons.car, this.environment, this.streamManager, this.depth),
      this.environment,
      this.streamManager,
      this.depth,
    );
  }

  /**
   * インタプリテッドインタプリテッドシンボルを評価して応答するメソッド
   * @param {InterpretedSymbol} aSymbol インタプリテッドシンボル
   * @return {InterpretedSymbol} 評価したインタプリテッドシンボル
   */
  evaluateSymbol(aSymbol) {
    let answer = Cons.nil;
    if (aSymbol != null && this.environment.has(aSymbol)) {
      if (this.isSpy(aSymbol)) {
        this.spyPrint(this.streamManager.spyStream(aSymbol), aSymbol.toString());
        this.setDepth(this.depth + 1);
      }

      answer = this.environment.get(aSymbol);
      if (answer instanceof Cons && answer.cdr instanceof Table) {
        answer = answer.car;
      }

      if (this.isSpy(aSymbol)) {
        this.setDepth(this.depth - 1);
        this.spyPrint(this.streamManager.spyStream(aSymbol), answer + ' <== ' + aSymbol);
      }
    } else {
      console.log('I could find no variable binding for ' + aSymbol);
    }

    return answer;
  }

  /**
   * 処理系を終了するメソッド
   */
  exit() {
    console.log('Bye!');
    process.exit(0);
  }

  /**
   * ガベージコレクタを実行するメソッド
   * @return {InterpretedSymbol} インタプリテッドシンボルt
   */
  gc() {
    const gc = require('expose-gc/function');
    gc();
    return InterpretedSymbol.of('t');
  }

  /**
   * 最初の式が成り立つ時、後ろの式を評価していくメソッド
   * @param {Cons} aCons 評価するCons
   * @return {*} 評価結果
   */
  if_(aCons) {
    let anObject = Cons.nil;
    let bool = Evaluator.eval(aCons.car, this.environment, this.streamManager, this.depth);
    if (Cons.isNil(bool)) {
      anObject = aCons.nth(3);
    } else {
      anObject = aCons.nth(2);
    }

    return Evaluator.eval(anObject, this.environment, this.streamManager, this.depth);
  }

  /**
   * 深さ分のインデント文字列を応答するメソッド
   * @return {String} インデント文字列
   */
  indent() {
    let index = 0;
    let aString = new String();
    aString += '';
    while (index++ < this.depth) {
      aString += '| ';
    }

    return aString;
  }

  /**
   * スパイする必要があるかどうかを判別し、応答するメソッド
   * @param {InterpretedSymbol} aSymbol
   * @return {Boolean} 真偽値
   */
  isSpy(aSymbol) {
    if (aSymbol == null) {
      return false;
    }
    return this.streamManager.isSpy(aSymbol);
  }

  /**
   * 第1引数をラムダ式の引数、第2引数を式とするラムダ式を生成するメソッド
   * @param {Cons} args 引数
   * @return {*} 評価結果
   */
  lambda(args) {
    let aCons = Cons.cloneValue(args);
    let theCons = aCons.cdr;
    theCons.setCdr(new Cons(this.environment, Cons.nil));

    return new Cons(InterpretedSymbol.of('lambda'), aCons);
  }

  /**
   * 明示的に新しい環境を構築するメソッド
   * 引数の評価は順番に行う。
   * @param {Cons} aCons 評価するCons
   * @return {*} 評価結果
   */
  let(aCons) {
    let aTable = new Table(this.environment);
    let parameters = aCons.car;
    let forms = aCons.cdr;
    let anObject = Cons.nil;
    this.bindingParallel(parameters, aTable);
    for (let each of forms.loop()) {
      anObject = Evaluator.eval(each, aTable, this.streamManager, this.depth);
    }

    return anObject;
  }

  /**
   * 明示的に新しい環境を構築するメソッド
   * 引数の評価は並列に行う。
   * @param {Cons} aCons 評価するCons
   * @return {*} 評価結果
   */
  letStar(aCons) {
    let aTable = new Table(this.environment);
    let parameters = aCons.car;
    let forms = aCons.cdr;
    let anObject = Cons.nil;
    this.binding(parameters, aTable);
    for (let each of forms.loop()) {
      anObject = Evaluator.eval(each, aTable, this.streamManager, this.depth);
    }

    return anObject;
  }

  /**
   * 引数を評価し、その論理否定を応答するメソッド
   * @param {Cons} aCons 評価するCons
   * @return {*} 評価結果
   */
  not(aCons) {
    if (Cons.isNil(Evaluator.eval(aCons.car, this.environment, this.streamManager, this.depth))) {
      return InterpretedSymbol.of('t');
    }
    return Cons.nil;
  }

  /**
   * トレースしないように設定するメソッド
   * @return {InterpretedSymbol} インタプリテッドシンボルt
   */
  notrace() {
    this.streamManager.noTrace();
    return InterpretedSymbol.of('t');
  }

  /**
   * 引数を評価し、その論理和を応答するメソッド
   * @param {Cons} aCons 評価するCons
   * @return {*} 評価結果
   */
  or(aCons) {
    for (let each of aCons.loop()) {
      let anObject = Evaluator.eval(each, this.environment, this.streamManager, this.depth);
      if (Cons.isNotNil(anObject)) {
        return InterpretedSymbol.of('t');
      }
    }

    return Cons.nil;
  }

  /**
   * 第1引数のインタプリテッドシンボルに束縛されたリストから先頭の要素を取り出し、応答するメソッド
   * @param {*} aCons 評価するCons
   * @return {*} 評価結果
   */
  pop_(aCons) {
    if (Cons.isNotSymbol(aCons.car)) {
      console.log('arguments 1 is not symbol.');
    }
    let aSymbol = aCons.car;
    let anObject = Evaluator.eval(aSymbol, this.environment, this.streamManager, this.depth);
    if (Cons.isNotCons(anObject)) {
      return Cons.nil;
    }
    this.environment.setIfExit(aSymbol, anObject.cdr);

    return anObject.car;
  }

  /**
   * 式を順番に評価していくメソッド
   * @param {*} aCons 評価するCons
   * @return {*} 評価結果
   */
  progn(aCons) {
    let anObject = Cons.nil;
    let theCons = aCons.car;
    this.bindingParallel(theCons, this.environment);
    theCons = aCons.cdr;
    for (let each of theCons.loop()) {
      anObject = Evaluator.eval(each, this.environment, this.streamManager, this.depth);
    }

    return anObject;
  }

  /**
   * 引数を改行なしで出力する関数
   * @param {Cons} aCons 評価するCons
   * @return {*} 評価結果
   */
  princ(aCons) {
    let anObject = Evaluator.eval(aCons.car, this.environment, this.streamManager, this.depth);
    process.stdout.write(String(anObject));

    return anObject;
  }

  /**
   * 引数を改行ありで出力する関数
   * @param {Cons} aCons 評価するCons
   * @return {*} 評価結果
   */
  print(aCons) {
    let anObject = Evaluator.eval(aCons.car, this.environment, this.streamManager, this.depth);
    console.log(anObject);

    return anObject;
  }

  /**
   * 第2引数のインタプリテッドシンボルに束縛されたシンボルに対して、第1引数の値をリストの先頭に登録し、応答するメソッド
   * @param {*} aCons 評価するCons
   * @return {*} 評価結果
   */
  push_(aCons) {
    let anObject = Evaluator.eval(aCons.car, this.environment, this.streamManager, this.depth);
    if (Cons.isNotSymbol(aCons.nth(2))) {
      console.log('arguments 2 is not symbol.');
    }
    let aSymbol = aCons.nth(2);
    anObject = new Cons(
      anObject,
      Evaluator.eval(aSymbol, this.environment, this.streamManager, this.depth),
    );
    this.environment.setIfExit(aSymbol, anObject);

    return anObject;
  }

  /**
   * 参照を応答するメソッド
   * @param {Cons} aCons 評価するCons
   * @return {*} 評価結果
   */
  quote(aCons) {
    return aCons.car;
  }

  /**
   * 第２引数で指定されたリストの先頭の要素に第1引数で指定した値を設定し、応答するメソッド
   * @param {Cons} args 引数
   * @return {*} 評価結果
   */
  rplaca(args) {
    let anObject = Evaluator.eval(args.car, this.environment, this.streamManager, this.depth);
    if (Cons.isNotCons(anObject)) {
      console.log('Can not apply \"set-car!\" to \"' + anObject + '\"');
      return Cons.nil;
    }
    let aCons = anObject;
    anObject = Evaluator.eval(args.nth(2), this.environment, this.streamManager, this.depth);
    aCons.setCar(anObject);

    return Evaluator.eval(args.car, this.environment, this.streamManager, this.depth);
  }

  /**
   * 第２引数で指定されたリストの先頭以外の要素に第1引数で指定した値を設定し、応答するメソッド
   * @param {Cons} args 引数
   * @return {*} 評価結果
   */
  rplacd(args) {
    let anObject = Evaluator.eval(args.car, this.environment, this.streamManager, this.depth);
    if (Cons.isNotCons(anObject)) {
      console.log('Can not apply \"set-cdr!\" to \"' + anObject + '\"');
      return Cons.nil;
    }
    let aCons = anObject;
    anObject = Evaluator.eval(args.nth(2), this.environment, this.streamManager, this.depth);
    aCons.setCdr(anObject);

    return Evaluator.eval(args.car, this.environment, this.streamManager, this.depth);
  }

  /**
   * 現環境にのみにキーと値を束縛するメソッド
   * @param {Cons} args 引数
   * @return {*} 評価結果
   */
  setq(args) {
    let anObject = Cons.nil;
    let anIterator = args.loop();
    let index = -1;

    while (anIterator.hasNext()) {
      let key = null;

      if (Cons.isSymbol(args.nth(index + 2))) {
        key = anIterator.next();
      } else {
        console.log('\"' + args.car + '\" is not symbol');
      }

      if (!anIterator.hasNext()) {
        console.log('sizes do not match.');
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

  /**
   * 環境全てにキーと値を束縛するメソッド
   * キーと値を上書きする’
   * @param {Cons} args 引数
   * @return {*} 評価結果
   */
  set_allq(args) {
    let anObject = Cons.nil;
    let anIterator = args.loop();
    let index = -1;

    while (anIterator.hasNext()) {
      let key = null;

      if (Cons.isSymbol(args.nth(index + 2))) {
        key = anIterator.next();
      } else {
        console.log('\"' + args.car + '\" is not symbol');
      }
      anObject = Evaluator.eval(
        anIterator.next(),
        this.environment,
        this.streamManager,
        this.depth,
      );
      this.environment.setIfExit(key, anObject);
    }

    return anObject;
  }

  /**
   * 呼び出しの深さを設定するメソッド
   * @param {Number} aNumber 呼び出しの深さ
   * @return {Null} 何も返さない。
   */
  setDepth(aNumber) {
    this.depth = aNumber;
    return null;
  }

  /**
   * Lispの関数とJSの関数を紐づけるテーブルを応答するメソッド
   * @return {Table} 生成したテーブル
   */
  static setup() {
    try {
      let aTable = new Map();
      aTable.set(InterpretedSymbol.of('and'), 'and');
      aTable.set(InterpretedSymbol.of('apply'), 'apply_lisp');
      aTable.set(InterpretedSymbol.of('bind'), 'bind');
      aTable.set(InterpretedSymbol.of('cond'), 'cond');
      aTable.set(InterpretedSymbol.of('defun'), 'defun');
      aTable.set(InterpretedSymbol.of('do'), 'do_');
      aTable.set(InterpretedSymbol.of('dolist'), 'doList');
      aTable.set(InterpretedSymbol.of('do*'), 'doStar');
      aTable.set(InterpretedSymbol.of('eval'), 'eval_lisp');
      aTable.set(InterpretedSymbol.of('exit'), 'exit');
      aTable.set(InterpretedSymbol.of('gc'), 'gc');
      aTable.set(InterpretedSymbol.of('if'), 'if_');
      aTable.set(InterpretedSymbol.of('lambda'), 'lambda');
      aTable.set(InterpretedSymbol.of('let'), 'let');
      aTable.set(InterpretedSymbol.of('let*'), 'letStar');
      aTable.set(InterpretedSymbol.of('not'), 'not');
      aTable.set(InterpretedSymbol.of('notrace'), 'notrace');
      aTable.set(InterpretedSymbol.of('or'), 'or');
      aTable.set(InterpretedSymbol.of('pop'), 'pop_');
      aTable.set(InterpretedSymbol.of('progn'), 'progn');
      aTable.set(InterpretedSymbol.of('princ'), 'princ');
      aTable.set(InterpretedSymbol.of('print'), 'print');
      aTable.set(InterpretedSymbol.of('push'), 'push_');
      aTable.set(InterpretedSymbol.of('quote'), 'quote');
      aTable.set(InterpretedSymbol.of('rplaca'), 'rplaca');
      aTable.set(InterpretedSymbol.of('rplacd'), 'rplacd');
      aTable.set(InterpretedSymbol.of('setq'), 'setq');
      aTable.set(InterpretedSymbol.of('set-allq'), 'set_allq');
      aTable.set(InterpretedSymbol.of('terpri'), 'terpri');
      aTable.set(InterpretedSymbol.of('time'), 'time');
      aTable.set(InterpretedSymbol.of('trace'), 'trace');
      aTable.set(InterpretedSymbol.of('unless'), 'unless');
      aTable.set(InterpretedSymbol.of('when'), 'when');

      return aTable;
    } catch (e) {
      throw new Error('NullPointerException (Evaluator, initialize)');
    }
  }

  /**
   * スペシャルフォームを評価するメソッド
   * @param {Cons} form スペシャルフォーム
   * @return {*} 評価結果
   *
   */
  specialForm(form) {
    let aSymbol = form.car;

    if (this.isSpy(aSymbol)) {
      this.spyPrint(this.streamManager.spyStream(aSymbol), form.toString());
      this.setDepth(this.depth + 1);
    }

    let aCons = form.cdr;
    let methodName = Evaluator.buildInFunctions.get(aSymbol);

    try {
      let method = this[methodName];
      ((x) => {
        x;
      })(method); // 何もしない。
    } catch (e) {
      throw new Error('Not Found Method: ' + methodName);
    }

    let answer = R.invoker(1, methodName)(aCons, this);

    if (this.isSpy(aSymbol)) {
      this.setDepth(this.depth - 1);
      this.spyPrint(this.streamManager.spyStream(aSymbol), answer + ' <== ' + aSymbol);
    }

    return answer;
  }

  spyPrint(aStream, line) {
    let aPrintStream = process.stdout;
    if (aStream != null) {
      console.log(aStream);
    }
    console.log(this.indent() + line);
    if (aStream != null) {
      console.log(aPrintStream);
    }
    return null;
  }

  /**
   * 改行を出力するメソッド
   * @return {InterpretedSymbol} インタプリテッドシンボルt
   */
  terpri() {
    console.log('');
    return InterpretedSymbol.of('t');
  }

  /**
   * 引数で与えられた式を評価するのにかかった時間（ms）を応答するメソッド
   * @param {Cons} aCons 評価するCons
   * @return {Number} 評価にかかった時間（ms）
   */
  time(aCons) {
    const start = process.hrtime();
    Evaluator.eval(aCons.car, this.environment, this.streamManager, this.depth);
    const end = process.hrtime(start);

    return end[1] / 1000000;
  }

  /**
   * トレースするように設定するメソッド
   * @return {InterpretedSymbol} インタプリテッドシンボルt
   */
  trace() {
    this.streamManager.trace();
    return InterpretedSymbol.of('t');
  }

  /**
   * 最初の式が成り立たない時、後ろの式を順次評価していくメソッド
   * @param {Cons} aCons 評価するCons
   * @return {*} 評価結果
   */
  unless(aCons) {
    let anObject = Cons.nil;
    let theCons = aCons.cdr;
    let flag = Evaluator.eval(aCons.car, this.environment, this.streamManager, this.depth);
    if (Cons.isNotNil(flag)) {
      return Cons.nil;
    }
    for (let each of theCons.loop()) {
      anObject = Evaluator.eval(each, this.environment, this.streamManager, this.depth);
    }

    return anObject;
  }

  /**
   * 最初の式が成り立つ時、後ろの式を順次評価していくメソッド
   * @param {Cons} aCons 評価するCons
   * @return {*} 評価結果
   */
  when(aCons) {
    let anObject = Cons.nil;
    let theCons = aCons.cdr;
    let flag = Evaluator.eval(aCons.car, this.environment, this.streamManager, this.depth);
    if (Cons.isNil(flag)) {
      return Cons.nil;
    }
    for (let each of theCons.loop()) {
      anObject = Evaluator.eval(each, this.environment, this.streamManager, this.depth);
    }

    return anObject;
  }
}
