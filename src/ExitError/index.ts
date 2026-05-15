/**
 * @class
 * @classdesc Lispの (exit) 呼び出しによる正常終了を表すエラークラス。REPLやライブラリ呼び出しの上位で catch し、終了処理を行うために用いる。
 * @author Keisuke Ikeda
 * @this {ExitError}
 */
export class ExitError extends Error {
  /**
   * コンストラクタメソッド
   * @constructor
   */
  constructor() {
    super('Exit');
    this.name = 'ExitError';
  }
}
