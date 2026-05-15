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

if (globalAny['document'] === undefined) {
  main();
}

if (globalAny['window'] !== undefined) {
  (globalAny['window'] as Record<string, unknown>)['main'] = main;
}
