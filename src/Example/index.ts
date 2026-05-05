'use strict';

import { LispInterpreter } from '../LispInterpreter/index.js';

/**
 * インタプリタを起動するサンプル関数。
 * @author Keisuke Ikeda
 */
function main(): null {
  const aLispInterpreter = new LispInterpreter();
  aLispInterpreter.run();

  return null;
}

const globalAny = globalThis as Record<string, unknown>;

// 原本踏襲: typeof による未定義チェック
/* eslint-disable unicorn/no-typeof-undefined */
if (typeof globalAny['document'] === 'undefined') {
  main();
}

if (typeof globalAny['window'] !== 'undefined') {
  (globalAny['window'] as Record<string, unknown>)['main'] = main;
}
/* eslint-enable unicorn/no-typeof-undefined */
