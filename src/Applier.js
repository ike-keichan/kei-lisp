// #!/usr/bin/env node

'use strict';

// ライブラリ「Ramda」を読み込む。
import * as R from 'ramda';

// モジュール「Cons」を読み込む。
import { Cons } from './Cons.js';

// モジュール「Evaluator」を読み込む。
import { Evaluator } from './Evaluator.js';

//モジュール「InterpretedSymbol」を読み込む。
import { InterpretedSymbol } from './InterpretedSymbol';

// モジュール「Table」を読み込む。
import { Table } from './Table.js';

/**
 * Lispの万能関数のApplyを模倣したクラス
 * @class
 * @classdesc
 * @author Keisuke Ikeda
 * @this {Applier}
 */
export class Applier extends Object {
  /**
   * Lispの関数とJSの関数を紐づけるテーブル
   */
  static buildInFunctions = Applier.setup();

  /**
   * gensymで後ろに結合する数字
   */
  static generateNumber = 0;

  /**
   * コンストラクタメソッド
   * @constructor
   * @param {Table} aTable 環境のテーブル（予約語）
   * @param {StreamManager} aStreamManager
   * @param {Number} aNumber 呼び出しの深さ
   * @return {Applier} 自身
   */
  constructor(aTable, aStreamManager, aNumber) {
    super();
    this.environment = new Table(aTable);
    this.streamManager = aStreamManager;
    this.depth = aNumber;

    return this;
  }

  /**
   * 引数の絶対値を応答するメソッド
   * @param {Cons} args 引数
   * @return {Number} 計算結果
   */
  abs(args) {
    if (Cons.isNumber(args.car)) {
      return Math.abs(args.car);
    } else {
      console.log('Can not apply \"abs\" to \"' + args.car + '\"');
    }

    return Cons.nil;
  }

  /**
   * 引数の値の和を応答するメソッド
   * @param {Cons} args 引数
   * @return {Number} 計算結果
   */
  add(args) {
    if (Cons.isNumber(args.car)) {
      return this.add_Number(args.car, args.cdr);
    } else {
      console.log('Can not apply \"add\" to \"' + args.car + '\"');
    }

    return Cons.nil;
  }

  /**
   * Number型の値の和を応答するメソッド
   * @param {Number} init 第1引数
   * @param {Cons} args 第2~引数
   * @return {Number} 計算結果
   */
  add_Number(init, args) {
    let result = init;
    let aCons = args;

    while (Cons.isNotNil(aCons)) {
      let each = aCons.car;
      if (Cons.isNumber(each)) {
        result = result + each;
      } else {
        console.log('Can not apply \"add\" to \"' + each + '\"');
        return Cons.nil;
      }
      aCons = aCons.cdr;
    }

    return result;
  }

  /**
   * Applierを実行するメソッド
   * @param {*} procedure 関数名、又はオペレータ
   * @param {*} args 引数の値
   * @param {Table} environment 環境のテーブル（予約語）
   * @param {StreamManager} aStreamManager
   * @param {Number} depth 呼び出しの深さ
   * @return {*} 計算結果
   */
  static apply(procedure, args, environment, aStreamManager, depth) {
    return new Applier(environment, aStreamManager, depth).apply(procedure, args);
  }

  /**
   * Applierを実行するメソッド
   * @param {*} procedure 関数名、又はオペレータ
   * @param {*} args 引数の値
   * @return {*} 計算結果
   */
  apply(procedure, args) {
    if (Cons.isSymbol(procedure)) {
      return this.selectProcedure(procedure, args);
    }
    return this.entrustEvaluator(procedure, args);
  }

  /**
   * 第2引数から第1引数で指定される項目を検索し、応答するメソッド
   * @param {Cons} args 引数
   * @return {*} 評価結果
   */
  assoc(args) {
    let aCons = new Cons();
    let target = args.car;

    if (Cons.isNotCons(args.nth(2))) {
      return Cons.nil;
    }
    aCons = args.nth(2);

    for (let each of aCons.loop()) {
      if (Cons.isNotCons(each)) {
        console.log('Can not apply \"assoc\" to \"' + each + '\"');
      }
      let key = each.car;
      if (this.equal_(new Cons(target, new Cons(key, Cons.nil))) == InterpretedSymbol.of('t')) {
        return each;
      }
    }

    return Cons.nil;
  }

