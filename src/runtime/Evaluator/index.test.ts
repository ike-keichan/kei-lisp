import { describe, expect, it } from 'vitest';

import { Cons } from '../../value/Cons/index.js';
import { InterpretedSymbol } from '../../value/InterpretedSymbol/index.js';
import { LispInterpreter } from '../../interpreter/LispInterpreter/index.js';
import { StreamManager } from '../StreamManager/index.js';
import { Table } from '../Table/index.js';
import { Evaluator } from './index.js';

const evalStr = (src: string): string => {
  const interpreter = new LispInterpreter();
  return Cons.toString(interpreter.evalString(src));
};

const newEvaluator = (): Evaluator => new Evaluator(new Table(), new StreamManager(), 0);

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

  describe('progn', () => {
    it('evaluates body forms in sequence and returns the last value', () => {
      expect(evalStr('(progn 1 2 3)')).toBe('3');
    });

    it('returns the value of a single form', () => {
      expect(evalStr('(progn 42)')).toBe('42');
    });

    it('returns nil for an empty body', () => {
      expect(evalStr('(progn)')).toBe('nil');
    });

    it('applies side effects (setq) in order', () => {
      const interpreter = new LispInterpreter();
      interpreter.evalString('(setq x 0)');
      interpreter.evalString('(progn (setq x 1) (setq x 2) (setq x 3))');
      expect(Cons.toString(interpreter.evalString('x'))).toBe('3');
    });

    it('does not introduce a new scope (setq within progn affects outer binding)', () => {
      const interpreter = new LispInterpreter();
      interpreter.evalString('(setq x 1)');
      interpreter.evalString('(progn (setq x 99))');
      expect(Cons.toString(interpreter.evalString('x'))).toBe('99');
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

    it('setq inside nested let updates the inner binding', () => {
      expect(evalStr('(let ((x 1)) (let ((x 2)) (setq x 100) x))')).toBe(ONE_HUNDRED);
    });

    it('setq inside nested let does not affect the outer binding', () => {
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

  describe('gc', () => {
    it('returns an alist with three entries', () => {
      const result = newEvaluator().gc();
      expect(result.length()).toBe(3);
    });

    it('exposes heap-used via (assoc) lookup', () => {
      const interpreter = new LispInterpreter();
      const pair = interpreter.evalString("(assoc 'heap-used (gc))") as Cons;
      expect(pair.car).toBe(InterpretedSymbol.of('heap-used'));
      expect(typeof pair.cdr).toBe('number');
      expect(pair.cdr as number).toBeGreaterThan(0);
    });

    it('exposes heap-total and rss as positive numbers', () => {
      const interpreter = new LispInterpreter();
      const heapTotal = interpreter.evalString("(cdr (assoc 'heap-total (gc)))");
      const rss = interpreter.evalString("(cdr (assoc 'rss (gc)))");
      expect(typeof heapTotal).toBe('number');
      expect(heapTotal as number).toBeGreaterThan(0);
      expect(typeof rss).toBe('number');
      expect(rss as number).toBeGreaterThan(0);
    });
  });

  describe('spyPrint', () => {
    it('writes the indented line followed by newline to the given WritableStream', () => {
      const chunks: string[] = [];
      const mockStream = {
        write: (chunk: string): boolean => {
          chunks.push(chunk);
          return true;
        },
      } as unknown as NodeJS.WritableStream;
      newEvaluator().spyPrint(mockStream, 'hello');
      expect(chunks.join('')).toBe('hello\n');
    });

    it('falls back to stdout when the argument is a string descriptor', () => {
      expect(() => newEvaluator().spyPrint('some-label', 'hello')).not.toThrow();
    });

    it('falls back to stdout when the argument is null', () => {
      expect(() => newEvaluator().spyPrint(null, 'hello')).not.toThrow();
    });

    it('returns null', () => {
      expect(newEvaluator().spyPrint(null, 'x')).toBeNull();
    });
  });

  describe('quasiquote', () => {
    it('returns the template unchanged when there are no unquotes', () => {
      expect(evalStr('`(a b c)')).toBe('(a b c)');
    });

    it('substitutes an unquoted value', () => {
      expect(evalStr('(let ((x 5)) `(a ,x c))')).toBe('(a 5 c)');
    });

    it('evaluates an unquoted expression', () => {
      expect(evalStr('`(sum ,(+ 1 2 3))')).toBe('(sum 6)');
    });

    it('splices a list with unquote-splicing', () => {
      expect(evalStr('(let ((xs (list 1 2 3))) `(a ,@xs z))')).toBe('(a 1 2 3 z)');
    });

    it('splices nil as nothing', () => {
      expect(evalStr('`(a ,@nil b)')).toBe('(a b)');
    });

    it('substitutes a dotted unquote tail', () => {
      expect(evalStr('(let ((b 9)) `(a . ,b))')).toBe('(a . 9)');
    });

    it('preserves inner unquotes across a nested quasiquote', () => {
      expect(evalStr('(let ((x 1)) `(a `(b ,(+ 1 ,x))))')).toBe(
        '(a (quasiquote (b (unquote (+ 1 1)))))',
      );
    });

    it('signals an error for a bare unquote outside quasiquote', () => {
      expect(() => evalStr(',x')).toThrow();
    });

    it('signals an error when splicing a non-list', () => {
      expect(() => evalStr('`(a ,@5)')).toThrow();
    });

    it('signals an error when splicing an improper (dotted) list', () => {
      expect(() => evalStr('`(a ,@(cons 1 2) b)')).toThrow();
    });
  });

  describe('defmacro', () => {
    it('returns the macro name', () => {
      expect(evalStr('(defmacro noop () nil)')).toBe('noop');
    });

    it('defines a macro that controls evaluation of its arguments', () => {
      expect(
        evalStr(
          '(progn (defmacro my-when (c . body) `(if ,c (progn ,@body) nil)) (my-when t 1 2 3))',
        ),
      ).toBe('3');
    });

    it('does not evaluate arguments on the non-taken branch', () => {
      const interpreter = new LispInterpreter();
      interpreter.evalString('(defmacro my-when (c . body) `(if ,c (progn ,@body) nil))');
      interpreter.evalString('(setq x 0)');
      interpreter.evalString('(my-when nil (setq x 99))');
      expect(Cons.toString(interpreter.evalString('x'))).toBe('0');
    });

    it('expands macros used inside a defun body', () => {
      expect(evalStr('(progn (defmacro dbl (x) `(* 2 ,x)) (defun f (n) (dbl n)) (f 21))')).toBe(
        '42',
      );
    });

    it('cooperates with gensym to avoid variable capture', () => {
      expect(
        evalStr(
          '(progn (defmacro sq (e) (let ((g (gensym))) `(let ((,g ,e)) (* ,g ,g)))) (let ((tmp 7)) (sq tmp)))',
        ),
      ).toBe('49');
    });
  });

  describe('case', () => {
    it('runs the clause whose single key matches', () => {
      expect(evalStr("(case 1 (1 'one) (2 'two))")).toBe('one');
    });

    it('runs the clause whose key list contains the key', () => {
      expect(evalStr("(case 3 (1 'one) ((2 3) 'two-or-three))")).toBe('two-or-three');
    });

    it('matches symbol keys without evaluating them', () => {
      expect(evalStr("(case 'foo ((bar foo) 42))")).toBe('42');
    });

    it('runs the otherwise clause when no key matches', () => {
      expect(evalStr("(case 9 (1 'one) (otherwise 'other))")).toBe('other');
    });

    it('runs the t clause when no key matches', () => {
      expect(evalStr("(case 9 (1 'one) (t 'fallback))")).toBe('fallback');
    });

    it('returns nil when no clause matches', () => {
      expect(evalStr("(case 9 (1 'one))")).toBe('nil');
    });

    it('returns the value of the last body form of the matching clause', () => {
      expect(evalStr('(case 1 (1 10 20 30))')).toBe('30');
    });

    it('returns nil for a matching clause with an empty body', () => {
      expect(evalStr('(case 1 (1))')).toBe('nil');
    });
  });

  describe('setf', () => {
    it('assigns to a variable like setq', () => {
      expect(evalStr('(progn (setf x 42) x)')).toBe('42');
    });

    it('assigns to a car place', () => {
      expect(evalStr('(progn (setq x (list 1 2)) (setf (car x) 9) x)')).toBe('(9 2)');
    });

    it('assigns to a cdr place', () => {
      expect(evalStr('(progn (setq x (list 1 2)) (setf (cdr x) (list 8)) x)')).toBe('(1 8)');
    });

    it('assigns to a nth place using the 1-based index of nth', () => {
      expect(evalStr('(progn (setq x (list 1 2 3)) (setf (nth 2 x) 9) x)')).toBe('(1 9 3)');
    });

    it('assigns to an elt place using a zero-based index', () => {
      expect(evalStr('(progn (setq x (list 1 2 3)) (setf (elt x 0) 9) x)')).toBe('(9 2 3)');
    });

    it('updates an existing property through a getf place', () => {
      expect(evalStr("(progn (setq pl (list 'a 1)) (setf (getf pl 'a) 9) (getf pl 'a))")).toBe('9');
    });

    it('appends a new property through a getf place', () => {
      expect(evalStr("(progn (setq pl (list 'a 1)) (setf (getf pl 'b) 2) pl)")).toBe('(a 1 b 2)');
    });

    it('rebinds the symbol when the getf place holds an empty property list', () => {
      expect(evalStr("(progn (setq pl nil) (setf (getf pl 'a) 1) pl)")).toBe('(a 1)');
    });

    it('assigns multiple places and returns the last value', () => {
      expect(evalStr('(progn (setq x (list 1 2)) (setf (car x) 8 (nth 2 x) 9))')).toBe('9');
    });

    it('throws EvalError for an unsupported place', () => {
      expect(() => evalStr('(setf (+ 1 2) 3)')).toThrow('Can not apply "setf"');
    });
  });

  describe('incf / decf', () => {
    it('incf increments a variable by 1 by default', () => {
      expect(evalStr('(progn (setq n 10) (incf n))')).toBe('11');
    });

    it('incf increments by the given delta', () => {
      expect(evalStr('(progn (setq n 10) (incf n 5))')).toBe('15');
    });

    it('decf decrements a variable by 1 by default', () => {
      expect(evalStr('(progn (setq n 10) (decf n))')).toBe('9');
    });

    it('decf decrements by the given delta', () => {
      expect(evalStr('(progn (setq n 10) (decf n 3))')).toBe('7');
    });

    it('incf works on a car place', () => {
      expect(evalStr('(progn (setq x (list 1 2)) (incf (car x)) x)')).toBe('(2 2)');
    });

    it('throws EvalError when the place value is not a number', () => {
      expect(() => evalStr("(progn (setq n 'a) (incf n))")).toThrow('Can not apply "incf"');
    });
  });

  describe('push / pop on places', () => {
    it('push prepends onto a cdr place', () => {
      expect(evalStr('(progn (setq x (list 1 2)) (push 7 (cdr x)) x)')).toBe('(1 7 2)');
    });

    it('pop removes from a car place holding a list', () => {
      expect(evalStr('(progn (setq x (list (list 1 2) 3)) (pop (car x)) x)')).toBe('((2) 3)');
    });

    it('pop returns nil when the place value is not a Cons', () => {
      expect(evalStr('(progn (setq n 5) (pop n))')).toBe('nil');
    });
  });

  describe('destructuring-bind', () => {
    it('binds a flat pattern', () => {
      expect(evalStr("(destructuring-bind (a b) '(1 2) (list b a))")).toBe('(2 1)');
    });

    it('binds a nested pattern', () => {
      expect(evalStr("(destructuring-bind (a (b c)) '(1 (2 3)) (list a b c))")).toBe('(1 2 3)');
    });

    it('binds a dotted rest pattern', () => {
      expect(evalStr("(destructuring-bind (a . rest) '(1 2 3) rest)")).toBe('(2 3)');
    });

    it('throws EvalError when the value has too few elements', () => {
      expect(() => evalStr("(destructuring-bind (a b) '(1) b)")).toThrow('sizes do not match');
    });

    it('throws EvalError when the value has too many elements', () => {
      expect(() => evalStr("(destructuring-bind (a) '(1 2) a)")).toThrow('sizes do not match');
    });
  });

  describe('defstruct', () => {
    it('returns the struct name symbol', () => {
      expect(evalStr('(defstruct point x y)')).toBe('point');
    });

    it('generates a positional constructor', () => {
      expect(evalStr('(progn (defstruct point x y) (make-point 3 4))')).toBe('(point 3 4)');
    });

    it('generates one accessor per field', () => {
      expect(evalStr('(progn (defstruct point x y) (setq p (make-point 3 4)) (point-y p))')).toBe(
        '4',
      );
    });

    it('generates a predicate that accepts instances', () => {
      expect(evalStr('(progn (defstruct point x y) (point-p (make-point 3 4)))')).toBe('t');
    });

    it('generates a predicate that rejects other values', () => {
      expect(evalStr('(progn (defstruct point x y) (point-p 5))')).toBe('nil');
    });

    it('registers accessors as setf places', () => {
      expect(
        evalStr(
          '(progn (defstruct point x y) (setq p (make-point 3 4)) (setf (point-x p) 30) (point-x p))',
        ),
      ).toBe('30');
    });
  });

  describe('with-output-to-string', () => {
    it('captures princ output as a string', () => {
      expect(evalStr("(with-output-to-string () (princ 1) (princ 'a))")).toBe('1a');
    });

    it('captures print output including the trailing newline', () => {
      expect(evalStr('(with-output-to-string () (print 1))')).toBe('1\n');
    });

    it('captures terpri output', () => {
      expect(evalStr('(with-output-to-string () (terpri))')).toBe('\n');
    });

    it('captures format output', () => {
      expect(evalStr('(with-output-to-string () (format "~a!" 7))')).toBe('7!');
    });

    it('returns an empty string for an empty body', () => {
      expect(evalStr('(with-output-to-string ())')).toBe('');
    });

    it('supports nested captures', () => {
      expect(
        evalStr(
          '(with-output-to-string () (princ 1) (princ (with-output-to-string () (princ 2))))',
        ),
      ).toBe('12');
    });
  });

  describe('catch / throw', () => {
    it('returns the body value when nothing is thrown', () => {
      expect(evalStr("(catch 'tag 1 2 3)")).toBe('3');
    });

    it('returns the thrown value for a matching tag', () => {
      expect(evalStr("(catch 'tag 1 (throw 'tag 42) 3)")).toBe('42');
    });

    it('unwinds through nested function calls', () => {
      expect(evalStr("(defun inner () (throw 'done 7)) (catch 'done (inner) 'not-reached)")).toBe(
        '7',
      );
    });

    it('passes a throw with a different tag to the outer catch', () => {
      expect(evalStr("(catch 'outer (catch 'inner (throw 'outer 1) 2) 3)")).toBe('1');
    });

    it('throws EvalError when no catch matches the tag', () => {
      expect(() => evalStr("(throw 'nowhere 1)")).toThrow('no catch for tag nowhere');
    });
  });

  describe('handler-case', () => {
    it('returns the protected form value when no error is signaled', () => {
      expect(evalStr('(handler-case (+ 1 2) (error (e) 99))')).toBe('3');
    });

    it('runs the error clause when the protected form signals', () => {
      expect(evalStr('(handler-case (error "boom") (error (e) 99))')).toBe('99');
    });

    it('binds the clause variable to the error message', () => {
      expect(evalStr('(handler-case (error "boom ~a" 1) (error (e) e))')).toBe('boom 1');
    });

    it('matches an eval-error clause for evaluation failures', () => {
      expect(evalStr('(handler-case (undefined-fn) (eval-error (e) 1))')).toBe('1');
    });

    it('skips non-matching clauses and uses the first matching one', () => {
      expect(evalStr('(handler-case (error "x") (parse-error (e) 1) (error (e) 2))')).toBe('2');
    });

    it('rethrows when no clause matches', () => {
      expect(() => evalStr('(handler-case (error "x") (parse-error (e) 1))')).toThrow('x');
    });

    it('does not intercept a throw to an outer catch', () => {
      expect(evalStr("(catch 'tag (handler-case (throw 'tag 5) (error (e) 99)))")).toBe('5');
    });

    it('supports a clause without a variable list body', () => {
      expect(evalStr('(handler-case (error "x") (error () \'handled))')).toBe('handled');
    });
  });

  describe('error', () => {
    it('signals an EvalError with the given message', () => {
      expect(() => evalStr('(error "custom failure")')).toThrow('custom failure');
    });

    it('formats the message with format directives', () => {
      expect(() => evalStr('(error "bad value: ~a" 42)')).toThrow('bad value: 42');
    });
  });

  describe('tail call optimization', () => {
    it('runs deep self-recursion in tail position without stack overflow', () => {
      expect(
        evalStr("(defun loop-n (n) (if (= n 0) 'done (loop-n (- n 1)))) (loop-n 100000)"),
      ).toBe('done');
    });

    it('runs deep mutual recursion in tail position without stack overflow', () => {
      expect(
        evalStr(
          '(defun my-even (n) (if (= n 0) t (my-odd (- n 1)))) (defun my-odd (n) (if (= n 0) nil (my-even (- n 1)))) (my-even 100000)',
        ),
      ).toBe('t');
    });

    it('optimizes tail calls inside cond', () => {
      expect(
        evalStr("(defun loop-c (n) (cond ((= n 0) 'done) (t (loop-c (- n 1))))) (loop-c 100000)"),
      ).toBe('done');
    });

    it('optimizes tail calls inside progn and let', () => {
      expect(
        evalStr(
          "(defun loop-l (n) (if (= n 0) 'done (progn 1 (let ((m (- n 1))) (loop-l m))))) (loop-l 100000)",
        ),
      ).toBe('done');
    });

    it('optimizes tail calls inside when and case', () => {
      expect(
        evalStr(
          "(defun loop-w (n) (case n (0 'done) (t (when t (loop-w (- n 1)))))) (loop-w 100000)",
        ),
      ).toBe('done');
    });

    it('accumulates through an argument without growing the stack', () => {
      expect(
        evalStr(
          '(defun sum-acc (n acc) (if (= n 0) acc (sum-acc (- n 1) (+ acc n)))) (sum-acc 100000 0)',
        ),
      ).toBe('5000050000');
    });

    it('still returns correct values for non-tail recursion', () => {
      expect(evalStr('(defun fact (n) (if (= n 0) 1 (* n (fact (- n 1))))) (fact 10)')).toBe(
        '3628800',
      );
    });
  });

  describe('macroexpand', () => {
    it('macroexpand-1 expands a macro call exactly once without evaluating it', () => {
      expect(
        evalStr(
          "(progn (defmacro my-when (c . body) `(if ,c (progn ,@body) nil)) (macroexpand-1 '(my-when t 1 2)))",
        ),
      ).toBe('(if t (progn 1 2) nil)');
    });

    it('macroexpand-1 returns a non-macro form unchanged', () => {
      expect(evalStr("(macroexpand-1 '(+ 1 2))")).toBe('(+ 1 2)');
    });

    it('macroexpand repeatedly expands the top-level form', () => {
      expect(
        evalStr(
          "(progn (defmacro inc (x) `(+ ,x 1)) (defmacro inc2 (x) `(inc (inc ,x))) (macroexpand '(inc2 5)))",
        ),
      ).toBe('(+ (inc 5) 1)');
    });
  });
});
