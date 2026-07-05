import pkg from '../../../package.json' with { type: 'json' };

import { Repl } from '../Repl/index.js';

/**
 * @class
 * @classdesc Argument handling for the kei-lisp CLI entry point, extracted
 * from the executable script so it can be unit tested. Recognizes the
 * version / help flags and falls back to starting the interactive REPL.
 * @author Keisuke Ikeda
 * @this {CliApp}
 */
export class CliApp extends Object {
  /**
   * The usage message printed by `--help` and on unknown arguments.
   */
  static readonly HELP_MESSAGE = `Usage: kei-lisp [options]

Options:
  -v, --version  Show version number
  -h, --help     Show help`;

  /**
   * Runs the CLI with the given arguments.
   * @param args the command line arguments (without the node / script prefix)
   * @param log sink for standard output lines (defaults to console.log)
   * @param error sink for standard error lines (defaults to console.error)
   * @param startRepl starts the interactive REPL (defaults to `new Repl().run()`)
   * @return the process exit code
   */
  static run(
    args: string[],
    log: (line: string) => void = console.log,
    error: (line: string) => void = console.error,
    startRepl: () => void = (): void => {
      new Repl().run();
    },
  ): number {
    if (args.includes('--version') || args.includes('-v')) {
      log(`kei-lisp v${pkg.version}`);
      return 0;
    }
    if (args.includes('--help') || args.includes('-h')) {
      log(CliApp.HELP_MESSAGE);
      return 0;
    }
    if (args.length > 0) {
      error(`kei-lisp: unknown argument: ${args[0] ?? ''}`);
      error(CliApp.HELP_MESSAGE);
      return 1;
    }
    startRepl();
    return 0;
  }
}