  /**
   * 引数がAtomかどうかを判別し、応答するメソッド。
   * @param {Cons} args 引数
   * @return {*} 評価結果
   */
  atom_(args) {
    if (Cons.isAtom(args.car)) {
      return InterpretedSymbol.of('t');
    }
    return Cons.nil;
  }

  /**
   * 引数と値を束縛するメソッド
   * @param {Cons} parameter 値
   * @param {Cons} args 引数
   * @return {Null} 何も返さない。
   */
  binding(parameter, args) {
    if (Cons.isNil(parameter)) {
      return null;
    }
    let aCons = parameter;
    let theCons = args;

    while (Cons.isNotNil(aCons)) {
      try {
        this.environment.set(aCons.car, theCons.car);
      } catch (e) {
        console.log('sizes do not match.');
        return null;
      }

      if (Cons.isNotCons(aCons.cdr)) {
        break;
      }
      aCons = aCons.cdr;
      theCons = theCons.cdr;
    }

    if (Cons.isNotList(aCons.cdr) && Cons.isNotNil(aCons.cdr)) {
      try {
        this.environment.set(aCons.cdr, theCons.cdr);
      } catch (e) {
        console.log('sizes do not match.');
        return null;
      }
    } else if (Cons.isNotNil(aCons.cdr)) {
      throw new Error('Can not binding value to \"' + aList.cdr() + '\"');
    }

    return null;
  }

  /**
   * 組み込み関数を実行し、結果を応答するメソッド
   * @param {InterpretedSymbol} procedure 関数名、又はオペレータ
   * @param {Cons} args 引数
   * @return {*} 計算結果
   */
  buildInFunction(procedure, args) {
    let answer = Cons.nil;
    let methodName = new String();

    if (this.isSpy(procedure)) {
      this.spyPrint(this.streamManager.spyStream(procedure), new Cons(procedure, args).toString());
      this.setDepth(this.depth + 1);
    }

    methodName = Applier.buildInFunctions.get(procedure);

    try {
      let method = this[methodName];
      ((x) => {
        x;
      })(method); // 何もしない。
    } catch (e) {
      console.log('Not Found Method: ' + methodName);
    }

    answer = R.invoker(1, methodName)(args, this);

    if (this.isSpy(procedure)) {
      this.setDepth(this.depth - 1);
      this.spyPrint(
        this.streamManager.spyStream(procedure),
        answer + ' <== ' + new Cons(procedure, args),
      );
    }

    return answer;
  }

  /**
   * 引数の先頭（car）を応答するメソッド
   * @param {Cons} args
   * @return {*} 引数の先頭
   */
  car(args) {
    return args.car.car;
  }

  /**
   * 引数の先頭以外（cdr）を応答するメソッド
   * @param {Cons} args
   * @return {*} 引数の先頭以外
   */
  cdr(args) {
    return args.car.cdr;
  }

  /**
   * 引数が文字(Character)かどうかを判別し、応答するメソッド。
   * @param {Cons} args 引数
   * @return {*} 評価結果
   */
  character_(args) {
    if (Cons.isString(args.car) && args.car.length == 1) {
      return InterpretedSymbol.of('t');
    }
    return Cons.nil;
  }

  /**
   * 第一引数と第二引数のリストを結合し、応答するメソッド
   * @param {Cons} args 引数
   * @return {Cons} 評価結果
   */
  cons(args) {
    return new Cons(args.car, args.nth(2));
  }

  /**
   * 引数がConsかどうかを判別し、応答するメソッド。
   * @param {Cons} args 引数
   * @return {*} 評価結果
   */
  cons_(args) {
    if (Cons.isCons(args.car)) {
      return InterpretedSymbol.of('t');
    }
    return Cons.nil;
  }

  /**
   * 引数のリストを複製し、応答するメソッド
   * @param {Cons} args 引数
   * @return {*} 評価結果
   */
  copy(args) {
    return Cons.cloneValue(args.car);
  }

