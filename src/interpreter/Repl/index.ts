import { createRequire } from 'node:module';
import type { Interface as ReadlineInterface } from 'node:readline';

import { Cons } from '../../value/Cons/index.js';
import { ExitError } from '../../errors/ExitError/index.js';
import { KeiLispError } from '../../errors/KeiLispError/index.js';
import { LispInterpreter } from '../LispInterpreter/index.js';

const require = createRequire(import.meta.url);

/**
 * @class
 * @classdesc Interactive REPL wrapper around LispInterpreter. Handles line accumulation, parenthesis balancing, and prompt I/O.
 * @author Keisuke Ikeda
 * @this {Repl}
 */
export class Repl {
  interpreter: LispInterpreter;
  rl: ReadlineInterface;

  constructor(interpreter: LispInterpreter = new LispInterpreter()) {
    this.interpreter = interpreter;

    const readline = require('node:readline') as typeof import('node:readline');
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '>> ',
    });
  }

  /**
   * Starts the REPL loop.
   */
  run(): void {
    let aString = '';
    let leftParentheses = 0;
    let exitedViaLisp = false;

    this.rl.prompt();
    this.rl
      .on('line', (line: string) => {
        line += ' ';

        for (const aCharacter of line) {
          if (aCharacter === '(') {
            leftParentheses++;
          }
          if (aCharacter === ')') {
            leftParentheses--;
          }
          aString += aCharacter;
        }

        if (leftParentheses <= 0) {
          try {
            const aCons = this.interpreter.parse(aString);
            for (const each of aCons.loop()) {
              process.stdout.write(
                (this.interpreter.eval(each) as { toString(): string }).toString() + '\n',
              );
            }
          } catch (error) {
            if (error instanceof ExitError) {
              exitedViaLisp = true;
              this.rl.close();
              return;
            }
            if (error instanceof KeiLispError) {
              console.error(`*** ${error.name}: ${error.message} ***`);
              process.stdout.write(Cons.nil.toString() + '\n');
            } else {
              throw error;
            }
          }
          leftParentheses = 0;
          aString = '';
          this.rl.prompt();
        }
      })
      .on('close', () => {
        // Skip the message if (exit) was called, since Evaluator.exit() already printed "Bye!".
        if (!exitedViaLisp) {
          console.log('\nBye!');
        }
      });
  }
}
