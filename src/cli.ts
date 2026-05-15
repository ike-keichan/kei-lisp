import { LispInterpreter } from './LispInterpreter/index.js';

const args = new Set(process.argv.slice(2));

if (args.has('--version') || args.has('-v')) {
  console.log(`kei-lisp v2.0.0`);
} else if (args.has('--help') || args.has('-h')) {
  console.log('Usage: kei-lisp [options]');
  console.log('');
  console.log('Options:');
  console.log('  -v, --version  Show version number');
  console.log('  -h, --help     Show help');
} else {
  new LispInterpreter().run();
}
