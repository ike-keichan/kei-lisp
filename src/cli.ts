'use strict';

import { LispInterpreter } from './LispInterpreter/index.js';

// 原本踏襲: 配列のままで includes チェック
// eslint-disable-next-line unicorn/prefer-set-has
const args = process.argv.slice(2);

if (args.includes('--version') || args.includes('-v')) {
  console.log(`kei-lisp v2.0.0`);
  // eslint-disable-next-line n/no-process-exit, unicorn/no-process-exit
  process.exit(0);
}

if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: kei-lisp [options]');
  console.log('');
  console.log('Options:');
  console.log('  -v, --version  Show version number');
  console.log('  -h, --help     Show help');
  // eslint-disable-next-line n/no-process-exit, unicorn/no-process-exit
  process.exit(0);
}

new LispInterpreter().run();
