'use strict';

import { LispInterpreter } from './LispInterpreter.js';

const args = process.argv.slice(2);

if (args.includes('--version') || args.includes('-v')) {
    console.log(`kei-lisp v2.0.0`);
    process.exit(0);
}

if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: kei-lisp [options]');
    console.log('');
    console.log('Options:');
    console.log('  -v, --version  Show version number');
    console.log('  -h, --help     Show help');
    process.exit(0);
}

new LispInterpreter().run();
