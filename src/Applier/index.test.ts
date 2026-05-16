import { describe, expect, it } from 'vitest';

import { Cons } from '../Cons/index.js';
import { LispInterpreter } from '../LispInterpreter/index.js';

process.stdin.setMaxListeners(100);

// Applier の組み込み関数は LispInterpreter 経由で評価して挙動確認するのが現実的
const evalStr = (src: string): string => {
  const interpreter = new LispInterpreter();
  const result = interpreter.evalString(src);
  return Cons.toString(result);
};

describe('Applier', () => {
  describe('abs', () => {
    it('正の数はそのまま', () => {
      expect(evalStr('(abs 5)')).toBe('5');
    });

    it('負の数は正に', () => {
      expect(evalStr('(abs -5)')).toBe('5');
    });

    it('0 は 0', () => {
      expect(evalStr('(abs 0)')).toBe('0');
    });

    it('浮動小数も扱える', () => {
      expect(evalStr('(abs -3.14)')).toBe('3.14');
    });
  });

  describe('add (+)', () => {
    it('2 引数の加算', () => {
      expect(evalStr('(+ 1 2)')).toBe('3');
    });

    it('多引数の加算', () => {
      expect(evalStr('(+ 1 2 3 4 5)')).toBe('15');
    });

    it('負の数も含む', () => {
      expect(evalStr('(+ 10 -5)')).toBe('5');
    });

    it('浮動小数の加算', () => {
      expect(evalStr('(+ 1.5 2.5)')).toBe('4');
    });
  });

  describe('subtract (-)', () => {
    it('2 引数の減算', () => {
      expect(evalStr('(- 10 3)')).toBe('7');
    });

    it('多引数の減算', () => {
      expect(evalStr('(- 100 10 20 30)')).toBe('40');
    });
  });

  describe('multiply (*)', () => {
    it('2 引数の積', () => {
      expect(evalStr('(* 4 5)')).toBe('20');
    });

    it('多引数の積', () => {
      expect(evalStr('(* 2 3 4)')).toBe('24');
    });

    it('0 を含むと 0', () => {
      expect(evalStr('(* 5 0 3)')).toBe('0');
    });
  });

  describe('divide (/)', () => {
    it('整数の除算', () => {
      expect(evalStr('(/ 100 4)')).toBe('25');
    });

    it('連続除算', () => {
      expect(evalStr('(/ 100 2 5)')).toBe('10');
    });
  });

  describe('mod', () => {
    it('剰余を返す', () => {
      expect(evalStr('(mod 10 3)')).toBe('1');
    });

    it('割り切れる場合は 0', () => {
      expect(evalStr('(mod 10 5)')).toBe('0');
    });
  });

  describe('car', () => {
    it('リストの先頭を返す', () => {
      expect(evalStr('(car (list 1 2 3))')).toBe('1');
    });

    it('単一要素なら唯一の要素', () => {
      expect(evalStr('(car (list 99))')).toBe('99');
    });
  });

  describe('cdr', () => {
    it('リストの末尾を返す', () => {
      expect(evalStr('(cdr (list 1 2 3))')).toBe('(2 3)');
    });

    it('単一要素の cdr は nil', () => {
      expect(evalStr('(cdr (list 1))')).toBe('nil');
    });
  });

  describe('cons', () => {
    it('要素をリストの先頭に追加', () => {
      expect(evalStr('(cons 1 (list 2 3))')).toBe('(1 2 3)');
    });

    it('nil と組み合わせて単一要素リスト', () => {
      expect(evalStr('(cons 1 nil)')).toBe('(1)');
    });

    it('dotted pair: cons 数値', () => {
      expect(evalStr('(cons 1 2)')).toBe('(1 . 2)');
    });
  });

  describe('list', () => {
    it('複数引数からリスト構築', () => {
      expect(evalStr('(list 1 2 3)')).toBe('(1 2 3)');
    });

    it('引数なしは nil', () => {
      expect(evalStr('(list)')).toBe('nil');
    });

    it('混合型も可能', () => {
      expect(evalStr('(list 1 \'foo "bar")')).toBe('(1 foo bar)');
    });
  });

  describe('eq', () => {
    it('同一シンボルは t', () => {
      expect(evalStr("(eq 'x 'x)")).toBe('t');
    });

    it('異なるシンボルは nil', () => {
      expect(evalStr("(eq 'x 'y)")).toBe('nil');
    });

    it('同じ数値は t', () => {
      expect(evalStr('(eq 1 1)')).toBe('t');
    });
  });

  describe('equal', () => {
    it('構造的に等しいリストは t', () => {
      expect(evalStr('(equal (list 1 2 3) (list 1 2 3))')).toBe('t');
    });

    it('異なるリストは nil', () => {
      expect(evalStr('(equal (list 1 2) (list 1 3))')).toBe('nil');
    });
  });

  describe('null', () => {
    it('nil は t', () => {
      expect(evalStr('(null nil)')).toBe('t');
    });

    it('非 nil は nil', () => {
      expect(evalStr('(null 1)')).toBe('nil');
      expect(evalStr('(null (list 1))')).toBe('nil');
    });
  });

  describe('numberp', () => {
    it('数値は t', () => {
      expect(evalStr('(numberp 42)')).toBe('t');
      expect(evalStr('(numberp 3.14)')).toBe('t');
    });

    it('非数値は nil', () => {
      expect(evalStr('(numberp "foo")')).toBe('nil');
      expect(evalStr("(numberp 'sym)")).toBe('nil');
    });
  });

  describe('stringp', () => {
    it('文字列は t', () => {
      expect(evalStr('(stringp "foo")')).toBe('t');
    });

    it('非文字列は nil', () => {
      expect(evalStr('(stringp 42)')).toBe('nil');
    });
  });

  describe('symbolp', () => {
    it('シンボルは t', () => {
      expect(evalStr("(symbolp 'foo)")).toBe('t');
    });

    it('非シンボルは nil', () => {
      expect(evalStr('(symbolp 42)')).toBe('nil');
      expect(evalStr('(symbolp "foo")')).toBe('nil');
    });
  });

  describe('consp', () => {
    it('Cons は t', () => {
      expect(evalStr('(consp (list 1 2))')).toBe('t');
    });

    it('nil は nil (Cons 扱いではない)', () => {
      expect(evalStr('(consp nil)')).toBe('nil');
    });

    it('atom は nil', () => {
      expect(evalStr('(consp 42)')).toBe('nil');
    });
  });

  describe('atom', () => {
    it('非 Cons は t', () => {
      expect(evalStr('(atom 42)')).toBe('t');
      expect(evalStr('(atom "foo")')).toBe('t');
      expect(evalStr('(atom nil)')).toBe('t');
    });

    it('Cons は nil', () => {
      expect(evalStr('(atom (list 1 2))')).toBe('nil');
    });
  });

  describe('listp', () => {
    it('Cons または nil は t', () => {
      expect(evalStr('(listp (list 1 2))')).toBe('t');
      expect(evalStr('(listp nil)')).toBe('t');
    });

    it('atom は nil', () => {
      expect(evalStr('(listp 42)')).toBe('nil');
    });
  });

  describe('format (Round 6 修正後)', () => {
    it('~a は値を文字列化して挿入', () => {
      expect(() => evalStr('(format "~a" "hi")')).not.toThrow();
    });

    it('Round 6: ~5a (右パディング) でクラッシュしない', () => {
      expect(() => evalStr('(format "~5a" "hi")')).not.toThrow();
    });

    it('Round 6: ~-5a (左パディング) でクラッシュしない', () => {
      expect(() => evalStr('(format "~-5a" "hi")')).not.toThrow();
    });

    it('複数の書式指示子', () => {
      expect(() => evalStr('(format "~a ~a" "hello" "world")')).not.toThrow();
    });
  });

  describe('比較演算子', () => {
    it('= 同じ数値は t', () => {
      expect(evalStr('(= 1 1)')).toBe('t');
      expect(evalStr('(= 1 2)')).toBe('nil');
    });

    it('< 小なり', () => {
      expect(evalStr('(< 1 2)')).toBe('t');
      expect(evalStr('(< 2 1)')).toBe('nil');
    });

    it('> 大なり', () => {
      expect(evalStr('(> 2 1)')).toBe('t');
      expect(evalStr('(> 1 2)')).toBe('nil');
    });

    it('<= 小なりイコール', () => {
      expect(evalStr('(<= 1 1)')).toBe('t');
      expect(evalStr('(<= 1 2)')).toBe('t');
      expect(evalStr('(<= 2 1)')).toBe('nil');
    });

    it('>= 大なりイコール', () => {
      expect(evalStr('(>= 1 1)')).toBe('t');
      expect(evalStr('(>= 2 1)')).toBe('t');
      expect(evalStr('(>= 1 2)')).toBe('nil');
    });
  });

  describe('論理演算', () => {
    // kei-lisp 独自仕様: and / or は CL 標準と異なり t / nil を返す (値を返さない)
    it('and: 全て真なら t', () => {
      expect(evalStr('(and 1 2 3)')).toBe('t');
    });

    it('and: 偽 (nil) を含むと nil', () => {
      expect(evalStr('(and 1 nil 3)')).toBe('nil');
    });

    it('or: いずれか真なら t', () => {
      expect(evalStr('(or nil nil 3)')).toBe('t');
    });

    it('or: 全て nil なら nil', () => {
      expect(evalStr('(or nil nil)')).toBe('nil');
    });

    it('not: nil なら t', () => {
      expect(evalStr('(not nil)')).toBe('t');
    });

    it('not: 非 nil なら nil', () => {
      expect(evalStr('(not 1)')).toBe('nil');
    });
  });

  describe('gensym', () => {
    it('呼ぶごとに異なる Symbol を生成', () => {
      const interpreter = new LispInterpreter();
      const s1 = interpreter.evalString('(gensym)');
      const s2 = interpreter.evalString('(gensym)');
      expect(s1).not.toBe(s2);
    });
  });

  describe('quote', () => {
    it('引数を評価せず返す', () => {
      expect(evalStr('(quote foo)')).toBe('foo');
    });

    it("'foo は (quote foo) と等価", () => {
      expect(evalStr("'foo")).toBe('foo');
    });
  });
});
