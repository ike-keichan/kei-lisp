import { describe, expect, it } from 'vitest';

import { Cons } from '../value/Cons/index.js';
import { ExitError } from '../runtime/ExitError/index.js';
import { LispInterpreter } from './index.js';

// The LispInterpreter constructor creates a readline interface, so unit tests that instantiate
// many interpreters trigger MaxListenersExceededWarning. Bumping the limit suppresses it.
// This workaround becomes unnecessary once Round 13 separates REPL and interpreter concerns.
process.stdin.setMaxListeners(100);

const evalStr = (src: string): string => {
  const interpreter = new LispInterpreter();
  return Cons.toString(interpreter.evalString(src));
};

describe('LispInterpreter', () => {
  describe('constructor', () => {
    it('initializes the root environment', () => {
      expect(new LispInterpreter().root.isRoot()).toBe(true);
    });

    it('initializes the StreamManager', () => {
      expect(new LispInterpreter().streamManager).toBeDefined();
    });

    it('registers built-in function symbols', () => {
      const interpreter = new LispInterpreter();
      expect(() => interpreter.evalString("'+")).not.toThrow();
    });
  });

  describe('evalString', () => {
    it('evaluates basic arithmetic', () => {
      expect(evalStr('(+ 1 2 3)')).toBe('6');
    });

    it('evaluates list operations', () => {
      expect(evalStr('(car (list 1 2 3))')).toBe('1');
    });

    it('returns the value of the last expression for multiple expressions', () => {
      expect(evalStr('(+ 1 2) (* 3 4) (- 10 5)')).toBe('5');
    });

    it('returns nil for empty input', () => {
      expect(evalStr('')).toBe('nil');
    });

    it('evaluates a recursive function', () => {
      expect(evalStr('(defun fact (n) (if (= n 0) 1 (* n (fact (- n 1))))) (fact 10)')).toBe(
        '3628800',
      );
    });
  });

  describe('evalAll', () => {
    it('returns the evaluation results of multiple expressions as an array', () => {
      const interpreter = new LispInterpreter();
      const results = interpreter.evalAll('(+ 1 2) (* 3 4) (- 10 5)');
      expect(results).toEqual([3, 12, 5]);
    });

    it('returns an empty array for empty input', () => {
      expect(new LispInterpreter().evalAll('').length).toBe(0);
    });

    it('returns a single-element array for a single expression', () => {
      const results = new LispInterpreter().evalAll('(+ 1 2)');
      expect(results.length).toBe(1);
      expect(results[0]).toBe(3);
    });

    it('propagates side effects (setq)', () => {
      const interpreter = new LispInterpreter();
      const results = interpreter.evalAll('(setq x 100) x');
      expect(results.at(-1)).toBe(100);
    });
  });

  describe('eval', () => {
    it('evaluates a Cons expression', () => {
      const interpreter = new LispInterpreter();
      const ast = interpreter.parse('(+ 1 2)') as Cons;
      expect(interpreter.eval(ast.car)).toBe(3);
    });

    it('evaluates an atom (number)', () => {
      const interpreter = new LispInterpreter();
      const ast = interpreter.parse('42') as Cons;
      expect(interpreter.eval(ast.car)).toBe(42);
    });
  });

  describe('parse', () => {
    it('converts a string into an AST', () => {
      expect(Cons.isCons(new LispInterpreter().parse('(+ 1 2)'))).toBe(true);
    });

    it('returns nil on parse failure', () => {
      expect(new LispInterpreter().parse('((')).toBe(Cons.nil);
    });
  });

  describe('setRoot', () => {
    it('sets the given environment as the root', () => {
      const interpreter = new LispInterpreter();
      const original = interpreter.root;
      interpreter.setRoot(original);
      expect(interpreter.root).toBe(original);
    });
  });

  describe('initializeTable', () => {
    it('returns a root table populated with many built-in symbols', () => {
      const table = new LispInterpreter().initializeTable();
      expect(table.isRoot()).toBe(true);
      expect(table.size).toBeGreaterThan(10);
    });
  });

  describe('regressions', () => {
    it('Round 4-J-3: setq inside nested let does not affect the outer binding', () => {
      expect(evalStr('(let ((x 1)) (let ((x 2)) (setq x 100)) x)')).toBe('1');
    });

    it('Round 6: does not crash on (format "~5a" ...)', () => {
      expect(() => evalStr('(format "~5a" "hi")')).not.toThrow();
    });

    it('Round 4-A: displays a list of strings without quoting the elements', () => {
      expect(evalStr('(list "a" "b" "c")')).toBe('(a b c)');
    });

    it('Round 4-C: preserves a string containing emoji', () => {
      const result = new LispInterpreter().evalString('"Hello 😀"');
      expect(result).toBe('Hello 😀');
    });

    it('Round 4-C: preserves a Japanese string', () => {
      const result = new LispInterpreter().evalString('"こんにちは"');
      expect(result).toBe('こんにちは');
    });
  });

  describe('ExitError integration', () => {
    it('throws ExitError when (exit) is evaluated', () => {
      const interpreter = new LispInterpreter();
      const ast = interpreter.parse('(exit)') as Cons;
      expect(() => interpreter.eval(ast.car)).toThrow(ExitError);
    });
  });
});
