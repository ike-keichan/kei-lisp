import pkg from '../package.json' with { type: 'json' };

import { Repl } from './interpreter/Repl/index.js';

const HELP_MESSAGE = `Usage: kei-lisp [options]

Options:
  -v, --version  Show version number
  -h, --help     Show help`;

const args = process.argv.slice(2);

if (args.includes('--version') || args.includes('-v')) {
  console.log(`kei-lisp v${pkg.version}`);
} else if (args.includes('--help') || args.includes('-h')) {
  console.log(HELP_MESSAGE);
} else if (args.length > 0) {
  console.error(`kei-lisp: unknown argument: ${args[0]}`);
  console.error(HELP_MESSAGE);
  process.exitCode = 1;
} else {
  new Repl().run();
}
