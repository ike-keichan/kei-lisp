/**
 * @file
 * Catching `(exit)` via `ExitError` to keep the host process alive
 * and run cleanup. Important when embedding kei-lisp as a library.
 *
 * Run with:
 *   pnpm build && node --experimental-strip-types examples/exit-handling.ts
 */
import { ExitError, LispInterpreter } from 'kei-lisp';

const interpreter = new LispInterpreter();

// Simulated user input (in practice, supplied from outside).
const userInput = '(+ 1 2) (exit) (+ 3 4)';

try {
  interpreter.evalString(userInput);
  console.log('Lisp program completed normally (no exit)');
} catch (error) {
  if (error instanceof ExitError) {
    console.log('Lisp program requested (exit) - host runs cleanup');
    // Cleanup hook goes here.
  } else {
    throw error;
  }
}

console.log('Host process is still alive (process.exit was not called)');
