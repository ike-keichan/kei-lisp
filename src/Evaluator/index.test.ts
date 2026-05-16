import { describe, expect, it } from 'vitest';

import { Cons } from '../Cons/index.js';
import { LispInterpreter } from '../LispInterpreter/index.js';

process.stdin.setMaxListeners(100);

const evalStr = (src: string): string => {
  const interpreter = new LispInterpreter();
  return Cons.toString(interpreter.evalString(src));
};

const ONE_HUNDRED = '100';
const SETQ_X_100 = '(setq x 100)';

describe('Evaluator', () => {
  describe('atom 評価', () => {
    it('数値リテラルをそのまま返す', () => {
      expect(evalStr('42')).toBe('42');
    });

    it('文字列リテラルをそのまま返す', () => {
      expect(evalStr('"hello"')).toBe('hello');
    });

    it('nil を nil として返す', () => {
      expect(evalStr('nil')).toBe('nil');
    });

    it('t を自己評価シンボルとして返す', () => {
      expect(evalStr('t')).toBe('t');
    });
  });

  describe('setq', () => {
    it('シンボルに値を束縛する', () => {
      const interpreter = new LispInterpreter();
      interpreter.evalString('(setq x 42)');
      expect(Cons.toString(interpreter.evalString('x'))).toBe('42');
    });

    it('既存束縛を上書きする', () => {
      const interpreter = new LispInterpreter();
      interpreter.evalString('(setq x 1)');
      interpreter.evalString('(setq x 2)');
      expect(Cons.toString(interpreter.evalString('x'))).toBe('2');
    });
  });

  describe('let', () => {
    it('局所変数を束縛して本体を評価する', () => {
      expect(evalStr('(let ((x 10) (y 20)) (+ x y))')).toBe('30');
    });

    it('束縛は並列で外側を参照する', () => {
      const interpreter = new LispInterpreter();
      interpreter.evalString(SETQ_X_100);
      expect(Cons.toString(interpreter.evalString('(let ((x 1) (y x)) y)'))).toBe(ONE_HUNDRED);
    });

    it('let 内 setq は let の束縛を更新する', () => {
      expect(evalStr('(let ((x 1)) (setq x 99) x)')).toBe('99');
    });

    it('Round 4-J-3: ネスト let の内側 setq は内側を更新する', () => {
      expect(evalStr('(let ((x 1)) (let ((x 2)) (setq x 100) x))')).toBe(ONE_HUNDRED);
    });

    it('Round 4-J-3: ネスト let の内側 setq は外側に影響しない', () => {
      expect(evalStr('(let ((x 1)) (let ((x 2)) (setq x 100)) x)')).toBe('1');
    });
  });

  describe('lambda', () => {
    it('即時呼び出して値を返す', () => {
      expect(evalStr('((lambda (x y) (+ x y)) 3 4)')).toBe('7');
    });

    it('変数に束縛して後で呼び出せる', () => {
      const interpreter = new LispInterpreter();
      interpreter.evalString('(setq f (lambda (x) (* x 2)))');
      expect(Cons.toString(interpreter.evalString('(f 5)'))).toBe('10');
    });
  });

  describe('defun', () => {
    it('関数を定義して呼び出せる', () => {
      const interpreter = new LispInterpreter();
      interpreter.evalString('(defun double (x) (* x 2))');
      expect(Cons.toString(interpreter.evalString('(double 5)'))).toBe('10');
    });

    it('再帰関数を定義できる (fact)', () => {
      expect(evalStr('(defun fact (n) (if (= n 0) 1 (* n (fact (- n 1))))) (fact 10)')).toBe(
        '3628800',
      );
    });

    it('再帰関数を定義できる (fib)', () => {
      expect(
        evalStr('(defun fib (n) (if (< n 2) n (+ (fib (- n 1)) (fib (- n 2))))) (fib 10)'),
      ).toBe('55');
    });
  });

  describe('if', () => {
    it('条件が真なら then 節を評価する', () => {
      expect(evalStr('(if (= 1 1) "yes" "no")')).toBe('yes');
    });

    it('条件が偽なら else 節を評価する', () => {
      expect(evalStr('(if (= 1 2) "yes" "no")')).toBe('no');
    });

    it('else 節省略時に偽なら nil を返す', () => {
      expect(evalStr('(if (= 1 2) "yes")')).toBe('nil');
    });
  });

  describe('cond', () => {
    it('最初に真になる節の値を返す', () => {
      expect(evalStr('(cond ((= 1 2) "a") ((= 1 1) "b") (t "c"))')).toBe('b');
    });

    it('全て偽なら t 節 (default) の値を返す', () => {
      expect(evalStr('(cond ((= 1 2) "a") (t "default"))')).toBe('default');
    });
  });

  describe('quote', () => {
    it('シンボルを評価せず返す', () => {
      expect(evalStr('(quote foo)')).toBe('foo');
    });

    it('リストを評価せず返す', () => {
      expect(evalStr('(quote (1 2 3))')).toBe('(1 2 3)');
    });

    it("'x ショートカットで同じ動作をする", () => {
      expect(evalStr("'foo")).toBe('foo');
    });
  });

  describe('when', () => {
    it('条件が真なら本体を評価する', () => {
      expect(evalStr('(when (= 1 1) "yes")')).toBe('yes');
    });

    it('条件が偽なら nil を返す', () => {
      expect(evalStr('(when (= 1 2) "yes")')).toBe('nil');
    });
  });

  describe('unless', () => {
    it('条件が偽なら本体を評価する', () => {
      expect(evalStr('(unless (= 1 2) "yes")')).toBe('yes');
    });

    it('条件が真なら nil を返す', () => {
      expect(evalStr('(unless (= 1 1) "yes")')).toBe('nil');
    });
  });

  describe('dolist', () => {
    it('リストの各要素で本体を評価する', () => {
      const interpreter = new LispInterpreter();
      interpreter.evalString('(setq sum 0)');
      interpreter.evalString("(dolist (x '(1 2 3 4 5)) (setq sum (+ sum x)))");
      expect(Cons.toString(interpreter.evalString('sum'))).toBe('15');
    });
  });

  describe('関数適用', () => {
    it('組み込み関数を適用する', () => {
      expect(evalStr('(+ 1 2 3)')).toBe('6');
    });

    it('ユーザー定義関数を適用する', () => {
      expect(evalStr('(defun double (x) (* x 2)) (double 7)')).toBe('14');
    });

    it('入れ子関数呼び出しを評価する', () => {
      expect(evalStr('(+ (* 2 3) (- 10 4))')).toBe('12');
    });
  });

  describe('変数スコープ', () => {
    it('lambda の引数を局所束縛に閉じ込める', () => {
      const interpreter = new LispInterpreter();
      interpreter.evalString(SETQ_X_100);
      interpreter.evalString('((lambda (x) x) 1)');
      expect(Cons.toString(interpreter.evalString('x'))).toBe(ONE_HUNDRED);
    });

    it('let の束縛を局所に閉じ込める', () => {
      const interpreter = new LispInterpreter();
      interpreter.evalString(SETQ_X_100);
      interpreter.evalString('(let ((x 1)) x)');
      expect(Cons.toString(interpreter.evalString('x'))).toBe(ONE_HUNDRED);
    });
  });
});
