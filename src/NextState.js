// #!/usr/bin/env node

'use strict';

// ライブラリ「Ramda」を読み込む。
import * as R from 'ramda';

/**
 * @class
 * @classdesc 次の状態を保持するクラス
 * @author Keisuke Ikeda
 * @this {NextState}
 */
export class NextState extends Object {
  /**
   * コンストラクタメソッド
   * @constructor
   * @param {Number} aNumber
   * @param {String} aString
   * @return {NextState} 自身
   */
  constructor(aNumber, aString) {
    super();
    this.automaton;
    this.nextState = aNumber;
    this.method = null;
    this.methodName = aString;

    return this;
  }

  /**
   * 入力された文字に対応するメソッドを呼び出し、トークン番号を応答するメソッド
   * @param {Parser} anAutomaton パースするためのメソッドを呼び出すインスタンス
   * @return {Number} 環境の状況を表す数字、トークン番号
   */
  next(anAutomaton) {
    this.automaton = anAutomaton;
    if (this.methodName == null) {
      return Number(this.nextState);
    }
    if (this.method == null) {
      try {
        this.method = this.automaton[this.methodName];
      } catch (e) {
        throw new Error('Not Found Method: ' + this.methodName);
      }
    }

    let aNumber = -1;
    try {
      if (this.nextState != null) {
        aNumber = this.nextState;
      }
      let anObject = R.invoker(0, this.methodName)(this.automaton);
      if (anObject != null) {
        aNumber = Number(anObject);
      }
    } catch (e) {
      throw new Error('Not Invoke Method: ' + this.methodName);
    }

    return Number(aNumber);
  }
}