  /**
   * 引数のコサインを応答するメソッド
   * @param {Cons} args 引数
   * @return {Number} 計算結果
   */
  cos(args) {
    if (Cons.isNumber(args.car)) {
      return Math.cos(args.car);
    } else {
      selectPrintFunction()('Can not apply "cos" to "' + args.car + '"');
    }

    return Cons.nil;
  }

  /**
   * 引数の値の商を応答するメソッド
   * @param {Cons} args 引数
   * @return {Number} 計算結果
   */
  divide(args) {
    if (Cons.isNumber(args.car)) {
      return this.divide_Number(args.car, args.cdr);
    } else {
      console.log('Can not apply \"divide\" to \"' + args.car + '\"');
    }

    return Cons.nil;
  }

  /**
   * Number型の値の商を応答するメソッド
   * @param {Number} init 第1引数
   * @param {Cons} args 第2~引数
   * @return {Number} 計算結果
   */
  divide_Number(init, args) {
    let result = init;
    let aCons = args;

    while (Cons.isNotNil(aCons)) {
      let each = aCons.car;
      if (Cons.isNumber(each)) {
        result = result / each;
      } else {
        console.log('Can not apply \"divide\" to \"' + each + '\"');
        return Cons.nil;
      }
      aCons = aCons.cdr;
    }

    return result;
  }

  /**
   * 引数が浮動小数倍精度数(Double)かどうかを判別し、応答するメソッド。
   * @param {Cons} args 引数
   * @return {*} 評価結果
   */
  double_(args) {
    if (Cons.isNumber(args.car)) {
      return InterpretedSymbol.of('t');
    }
    return Cons.nil;
  }

  /**
   * ApplierでできないことをEvaluatorに任せ、結果を応答するメソッド
   * @param {Cons} procedure 関数名、又はオペレータ
   * @param {Cons} args 引数の値
   */
  entrustEvaluator(procedure, args) {
    let anObject = Cons.nil;
    let aCons = procedure.cdr;
    this.binding(aCons.car, args);
    aCons = aCons.cdr;

    for (let each of aCons.loop()) {
      if (each instanceof Table) {
        break;
      }
      anObject = Evaluator.eval(each, this.environment, this.streamManager, this.depth);
    }

    return anObject;
  }

  /**
   * 2つの引数の同値性を判別し、応答するメソッド
   * @param {Cons} args 引数
   * @return {*} 評価結果
   */
  eq_(args) {
    let first = args.car;
    let second = args.nth(2);
    if (first === second) {
      return InterpretedSymbol.of('t');
    }

    return Cons.nil;
  }

