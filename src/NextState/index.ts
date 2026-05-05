'use strict';

import type { Parser } from '../Parser/index.js';

/**
 * @class
 * @classdesc 次の状態を保持するクラス
 * @author Keisuke Ikeda
 * @this {NextState}
 */
export class NextState {
  automaton: Parser | null = null;
  nextState: number | null;
  method: unknown;
  methodName: string | null;

  /**
   * コンストラクタメソッド
   */
  constructor(aNumber: number | null, aString: string | null) {
    this.nextState = aNumber;
    this.method = null;
    this.methodName = aString;
  }

  /**
   * 入力された文字に対応するメソッドを呼び出し、トークン番号を応答するメソッド
   */
  next(anAutomaton: Parser): number {
    this.automaton = anAutomaton;
    if (this.methodName == null) {
      return Number(this.nextState);
    }
    if (this.method == null) {
      try {
        this.method = (this.automaton as unknown as Record<string, unknown>)[this.methodName];
      } catch {
        throw new Error('Not Found Method: ' + this.methodName);
      }
    }

    let aNumber = -1;
    try {
      if (this.nextState != null) {
        aNumber = this.nextState;
      }
      const anObject = (this.automaton as unknown as Record<string, () => unknown>)[
        this.methodName
      ]();
      if (anObject != null) {
        aNumber = Number(anObject);
      }
    } catch {
      throw new Error('Not Invoke Method: ' + this.methodName);
    }

    return Number(aNumber);
  }
}
