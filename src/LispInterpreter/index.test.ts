import { describe, expect, it } from 'vitest';

import { Cons } from '../Cons/index.js';
import { ExitError } from '../ExitError/index.js';
import { LispInterpreter } from './index.js';

// LispInterpreter のコンストラクタが readline インターフェースを作るため、
// 多数インスタンス化する単体テストで MaxListenersExceededWarning が出るのを抑制。
// (Round 13 で REPL とインタプリタの責務分離を行えば不要になる)
process.stdin.setMaxListeners(50);

const evalStr = (src: string): string => {
  const interpreter = new LispInterpreter();
  const result = interpreter.evalString(src);
  return Cons.toString(result);
};

describe('LispInterpreter (公開 API)', () => {
  describe('evalString (Round で追加された API)', () => {
    it('基本算術', () => {
      expect(evalStr('(+ 1 2 3)')).toBe('6');
      expect(evalStr('(- 10 3)')).toBe('7');
      expect(evalStr('(* 4 5)')).toBe('20');
      expect(evalStr('(/ 100 4)')).toBe('25');
    });

    it('リスト操作', () => {
      expect(evalStr('(list 1 2 3)')).toBe('(1 2 3)');
      expect(evalStr('(car (list 1 2 3))')).toBe('1');
      expect(evalStr('(cdr (list 1 2 3))')).toBe('(2 3)');
      expect(evalStr('(cons 1 (list 2 3))')).toBe('(1 2 3)');
    });

    it('let / setq', () => {
      expect(evalStr('(let ((x 10) (y 20)) (+ x y))')).toBe('30');
      expect(evalStr('(let ((x 10)) (setq x 99) x)')).toBe('99');
    });

    it('defun / 再帰', () => {
      expect(evalStr('(defun fact (n) (if (= n 0) 1 (* n (fact (- n 1))))) (fact 10)')).toBe(
        '3628800',
      );
    });

    it('lambda', () => {
      expect(evalStr('((lambda (x y) (+ x y)) 3 4)')).toBe('7');
    });

    it('cond / if', () => {
      expect(evalStr('(if (= 1 1) "yes" "no")')).toBe('yes');
      expect(evalStr('(if (= 1 2) "yes" "no")')).toBe('no');
      expect(evalStr('(cond ((= 1 2) "a") ((= 1 1) "b") (t "c"))')).toBe('b');
    });
  });

  describe('evalAll (Round で追加された API)', () => {
    it('複数式を順に評価して全結果を配列で返す', () => {
      const interpreter = new LispInterpreter();
      const results = interpreter.evalAll('(+ 1 2) (* 3 4) (- 10 5)');
      expect(results.length).toBe(3);
      expect(results[0]).toBe(3);
      expect(results[1]).toBe(12);
      expect(results[2]).toBe(5);
    });

    it('空入力で空配列', () => {
      const interpreter = new LispInterpreter();
      const results = interpreter.evalAll('');
      expect(results.length).toBe(0);
    });

    it('副作用が伝播する (setq の後で評価)', () => {
      const interpreter = new LispInterpreter();
      const results = interpreter.evalAll('(setq x 100) x');
      expect(results.at(-1)).toBe(100);
    });
  });

  describe('リグレッション: Round 4-J-3 (setIfExit shadowing)', () => {
    it('ネスト let で内側 setq は内側スコープのみ更新', () => {
      // (let ((x 1)) (let ((x 2)) (setq x 100) x))
      //   → 内側の x が 100。外側は影響なし。
      // 修正前のバグ: 外側の x も 100 になっていた
      expect(evalStr('(let ((x 1)) (let ((x 2)) (setq x 100) x))')).toBe('100');
    });

    it('ネスト let の外側からアクセスして元の値を確認', () => {
      // (let ((x 1)) (let ((x 2)) (setq x 100)) x)
      //   → 外側の x = 1 (shadowing 後の外側は元の値)
      expect(evalStr('(let ((x 1)) (let ((x 2)) (setq x 100)) x)')).toBe('1');
    });
  });

  describe('リグレッション: Round 6 (format ~Na クラッシュ)', () => {
    it('(format "~5a" "hi") が動く', () => {
      // 修正前: クラッシュ
      // 修正後: "hi   " を返す (cdr に side effect)
      expect(() => evalStr('(format "~5a" "hi")')).not.toThrow();
    });

    it('(format "~-5a" "hi") が動く', () => {
      expect(() => evalStr('(format "~-5a" "hi")')).not.toThrow();
    });

    it('(format "~a" "hi") (元から動く width 無し)', () => {
      expect(() => evalStr('(format "~a" "hi")')).not.toThrow();
    });
  });

  describe('リグレッション: Round 4-A (instanceof String 死分岐削除)', () => {
    it('文字列要素を含むリストの表示が "(a b)" 形 (クォート無し)', () => {
      expect(evalStr('(list "a" "b" "c")')).toBe('(a b c)');
    });
  });

  describe('リグレッション: Round 4-C (Unicode 透過保全)', () => {
    it('絵文字を含む文字列の保全', () => {
      // 修正前: サロゲートペアが破壊された
      const interpreter = new LispInterpreter();
      const result = interpreter.evalString('"Hello 😀"');
      expect(result).toBe('Hello 😀');
    });

    it('日本語文字列の保全', () => {
      const interpreter = new LispInterpreter();
      const result = interpreter.evalString('"こんにちは"');
      expect(result).toBe('こんにちは');
    });
  });

  describe('ExitError', () => {
    it('(exit) で ExitError が throw される', () => {
      const interpreter = new LispInterpreter();
      // eval 経由で呼ぶと内部 catch されるが、Evaluator.exit() 直接呼びは throw
      const ast = interpreter.parse('(exit)') as Cons;
      const exitForm = ast.car;
      // eval を直接呼ぶと ExitError は再 throw される
      expect(() => interpreter.eval(exitForm)).toThrow(ExitError);
    });

    it('ExitError は Error のサブクラス', () => {
      const err = new ExitError();
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(ExitError);
      expect(err.name).toBe('ExitError');
    });
  });

  describe('型ガード (Cons.is*) と LispValue ユニオン', () => {
    it('数値リテラルは number 型として評価される', () => {
      const interpreter = new LispInterpreter();
      expect(interpreter.evalString('42')).toBe(42);
    });

    it('文字列リテラルは string 型として評価される', () => {
      const interpreter = new LispInterpreter();
      expect(interpreter.evalString('"foo"')).toBe('foo');
    });

    it('リストは Cons として評価される', () => {
      const interpreter = new LispInterpreter();
      const result = interpreter.evalString('(list 1 2)');
      expect(Cons.isCons(result)).toBe(true);
    });
  });
});