  /**
   * 2つの引数の同一性を判別し、応答するメソッド
   * @param {Cons} args 引数
   * @return {*} 評価結果
   */
  equal_(args) {
    let first = args.car;
    let second = args.nth(2);
    if (this.eq_(args) == InterpretedSymbol.of('t')) {
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
   * 引数をxとするe^xの値応答するメソッド
   * @param {Cons} args 引数
   * @return {Number} 計算結果
   */
  exp(args) {
    if (Cons.isNumber(args.car)) {
      return Math.exp(args.car);
    } else {
      selectPrintFunction()('Can not apply "exp" to "' + args.car + '"');
    }

    return Cons.nil;
  }

  /**
   * 指定されたフォーマットで出力を行うメソッド
   * @param {Cons} args 引数
   * @return {Cons} nil
   */
  format(args) {
    if (!Cons.isString(args.car)) {
      console.log('Can not apply \"format\" to \"' + args.car + '\"');
    }
    let aCons = args.cdr;
    let format = this.format_AUX(new String(args.car), aCons);
    process.stdout.write(String(format));

    return Cons.nil;
  }

  /**
   * formatの補助メソッド
   * @param {String} format 指定フォーマット
   * @param {Cons} aCons フォーマットに割り当てる変数
   * @return {String} 指定フォーマットに合わせて整えた文字列
   */
  format_AUX(format, aCons) {
    let theCons = aCons;
    let index = 0;
    let state = 0;
    let buffer = new String();
    let token = new String();

    while (index < format.length) {
      let aCharacter = format[index];
      if (state == 0) {
        if (aCharacter == '~') {
          state = 1;
        } else {
          buffer += aCharacter;
        }
      } else if (state == 1) {
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
          case '9':
            token += aCharacter;
            state = 2;
            break;
          case 'a':
            buffer += theCons.car.toString();
            theCons = theCons.cdr;
            state = 0;
            break;
          case '%':
            buffer += '\n';
            state = 0;
            break;
          case '-':
            state = 3;
            break;
          default:
            buffer += '~';
            buffer += aCharacter;
            state = 0;
        }
      } else if (state == 2) {
        let size;
        let value = new String();

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
          case '9':
            token += aCharacter;
            state = 2;
            break;
          case 'a':
            size = Number(token.toString());
            token = new String();
            if (Cons.isNil(theCons)) {
              console.log('size do not match.');
              return;
            }
            value = theCons.car.toString();
            theCons = theCons.cdr;
            while (value.length() < size) {
              value += ' ';
            }
            buffer += value;
            state = 0;
            break;
          default:
            buffer += '~';
            buffer += token.toString() + aCharacter;
            token = new String();
            state = 0;
        }
      } else if (state == 3) {
        let size;
        let spaces = new String();
        let value = new String();

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
          case '9':
            token += aCharacter;
            state = 3;
            break;
          case 'a':
            size = Number(token.toString());
            token = new String();
            if (Cons.isNil(theCons)) {
              console.log('size do not match.');
              return;
            }
            value = theCons.car.toString();
            theCons = theCons.cdr;
            spaces = '';
            while (value.length() + spaces.length() < size) {
              spaces += ' ';
            }
            buffer += spaces + value;
            state = 0;
            break;
          default:
            buffer += '~';
            buffer += '-';
            buffer += token.toString() + aCharacter;
            token = new String();
            state = 0;
        }
      } else {
        console.log('Error!');
      }
      index++;
    }
    if (Cons.isNotNil(theCons)) {
      console.log('size do not match.');
      return;
    }

