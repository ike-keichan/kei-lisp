import { describe, expect, it } from 'vitest';

import { Cons } from '../Cons/index.js';
import { ExitError } from '../ExitError/index.js';
import { LispInterpreter } from './index.js';

// LispInterpreter のコンストラクタが readline インターフェースを作るため、
// 多数インスタンス化する単体テストで MaxListenersExceededWarning が出るのを抑制する。
// Round 13 で REPL とインタプリタの責務分離を行えば不要になる。
process.stdin.setMaxListeners(100);

const evalStr = (src: string): string => {
  const interpreter = new LispInterpreter();
  return Cons.toString(interpreter.evalString(src));
};

describe('LispInterpreter', () => {
  describe('constructor', () => {
    it('root 環境を初期化する', () => {
      expect(new LispInterpreter().root.isRoot()).toBe(true);
    });

    it('StreamManager を初期化する', () => {
      expect(new LispInterpreter().streamManager).toBeDefined();
    });

    it('組み込み関数のシンボルを登録する', () => {
      const interpreter = new LispInterpreter();
      expect(() => interpreter.evalString("'+")).not.toThrow();
    });
  });

  describe('evalString', () => {
    it('基本算術を評価する', () => {
      expect(evalStr('(+ 1 2 3)')).toBe('6');
    });

    it('リスト操作を評価する', () => {
      expect(evalStr('(car (list 1 2 3))')).toBe('1');
    });

    it('複数式は最後の値を返す', () => {
      expect(evalStr('(+ 1 2) (* 3 4) (- 10 5)')).toBe('5');
    });

    it('空入力なら nil を返す', () => {
      expect(evalStr('')).toBe('nil');
    });

    it('再帰関数を評価する', () => {
      expect(evalStr('(defun fact (n) (if (= n 0) 1 (* n (fact (- n 1))))) (fact 10)')).toBe(
        '3628800',
      );
    });
  });

  describe('evalAll', () => {
    it('複数式の評価結果を配列で返す', () => {
      const interpreter = new LispInterpreter();
      const results = interpreter.evalAll('(+ 1 2) (* 3 4) (- 10 5)');
      expect(results).toEqual([3, 12, 5]);
    });

    it('空入力なら空配列を返す', () => {
      expect(new LispInterpreter().evalAll('').length).toBe(0);
    });

    it('1 式のみなら要素数 1 の配列を返す', () => {
      const results = new LispInterpreter().evalAll('(+ 1 2)');
      expect(results.length).toBe(1);
      expect(results[0]).toBe(3);
    });

    it('副作用 (setq) を伝播する', () => {
      const interpreter = new LispInterpreter();
      const results = interpreter.evalAll('(setq x 100) x');
      expect(results.at(-1)).toBe(100);
    });
  });

  describe('eval', () => {
    it('Cons 式を評価する', () => {
      const interpreter = new LispInterpreter();
      const ast = interpreter.parse('(+ 1 2)') as Cons;
      expect(interpreter.eval(ast.car)).toBe(3);
    });

    it('atom (数値) を評価する', () => {
      const interpreter = new LispInterpreter();
      const ast = interpreter.parse('42') as Cons;
      expect(interpreter.eval(ast.car)).toBe(42);
    });
  });

  describe('parse', () => {
    it('文字列を AST に変換する', () => {
      expect(Cons.isCons(new LispInterpreter().parse('(+ 1 2)'))).toBe(true);
    });

    it('パース失敗時は nil を返す', () => {
      expect(new LispInterpreter().parse('((')).toBe(Cons.nil);
    });
  });

  describe('setRoot', () => {
    it('指定した環境を root として設定する', () => {
      const interpreter = new LispInterpreter();
      const original = interpreter.root;
      interpreter.setRoot(original);
      expect(interpreter.root).toBe(original);
    });
  });

  describe('initializeTable', () => {
    it('組み込みシンボルを多数登録した root テーブルを返す', () => {
      const table = new LispInterpreter().initializeTable();
      expect(table.isRoot()).toBe(true);
      expect(table.size).toBeGreaterThan(10);
    });
  });

  describe('リグレッション', () => {
    it('Round 4-J-3: ネスト let の内側 setq は外側に影響しない', () => {
      expect(evalStr('(let ((x 1)) (let ((x 2)) (setq x 100)) x)')).toBe('1');
    });

    it('Round 6: (format "~5a" ...) でクラッシュしない', () => {
      expect(() => evalStr('(format "~5a" "hi")')).not.toThrow();
    });

    it('Round 4-A: 文字列要素を含むリストをクォート無しで表示する', () => {
      expect(evalStr('(list "a" "b" "c")')).toBe('(a b c)');
    });

    it('Round 4-C: 絵文字を含む文字列を保全する', () => {
      const result = new LispInterpreter().evalString('"Hello 😀"');
      expect(result).toBe('Hello 😀');
    });

    it('Round 4-C: 日本語文字列を保全する', () => {
      const result = new LispInterpreter().evalString('"こんにちは"');
      expect(result).toBe('こんにちは');
    });
  });

  describe('ExitError 統合', () => {
    it('(exit) を eval すると ExitError を throw する', () => {
      const interpreter = new LispInterpreter();
      const ast = interpreter.parse('(exit)') as Cons;
      expect(() => interpreter.eval(ast.car)).toThrow(ExitError);
    });
  });
});
