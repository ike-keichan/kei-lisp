import { describe, expect, it } from 'vitest';

import { Cons } from '../../value/Cons/index.js';
import { LispInterpreter } from '../../LispInterpreter/index.js';

process.stdin.setMaxListeners(100);

const evalStr = (src: string): string => {
  const interpreter = new LispInterpreter();
  return Cons.toString(interpreter.evalString(src));
};

const ONE_HUNDRED = '100';
const SETQ_X_100 = '(setq x 100)';

describe('Evaluator', () => {
  describe('atom evaluation', () => {
    it('returns a numeric literal as-is', () => {
      expect(evalStr('42')).toBe('42');
    });

    it('returns a string literal as-is', () => {
      expect(evalStr('"hello"')).toBe('hello');
    });

    it('returns nil as nil', () => {
      expect(evalStr('nil')).toBe('nil');
    });

    it('returns t as a self-evaluating symbol', () => {
      expect(evalStr('t')).toBe('t');
    });
  });

  describe('setq', () => {
    it('binds a value to a symbol', () => {
      const interpreter = new LispInterpreter();
      interpreter.evalString('(setq x 42)');
      expect(Cons.toString(interpreter.evalString('x'))).toBe('42');
    });

    it('overwrites an existing binding', () => {
      const interpreter = new LispInterpreter();
      interpreter.evalString('(setq x 1)');
      interpreter.evalString('(setq x 2)');
      expect(Cons.toString(interpreter.evalString('x'))).toBe('2');
    });
  });

  describe('let', () => {
    it('binds local variables and evaluates the body', () => {
      expect(evalStr('(let ((x 10) (y 20)) (+ x y))')).toBe('30');
    });

    it('binds in parallel and refers to the enclosing scope', () => {
      const interpreter = new LispInterpreter();
      interpreter.evalString(SETQ_X_100);
      expect(Cons.toString(interpreter.evalString('(let ((x 1) (y x)) y)'))).toBe(ONE_HUNDRED);
    });

    it('setq inside let updates the let binding', () => {
      expect(evalStr('(let ((x 1)) (setq x 99) x)')).toBe('99');
    });

    it('Round 4-J-3: setq inside nested let updates the inner binding', () => {
      expect(evalStr('(let ((x 1)) (let ((x 2)) (setq x 100) x))')).toBe(ONE_HUNDRED);
    });

    it('Round 4-J-3: setq inside nested let does not affect the outer binding', () => {
      expect(evalStr('(let ((x 1)) (let ((x 2)) (setq x 100)) x)')).toBe('1');
    });
  });

  describe('lambda', () => {
    it('returns a value when invoked immediately', () => {
      expect(evalStr('((lambda (x y) (+ x y)) 3 4)')).toBe('7');
    });

    it('can be bound to a variable and called later', () => {
      const interpreter = new LispInterpreter();
      interpreter.evalString('(setq f (lambda (x) (* x 2)))');
      expect(Cons.toString(interpreter.evalString('(f 5)'))).toBe('10');
    });
  });

  describe('defun', () => {
    it('defines a function and calls it', () => {
      const interpreter = new LispInterpreter();
      interpreter.evalString('(defun double (x) (* x 2))');
      expect(Cons.toString(interpreter.evalString('(double 5)'))).toBe('10');
    });

    it('defines a recursive function (fact)', () => {
      expect(evalStr('(defun fact (n) (if (= n 0) 1 (* n (fact (- n 1))))) (fact 10)')).toBe(
        '3628800',
      );
    });

    it('defines a recursive function (fib)', () => {
      expect(
        evalStr('(defun fib (n) (if (< n 2) n (+ (fib (- n 1)) (fib (- n 2))))) (fib 10)'),
      ).toBe('55');
    });
  });

  describe('if', () => {
    it('evaluates the then branch when the condition is true', () => {
      expect(evalStr('(if (= 1 1) "yes" "no")')).toBe('yes');
    });

    it('evaluates the else branch when the condition is false', () => {
      expect(evalStr('(if (= 1 2) "yes" "no")')).toBe('no');
    });

    it('returns nil when false and the else branch is omitted', () => {
      expect(evalStr('(if (= 1 2) "yes")')).toBe('nil');
    });
  });

  describe('cond', () => {
    it('returns the value of the first true clause', () => {
      expect(evalStr('(cond ((= 1 2) "a") ((= 1 1) "b") (t "c"))')).toBe('b');
    });

    it('returns the value of the t clause (default) when all clauses are false', () => {
      expect(evalStr('(cond ((= 1 2) "a") (t "default"))')).toBe('default');
    });
  });

  describe('quote', () => {
    it('returns a symbol without evaluating it', () => {
      expect(evalStr('(quote foo)')).toBe('foo');
    });

    it('returns a list without evaluating it', () => {
      expect(evalStr('(quote (1 2 3))')).toBe('(1 2 3)');
    });

    it("behaves the same with the 'x shortcut", () => {
      expect(evalStr("'foo")).toBe('foo');
    });
  });

  describe('when', () => {
    it('evaluates the body when the condition is true', () => {
      expect(evalStr('(when (= 1 1) "yes")')).toBe('yes');
    });

    it('returns nil when the condition is false', () => {
      expect(evalStr('(when (= 1 2) "yes")')).toBe('nil');
    });
  });

  describe('unless', () => {
    it('evaluates the body when the condition is false', () => {
      expect(evalStr('(unless (= 1 2) "yes")')).toBe('yes');
    });

    it('returns nil when the condition is true', () => {
      expect(evalStr('(unless (= 1 1) "yes")')).toBe('nil');
    });
  });

  describe('dolist', () => {
    it('evaluates the body for each element of the list', () => {
      const interpreter = new LispInterpreter();
      interpreter.evalString('(setq sum 0)');
      interpreter.evalString("(dolist (x '(1 2 3 4 5)) (setq sum (+ sum x)))");
      expect(Cons.toString(interpreter.evalString('sum'))).toBe('15');
    });
  });

  describe('function application', () => {
    it('applies a built-in function', () => {
      expect(evalStr('(+ 1 2 3)')).toBe('6');
    });

    it('applies a user-defined function', () => {
      expect(evalStr('(defun double (x) (* x 2)) (double 7)')).toBe('14');
    });

    it('evaluates nested function calls', () => {
      expect(evalStr('(+ (* 2 3) (- 10 4))')).toBe('12');
    });
  });

  describe('variable scope', () => {
    it('confines lambda parameters to a local binding', () => {
      const interpreter = new LispInterpreter();
      interpreter.evalString(SETQ_X_100);
      interpreter.evalString('((lambda (x) x) 1)');
      expect(Cons.toString(interpreter.evalString('x'))).toBe(ONE_HUNDRED);
    });

    it('confines let bindings to the local scope', () => {
      const interpreter = new LispInterpreter();
      interpreter.evalString(SETQ_X_100);
      interpreter.evalString('(let ((x 1)) x)');
      expect(Cons.toString(interpreter.evalString('x'))).toBe(ONE_HUNDRED);
    });
  });
});