    return buffer;
  }

  /**
   * 引数が浮動小数単精度数(Float)かどうかを判別し、応答するメソッド。
   * @param {Cons} args 引数
   * @return {*} 評価結果
   */
  float_(args) {
    if (Cons.isNumber(args.car)) {
      if (-3.4e38 <= args.car && args.car <= 3.4e38) {
        return InterpretedSymbol.of('t');
      }
    }
    return Cons.nil;
  }

  /**
   * 新たなインタプリテッドシンボルを応答するメソッド
   * @return {InterpretedSymbol} 評価結果
   */
  gensym() {
    let aSymbol = InterpretedSymbol.of('id' + Applier.generateNumber);
    Applier.incrementGenerateNumber();

    return aSymbol;
  }

  getStream(anObject) {
    if (this.streamManager == null) {
      return process.out;
    }
    if (anObject instanceof String || typeof anObject == 'string') {
      return process.out;
    }

    return this.streamManager.getStream();
  }

  /**
   * 2つの値が大なり関係にあるかどうか判別し、応答するメソッド
   * @param {Cons} args 引数
   * @return {*} 評価結果
   */
  greaterThan(args) {
    if (Cons.isNumber(args.car)) {
      return this.greaterThan_Number(args.car, args.cdr);
    } else {
      console.log('Can not apply \">\" to \"' + args.car + '\"');
    }

    return Cons.nil;
  }

  /**
   * Number型の2つの値が大なり関係にあるかどうか判別し、応答するメソッド
   * @param {Number} init 第1引数
   * @param {Cons} args 第2~引数
   * @return {*} 評価結果
   */
  greaterThan_Number(init, args) {
    let leftValue = init;
    let aCons = args;
    let aBoolean = true;

    while (Cons.isNotNil(aCons)) {
      let rightValue = aCons.car;
      if (Cons.isNumber(rightValue)) {
        aBoolean = leftValue > rightValue;
      } else {
        console.log('Can not apply \">\" to \"' + rightValue + '\"');
        return Cons.nil;
      }
      if (aBoolean == false) {
        return Cons.nil;
      }
      leftValue = rightValue;
      aCons = aCons.cdr;
    }

    return InterpretedSymbol.of('t');
  }

  /**
   * 二つの値が大なりイコール関係にあるかどうか判別し、応答するメソッド
   * @param {Cons} args 引数
   * @return {*} 評価結果
   */
  greaterThanOrEqual(args) {
    if (Cons.isNumber(args.car)) {
      return this.greaterThanOrEqual_Number(args.car, args.cdr);
    } else {
      console.log('Can not apply \">=\" to \"' + args.car + '\"');
    }

    return Cons.nil;
  }

  /**
   * Number型の二つの値が大なりイコール関係にあるかどうか判別し、応答するメソッド
   * @param {Number} init 第1引数
   * @param {Cons} args 第2~引数
   * @return {*} 評価結果
   */
  greaterThanOrEqual_Number(init, args) {
    let leftValue = init;
    let aCons = args;
    let aBoolean = true;

    while (Cons.isNotNil(aCons)) {
      let rightValue = aCons.car;
      if (Cons.isNumber(rightValue)) {
        aBoolean = leftValue >= rightValue;
      } else {
        console.log('Can not apply \">=\" to \"' + rightValue + '\"');
        return Cons.nil;
      }
      if (aBoolean == false) {
        return Cons.nil;
      }
      leftValue = rightValue;
      aCons = aCons.cdr;
    }

    return InterpretedSymbol.of('t');
  }

  /**
   * gensymで後ろに結合する数字を1つ増加させるメソッド
   * @return {Null} 何も返さない。
   */
  static incrementGenerateNumber() {
    Applier.generateNumber++;
    return null;
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
   * 引数が整数(Integer)かどうかを判別し、応答するメソッド。
   * @param {Cons} args 引数
   * @return {*} 評価結果
   */
  integer_(args) {
    if (Cons.isNumber(args.car) && Number.isInteger(args.car)) {
      return InterpretedSymbol.of('t');
    }
    return Cons.nil;
  }

  /**
   * スパイする必要があるかどうかを判別し、応答するメソッド
   * @param {InterpretedSymbol} aSymbol
   * @return {Boolean} 真偽値
   */
  isSpy(aSymbol) {
    return this.streamManager.isSpy(aSymbol);
  }

  /**
   * 引数の最後のセルを応答するメソッド
   * @param {Cons} args 引数
   * @return {*} 評価結果
   */
  last(args) {
    if (Cons.isNotCons(args)) {
      return Cons.nil;
    }
    let aCons = args.car;

    return aCons.last();
  }

  /**
   * 2つの値が小なり関係にあるかどうか判別し、応答するメソッド
   * @param {Cons} args 引数
   * @return {*} 評価結果
   */
  lessThan(args) {
    if (Cons.isNumber(args.car)) {
      return this.lessThan_Number(args.car, args.cdr);
    } else {
      console.log('Can not apply \"<\" to \"' + args.car + '\"');
    }

    return Cons.nil;
  }

  /**
   * Number型の2つの値が小なり関係にあるかどうか判別し、応答するメソッド
   * @param {Number} init 第1引数
   * @param {Cons} args 第2~引数
   * @return {*} 評価結果
   */
  lessThan_Number(init, args) {
    let leftValue = init;
    let aCons = args;
    let aBoolean = true;

    while (Cons.isNotNil(aCons)) {
      let rightValue = aCons.car;
      if (Cons.isNumber(rightValue)) {
        aBoolean = leftValue < rightValue;
      } else {
        console.log('Can not apply \"<\" to \"' + rightValue + '\"');
        return Cons.nil;
      }
      if (aBoolean == false) {
        return Cons.nil;
      }
      leftValue = rightValue;
      aCons = aCons.cdr;
    }

    return InterpretedSymbol.of('t');
  }

  /**
   * 2つの値が小なりイコール関係にあるかどうか判別し、応答するメソッド
   * @param {Cons} args 引数
   * @return {*} 評価結果
   */
  lessThanOrEqual(args) {
    if (Cons.isNumber(args.car)) {
      return this.lessThanOrEqual_Number(args.car, args.cdr);
    } else {
      console.log('Can not apply \"<=\" to \"' + args.car + '\"');
    }

    return Cons.nil;
  }

  /**
   * Number型の2つの値が小なりイコール関係にあるかどうか判別し、応答するメソッド
   * @param {Number} init 第1引数
   * @param {Cons} args 第2~引数
   * @return {*} 評価結果
   */
  lessThanOrEqual_Number(init, args) {
    let leftValue = init;
    let aCons = args;
    let aBoolean = true;

    while (Cons.isNotNil(aCons)) {
      let rightValue = aCons.car;
      if (Cons.isNumber(rightValue)) {
        aBoolean = leftValue <= rightValue;
      } else {
        console.log('Can not apply \"<=\" to \"' + rightValue + '\"');
        return Cons.nil;
      }
      if (aBoolean == false) {
        return Cons.nil;
      }
      leftValue = rightValue;
      aCons = aCons.cdr;
    }

    return InterpretedSymbol.of('t');
  }

  /**
   * 引数の値をリストにまとめて応答する.
   * @param {Object} args 引数
   * @return {*} 評価結果
   */
  list(args) {
    if (Cons.isNil(args)) {
      return Cons.nil;
    }
    return new Cons(args.car, this.list(args.cdr));
  }

  /**
   * 引数がリストかどうかを判別し、応答するメソッド。
   * @param {Cons} args 引数
   * @return {*} 評価結果
   */
  list_(args) {
    if (Cons.isList(args.car)) {
      return InterpretedSymbol.of('t');
    }
    return Cons.nil;
  }

  /**
   * 第2引数に第1引数で指定された関数を適用し、応答するメソッド
   * @param {Cons} args 引数
   * @return {*} 評価結果
   */
  mapcar(args) {
    let aCons = new Cons(Cons.nil, Cons.nil);
    let procedure = args.car;
    let parameters = args.nth(2);
    let options = args.cdr.cdr;
    let theCons = aCons;
    let index = 1;

    for (let each of parameters.loop()) {
      let argumentsCons = new Cons(Cons.nil, Cons.nil);
      let temporaryCons = argumentsCons;
      let anObject;

      if (Cons.isNotNil(each)) {
        for (let arg of options.loop()) {
          if (Cons.isNotCons(arg)) {
            consol.log('sizes do not match.');
            return Cons.nil;
          }
          temporaryCons.setCdr(new Cons(arg.nth(index), Cons.nil));
          temporaryCons = temporaryCons.cdr;
        }
      }

      argumentsCons.setCar(each);
      anObject = Applier.apply(
        procedure,
        argumentsCons,
        this.environment,
        this.streamManager,
        this.depth,
      );
      theCons.setCdr(new Cons(anObject, Cons.nil));
      theCons = theCons.cdr;
      index++;
    }

    return aCons.cdr;
  }

  /**
   * 第2引数に第1引数の要素があれば、その要素が先頭となるConsを応答するメソッド
   * @param {Cons} args 引数
   * @return {*} 評価結果
   */
  member(args) {
    let aSymbol = InterpretedSymbol.of('equal?');
    if (Cons.isNotNil(args.nth(3))) {
      aSymbol = args.nth(3);
    }
    if (Cons.isNotCons(args.nth(2))) {
      return Cons.nil;
    }
    let aCons = args.nth(2);

    while (Cons.isCons(aCons)) {
      let anObject = null;

      if (aSymbol == InterpretedSymbol.of('eq?')) {
        anObject = this.eq_(new Cons(args.car, new Cons(aCons.car, Cons.nil)));
      }
      if (aSymbol == InterpretedSymbol.of('equal?')) {
        anObject = this.equal_(new Cons(args.car, new Cons(aCons.car, Cons.nil)));
      }
      if (anObject == null) {
        console.log('Can not apply \"member\" to \"' + aSymbol + '\"');
      }
      if (anObject == InterpretedSymbol.of('t')) {
        return aCons;
      }

      aCons = aCons.cdr;
    }

    return Cons.nil;
  }

  /**
   * 第2引数に第1引数の要素があるかどうかを判別し、応答するメソッド
   * @param {Cons} args 引数
   * @return {*} 評価結果
   */
  memq(args) {
    if (this.member(args) == Cons.nil) {
      return Cons.nil;
    } else {
      return InterpretedSymbol.of('t');
    }
  }

  /**
   * 引数の値の剰余を応答するメソッド
   * @param {Cons} args 引数
   * @return {Number} 計算結果
   */
  mod(args) {
    if (Cons.isNumber(args.car)) {
      return this.mod_Number(args.car, args.cdr);
    } else {
      console.log('Can not apply \"mod\" to \"' + args.car + '\"');
    }

    return Cons.nil;
  }

  /**
   * Number型の値の剰余を応答するメソッド
   * @param {Number} init 第1引数
   * @param {Cons} args 第2~引数
   * @return {Number} 計算結果
   */
  mod_Number(init, args) {
    let result = init;
    let aCons = args;

    while (Cons.isNotNil(aCons)) {
      let each = aCons.car;
      if (Cons.isNumber(each)) {
        result = result % each;
      } else {
        console.log('Can not apply \"mod\" to \"' + each + '\"');
        return Cons.nil;
      }
      aCons = aCons.cdr;
    }

    return result;
  }

  /**
   * 引数の値の積を応答するメソッド
   * @param {Cons} args 引数
   * @return {Number} 計算結果
   */
  multiply(args) {
    if (Cons.isNumber(args.car)) {
      return this.multiply_Number(args.car, args.cdr);
    } else {
      console.log('Can not apply \"multiply\" to \"' + args.car + '\"');
    }

    return Cons.nil;
  }

  /**
   * Number型の差の積を応答するメソッド
   * @param {Number} init 第1引数
   * @param {Cons} args 第2~引数
   * @return {Number} 計算結果
   */
  multiply_Number(init, args) {
    let result = init;
    let aCons = args;

    while (Cons.isNotNil(aCons)) {
      let each = aCons.car;
      if (Cons.isNumber(each)) {
        result = result * each;
      } else {
        console.log('Can not apply \"multiply\" to \"' + each + '\"');
        return Cons.nil;
      }
      aCons = aCons.cdr;
    }

    return result;
  }

  /**
   * ネイピア数を応答するメソッド
   * @return {Number} 計算結果
   */
  napier() {
    return Math.E;
  }

  /**
   * eqの否定を応答するメソッド
   * @param {Cons} args 引数
   * @return {*} 評価結果
   */
  neq(args) {
    if (this.eq_(args) == InterpretedSymbol.of('t')) {
      return Cons.nil;
    } else {
      return InterpretedSymbol.of('t');
    }
  }

  /**
   * equalの否定を応答するメソッド
   * @param {Cons} args 引数
   * @return {*} 評価結果
   */
  nequal(args) {
    if (this.equal_(args) == InterpretedSymbol.of('t')) {
      return Cons.nil;
    } else {
      return InterpretedSymbol.of('t');
    }
  }

  /**
   * 第2引数の第1引数番目の要素を応答するメソッド
   * @param {Cons} args 引数
   * @return {*} 評価結果
   */
  nth(args) {
    if (!Number.isInteger(args.car)) {
      return Cons.nil;
    }
    let index = args.car;
    let aCons = args.nth(2);

    return aCons.nth(index);
  }

  /**
   * 引数がnilかどうかを判別し、応答するメソッド。
   * @param {Cons} args 引数
   * @return {*} 評価結果
   */
  null_(args) {
    if (Cons.isNil(args.car)) {
      return InterpretedSymbol.of('t');
    }
    return Cons.nil;
  }

  /**
   * 引数がNumberかどうかを判別し、応答するメソッド。
   * @param {Cons} args 引数
   * @return {*} 評価結果
   */
  number_(args) {
    if (Cons.isNumber(args.car)) {
      return InterpretedSymbol.of('t');
    }
    return Cons.nil;
  }

  /**
   * 円周率を応答するメソッド
   * @param {Cons} args 引数
   * @return {Number} 計算結果
   */
  pi() {
    return Math.PI;
  }

  /**
   * 乱数を応答するメソッド
   * @param {Cons} args 引数
   * @return {Number} 計算結果
   */
  random() {
    return Math.random();
  }

  /**
   * 引数の四捨五入した値を応答するメソッド
   * @param {Cons} args 引数
   * @return {Number} 計算結果
   */
  round(args) {
    if (Cons.isNumber(args.car)) {
      return Math.round(args.car);
    } else {
      selectPrintFunction()('Can not apply "round" to "' + args.car + '"');
    }

    return Cons.nil;
  }

  /**
   * 実行する処理を選択し、実行するメソッド
   * @param {InterpretedSymbol} procedure 関数名、又はオペレータ
   * @param {Cons} args 引数
   * @return {*} 計算結果
   */
  selectProcedure(procedure, args) {
    if (Applier.buildInFunctions.has(procedure)) {
      return this.buildInFunction(procedure, args);
    }
    if (this.environment.has(procedure)) {
      return this.userFunction(procedure, args);
    }
    console.log('I could find no procedure description for ' + procedure);

    return Cons.nil;
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
    } catch (e) {
      throw new Error('NullPointerException (Applier, initialize)');
    }
  }

  /**
   * 引数のサインを応答するメソッド
   * @param {Cons} args 引数
   * @return {Number} 計算結果
   */
  sin(args) {
    if (Cons.isNumber(args.car)) {
      return Math.sin(args.car);
    } else {
      selectPrintFunction()('Can not apply "sin" to "' + args.car + '"');
    }

    return Cons.nil;
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
   * 引数の平方根を応答するメソッド
   * @param {Cons} args 引数
   * @return {Number} 計算結果
   */
  sqrt(args) {
    if (Cons.isNumber(args.car)) {
      return Math.sqrt(args.car);
    } else {
      selectPrintFunction()('Can not apply "sqrt" to "' + args.car + '"');
    }

    return Cons.nil;
  }

  /**
   * 引数がStringかどうかを判別し、応答するメソッド。
   * @param {Cons} args 引数
   * @return {*} 評価結果
   */
  string_(args) {
    if (Cons.isString(args.car)) {
      return InterpretedSymbol.of('t');
    }
    return Cons.nil;
  }

  /**
   * 引数の値の差を応答するメソッド
   * @param {Cons} args 引数
   * @return {Number} 計算結果
   */
  subtract(args) {
    if (Cons.isNumber(args.car)) {
      return this.subtract_Number(args.car, args.cdr);
    } else {
      console.log('Can not apply \"subtract\" to \"' + args.car + '\"');
    }

    return Cons.nil;
  }

  /**
   * Number型の差の商を応答するメソッド
   * @param {Number} init 第1引数
   * @param {Cons} args 第2~引数
   * @return {Number} 計算結果
   */
  subtract_Number(init, args) {
    let result = init;
    let aCons = args;

    while (Cons.isNotNil(aCons)) {
      let each = aCons.car;
      if (Cons.isNumber(each)) {
        result = result - each;
      } else {
        console.log('Can not apply \"subtract\" to \"' + each + '\"');
        return Cons.nil;
      }
      aCons = aCons.cdr;
    }

    return result;
  }

  /**
   * 引数がInterpretedSymbolかどうかを判別し、応答するメソッド。
   * @param {Cons} args 引数
   * @return {*} 評価結果
   */
  symbol_(args) {
    if (Cons.isSymbol(args.car)) {
      return InterpretedSymbol.of('t');
    }
    return Cons.nil;
  }

  /**
   * 引数のタンジェントを応答するメソッド
   * @param {Cons} args 引数
   * @return {Number} 計算結果
   */
  tan(args) {
    if (Cons.isNumber(args.car)) {
      return Math.tan(args.car);
    } else {
      selectPrintFunction()('Can not apply "tan" to "' + args.car + '"');
    }

    return Cons.nil;
  }

  /**
   * ユーザ定義関数を実行し、結果を応答するメソッド
   * @param {InterpretedSymbol} procedure 関数名、又はオペレータ
   * @param {Cons} args 引数
   * @return {*} 計算結果
   */
  userFunction(procedure, args) {
    if (this.isSpy(procedure)) {
      this.spyPrint(this.streamManager.spyStream(procedure), new Cons(procedure, args).toString());
      this.setDepth(this.depth + 1);
    }

    let lambda = this.environment.get(procedure);
    let theEnvironment = lambda.last().car;
    let answer = Applier.apply(lambda, args, theEnvironment, this.streamManager, this.depth);

    if (this.isSpy(procedure)) {
      this.setDepth(this.depth - 1);
      this.spyPrint(
        this.streamManager.spyStream(procedure),
        answer + ' <== ' + new Cons(procedure, args),
      );
    }

    return answer;
  }
}
