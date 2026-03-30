// #!/usr/bin/env node

'use strict';

// import "@babel/polyfill";

//モジュール「LispInterpreter」を読み込む。
import { LispInterpreter } from './LispInterpreter.js';

/**
 * インタプリタを起動するサンプル関数。
 * @author Keisuke Ikeda
 * @return {Null} 何も返さない。
 */
function main() {
  const aLispInterpreter = new LispInterpreter();
  aLispInterpreter.run();

  return null;
}

// Webページでない時のみmain関数を呼びだす。
if (typeof document === 'undefined') {
  main();
}

// Webページとして使用のときのみ、Webpackでグローバルスコープから隠れてしまっては困るものだけを、グローバルスコープに登録します。
if (typeof window !== 'undefined') {
  window.main = main;
}
