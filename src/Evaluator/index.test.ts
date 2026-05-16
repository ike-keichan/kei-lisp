import { describe, expect, it } from 'vitest';

import { Cons } from '../Cons/index.js';
import { LispInterpreter } from '../LispInterpreter/index.js';

process.stdin.setMaxListeners(100);

const evalStr = (src: string): string => {
  const interpreter = new LispInterpreter();
  const result = interpreter.evalString(src);
  return Cons.toString(result);
};

describe('Evaluator', () => {
  describe('atom 評価', () => {
    it('数値はそのまま', () => {
      expect(evalStr('42')).toBe('42');
    });

    it('文字列はそのまま', () => {
      expect(evalStr('"hello"')).toBe('hello');
    });

    it('nil は nil', () => {
      expect(evalStr('nil')).toBe('nil');
    });

    it('t は t (自己評価シンボル)', () => {
      expect(evalStr('t')).toBe('t');
    });
  });

  describe('特殊形式: setq', () => {
    it('シンボルに値を束縛', () => {
      const interpreter = new LispInterpreter();
      interpreter.evalString('(setq x 42)');
      expect(Cons.toString(interpreter.evalString('x'))).toBe('42');
    });

    it('既存束縛を更新', () => {
      const interpreter = new LispInterpreter();
      interpreter.evalString('(setq x 1)');
      interpreter.evalString('(setq x 2)');
      expect(Cons.toString(interpreter.evalString('x'))).toBe('2');
    });
  });

  describe('特殊形式: let', () => {
    it('局所変数で式を評価', () => {
      expect(evalStr('(let ((x 10) (y 20)) (+ x y))')).toBe('30');
    });

    it('束縛は並列 (let* と異なる)', () => {
      // let では右辺で他の束縛を参照できない
      const interpreter = new LispInterpreter();
      interpreter.evalString('(setq x 100)');
      // 外側 x = 100 を参照、新規束縛 x は別物
      expect(Cons.toString(interpreter.evalString('(let ((x 1) (y x)) y)'))).toBe('100');
    });

    it('let 内で setq しても let の束縛が更新される', () => {
      expect(evalStr('(let ((x 1)) (setq x 99) x)')).toBe('99');
    });

    it('Round 4-J-3: ネスト let の shadowing', () => {
      expect(evalStr('(let ((x 1)) (let ((x 2)) (setq x 100) x))')).toBe('100');
    });

    it('Round 4-J-3: 内側 setq は外側に影響なし', () => {
      expect(evalStr('(let ((x 1)) (let ((x 2)) (setq x 100)) x)')).toBe('1');
    });
  });

  describe('特殊形式: lambda', () => {
    it('即時実行', () => {
      expect(evalStr('((lambda (x y) (+ x y)) 3 4)')).toBe('7');
    });

    it('クロージャ的に動く', () => {
      const interpreter = new LispInterpreter();
      interpreter.evalString('(setq f (lambda (x) (* x 2)))');
      expect(Cons.toString(interpreter.evalString('(f 5)'))).toBe('10');
    });
  });

  describe('特殊形式: defun', () => {
    it('関数を定義して呼び出せる', () => {
      const interpreter = new LispInterpreter();
      interpreter.evalString('(defun double (x) (* x 2))');
      expect(Cons.toString(interpreter.evalString('(double 5)'))).toBe('10');
    });

    it('再帰関数 (fact)', () => {
      expect(evalStr('(defun fact (n) (if (= n 0) 1 (* n (fact (- n 1))))) (fact 10)')).toBe(
        '3628800',
      );
    });

    it('再帰関数 (fib)', () => {
      expect(
        evalStr('(defun fib (n) (if (< n 2) n (+ (fib (- n 1)) (fib (- n 2))))) (fib 10)'),
      ).toBe('55');
    });
  });

  describe('特殊形式: if', () => {
    it('真の場合は then 節', () => {
      expect(evalStr('(if (= 1 1) "yes" "no")')).toBe('yes');
    });

    it('偽の場合は else 節', () => {
      expect(evalStr('(if (= 1 2) "yes" "no")')).toBe('no');
    });

    it('else 節省略時、偽なら nil', () => {
      expect(evalStr('(if (= 1 2) "yes")')).toBe('nil');
    });
  });

  describe('特殊形式: cond', () => {
    it('最初に真になる節の値', () => {
      expect(evalStr('(cond ((= 1 2) "a") ((= 1 1) "b") (t "c"))')).toBe('b');
    });

    it('全て偽なら t 節', () => {
      expect(evalStr('(cond ((= 1 2) "a") ((= 1 3) "b") (t "default"))')).toBe('default');
    });
  });

  describe('特殊形式: quote', () => {
    it('評価せず返す (シンボル)', () => {
      expect(evalStr('(quote foo)')).toBe('foo');
    });

    it('評価せず返す (リスト)', () => {
      expect(evalStr('(quote (1 2 3))')).toBe('(1 2 3)');
    });

    it("'x ショートカット", () => {
      expect(evalStr("'foo")).toBe('foo');
    });
  });

  describe('特殊形式: when / unless', () => {
    it('when: 条件真で本体評価', () => {
      expect(evalStr('(when (= 1 1) "yes")')).toBe('yes');
    });

    it('when: 条件偽で nil', () => {
      expect(evalStr('(when (= 1 2) "yes")')).toBe('nil');
    });

    it('unless: 条件偽で本体評価', () => {
      expect(evalStr('(unless (= 1 2) "yes")')).toBe('yes');
    });

    it('unless: 条件真で nil', () => {
      expect(evalStr('(unless (= 1 1) "yes")')).toBe('nil');
    });
  });

  describe('特殊形式: dolist', () => {
    it('リストの各要素で本体を評価', () => {
      const interpreter = new LispInterpreter();
      interpreter.evalString('(setq sum 0)');
      interpreter.evalString("(dolist (x '(1 2 3 4 5)) (setq sum (+ sum x)))");
      expect(Cons.toString(interpreter.evalString('sum'))).toBe('15');
    });
  });

  describe('関数適用', () => {
    it('組み込み関数の適用', () => {
      expect(evalStr('(+ 1 2 3)')).toBe('6');
    });

    it('ユーザー定義関数の適用', () => {
      expect(evalStr('(defun double (x) (* x 2)) (double 7)')).toBe('14');
    });

    it('入れ子関数呼び出し', () => {
      expect(evalStr('(+ (* 2 3) (- 10 4))')).toBe('12');
    });
  });

  describe('変数のスコープ', () => {
    it('lambda の引数は局所', () => {
      const interpreter = new LispInterpreter();
      interpreter.evalString('(setq x 100)');
      interpreter.evalString('((lambda (x) x) 1)'); // 内側 x は局所
      expect(Cons.toString(interpreter.evalString('x'))).toBe('100');
    });

    it('let の束縛は局所', () => {
      const interpreter = new LispInterpreter();
      interpreter.evalString('(setq x 100)');
      interpreter.evalString('(let ((x 1)) x)');
      expect(Cons.toString(interpreter.evalString('x'))).toBe('100');
    });
  });
});
