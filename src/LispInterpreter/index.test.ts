import { describe, expect, it } from 'vitest';

import { Cons } from '../Cons/index.js';
import { ExitError } from '../ExitError/index.js';
import { LispInterpreter } from './index.js';

// LispInterpreter のコンストラクタが readline インターフェースを作るため、
// 多数インスタンス化する単体テストで MaxListenersExceededWarning が出るのを抑制。
// (Round 13 で REPL とインタプリタの責務分離を行えば不要になる)
process.stdin.setMaxListeners(100);

const evalStr = (src: string): string => {
  const interpreter = new LispInterpreter();
  const result = interpreter.evalString(src);
  return Cons.toString(result);
};

describe('LispInterpreter', () => {
  describe('constructor', () => {
    it('root 環境を初期化', () => {
      const interpreter = new LispInterpreter();
      expect(interpreter.root.isRoot()).toBe(true);
    });

    it('StreamManager を初期化', () => {
      const interpreter = new LispInterpreter();
      expect(interpreter.streamManager).toBeDefined();
    });

    it('組み込み関数のシンボルが登録されている', () => {
      const interpreter = new LispInterpreter();
      // '+ や 'list を評価できる (登録されているから)
      expect(() => interpreter.evalString("'+")).not.toThrow();
    });
  });

  describe('evalString', () => {
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

    it('複数式は最後の値を返す', () => {
      expect(evalStr('(+ 1 2) (* 3 4) (- 10 5)')).toBe('5');
    });

    it('空入力は nil', () => {
      expect(evalStr('')).toBe('nil');
    });

    it('文字列リテラル', () => {
      expect(evalStr('"foo"')).toBe('foo');
    });

    it('数値リテラル', () => {
      expect(evalStr('42')).toBe('42');
    });

    it('defun + 再帰', () => {
      expect(evalStr('(defun fact (n) (if (= n 0) 1 (* n (fact (- n 1))))) (fact 10)')).toBe(
        '3628800',
      );
    });

    it('lambda 即時実行', () => {
      expect(evalStr('((lambda (x y) (+ x y)) 3 4)')).toBe('7');
    });
  });

  describe('evalAll', () => {
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

    it('1 式のみでも配列 (要素数 1)', () => {
      const interpreter = new LispInterpreter();
      const results = interpreter.evalAll('(+ 1 2)');
      expect(results.length).toBe(1);
      expect(results[0]).toBe(3);
    });
  });

  describe('eval', () => {
    it('Cons を評価', () => {
      const interpreter = new LispInterpreter();
      const ast = interpreter.parse('(+ 1 2)') as Cons;
      const result = interpreter.eval(ast.car);
      expect(result).toBe(3);
    });

    it('atom (数値) を評価', () => {
      const interpreter = new LispInterpreter();
      const ast = interpreter.parse('42') as Cons;
      expect(interpreter.eval(ast.car)).toBe(42);
    });
  });

  describe('parse', () => {
    it('文字列を AST に変換', () => {
      const interpreter = new LispInterpreter();
      const ast = interpreter.parse('(+ 1 2)');
      expect(Cons.isCons(ast)).toBe(true);
    });

    it('パース失敗時は nil', () => {
      const interpreter = new LispInterpreter();
      // 不正な括弧
      const result = interpreter.parse('((');
      expect(result).toBe(Cons.nil);
    });
  });

  describe('setRoot', () => {
    it('指定した環境を root として設定', () => {
      const interpreter = new LispInterpreter();
      const original = interpreter.root;
      interpreter.setRoot(original);
      expect(interpreter.root).toBe(original);
      expect(interpreter.root.isRoot()).toBe(true);
    });
  });

  describe('initializeTable', () => {
    it('組み込み関数の Symbol が登録される', () => {
      const interpreter = new LispInterpreter();
      const table = interpreter.initializeTable();
      expect(table.isRoot()).toBe(true);
      expect(table.size).toBeGreaterThan(10); // 多数の組み込み登録
    });
  });

  describe('リグレッション: Round 4-J-3 (setIfExit shadowing)', () => {
    it('ネスト let で内側 setq は内側スコープのみ更新', () => {
      expect(evalStr('(let ((x 1)) (let ((x 2)) (setq x 100) x))')).toBe('100');
    });

    it('ネスト let の外側からアクセスして元の値を確認', () => {
      expect(evalStr('(let ((x 1)) (let ((x 2)) (setq x 100)) x)')).toBe('1');
    });
  });

  describe('リグレッション: Round 6 (format ~Na クラッシュ)', () => {
    it('(format "~5a" "hi") が動く', () => {
      expect(() => evalStr('(format "~5a" "hi")')).not.toThrow();
    });

    it('(format "~-5a" "hi") が動く', () => {
      expect(() => evalStr('(format "~-5a" "hi")')).not.toThrow();
    });

    it('(format "~a" "hi") (width 無し)', () => {
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

  describe('ExitError 統合', () => {
    it('(exit) で ExitError が throw される', () => {
      const interpreter = new LispInterpreter();
      const ast = interpreter.parse('(exit)') as Cons;
      const exitForm = ast.car;
      expect(() => interpreter.eval(exitForm)).toThrow(ExitError);
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
