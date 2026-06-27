/**
 * @file
 * Programmatic evaluation samples using `evalString` and `evalAll`.
 *
 * Run with:
 *   pnpm build && node --experimental-strip-types examples/basic-eval.ts
 */
import { Cons, LispInterpreter } from 'kei-lisp';

const interpreter = new LispInterpreter();

// 1. Evaluate a single expression.
const sum = interpreter.evalString('(+ 1 2 3)');
console.log('(+ 1 2 3) =>', Cons.toString(sum));

// 2. Evaluate multiple expressions (only the last value is returned).
const factorial = interpreter.evalString(
  '(defun fact (n) (if (= n 0) 1 (* n (fact (- n 1))))) (fact 10)',
);
console.log('(fact 10) =>', Cons.toString(factorial));

// 3. Evaluate multiple expressions and collect every result.
const results = interpreter.evalAll('(setq x 10) (* x x) (+ x 1)');
console.log(
  'all results:',
  results.map((v) => Cons.toString(v)),
);

// 4. Side effects (setq) persist across calls on the same interpreter.
interpreter.evalString('(setq greeting "hello")');
const greeting = interpreter.evalString('greeting');
console.log('greeting =>', Cons.toString(greeting));
