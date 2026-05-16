import { describe, expect, it } from 'vitest';

import { Cons } from '../Cons/index.js';
import { LispInterpreter } from '../LispInterpreter/index.js';

process.stdin.setMaxListeners(100);

const evalStr = (src: string): string => {
  const interpreter = new LispInterpreter();
  return Cons.toString(interpreter.evalString(src));
};

describe('Applier', () => {
  describe('abs', () => {
    it('正の数をそのまま返す', () => {
      expect(evalStr('(abs 5)')).toBe('5');
    });

    it('負の数を絶対値に変換する', () => {
      expect(evalStr('(abs -5)')).toBe('5');
    });

    it('0 を返す', () => {
      expect(evalStr('(abs 0)')).toBe('0');
    });

    it('浮動小数の絶対値を返す', () => {
      expect(evalStr('(abs -3.14)')).toBe('3.14');
    });
  });

  describe('add (+)', () => {
    it('2 引数を加算する', () => {
      expect(evalStr('(+ 1 2)')).toBe('3');
    });

    it('多引数を加算する', () => {
      expect(evalStr('(+ 1 2 3 4 5)')).toBe('15');
    });

    it('負数を含めて加算する', () => {
      expect(evalStr('(+ 10 -5)')).toBe('5');
    });

    it('浮動小数を加算する', () => {
      expect(evalStr('(+ 1.5 2.5)')).toBe('4');
    });
  });

  describe('subtract (-)', () => {
    it('2 引数を減算する', () => {
      expect(evalStr('(- 10 3)')).toBe('7');
    });

    it('多引数を連続減算する', () => {
      expect(evalStr('(- 100 10 20 30)')).toBe('40');
    });
  });

  describe('multiply (*)', () => {
    it('2 引数を乗算する', () => {
      expect(evalStr('(* 4 5)')).toBe('20');
    });

    it('多引数を乗算する', () => {
      expect(evalStr('(* 2 3 4)')).toBe('24');
    });

    it('0 を含む場合は 0 を返す', () => {
      expect(evalStr('(* 5 0 3)')).toBe('0');
    });
  });

  describe('divide (/)', () => {
    it('整数を除算する', () => {
      expect(evalStr('(/ 100 4)')).toBe('25');
    });

    it('連続除算する', () => {
      expect(evalStr('(/ 100 2 5)')).toBe('10');
    });
  });

  describe('mod', () => {
    it('剰余を返す', () => {
      expect(evalStr('(mod 10 3)')).toBe('1');
    });

    it('割り切れる場合は 0 を返す', () => {
      expect(evalStr('(mod 10 5)')).toBe('0');
    });
  });

  describe('car', () => {
    it('リストの先頭要素を返す', () => {
      expect(evalStr('(car (list 1 2 3))')).toBe('1');
    });
  });

  describe('cdr', () => {
    it('リストの先頭以外を返す', () => {
      expect(evalStr('(cdr (list 1 2 3))')).toBe('(2 3)');
    });

    it('単一要素リストの cdr は nil を返す', () => {
      expect(evalStr('(cdr (list 1))')).toBe('nil');
    });
  });

  describe('cons', () => {
    it('要素をリストの先頭に追加する', () => {
      expect(evalStr('(cons 1 (list 2 3))')).toBe('(1 2 3)');
    });

    it('nil と組み合わせて単一要素リストを構築する', () => {
      expect(evalStr('(cons 1 nil)')).toBe('(1)');
    });

    it('数値とのドット対を返す', () => {
      expect(evalStr('(cons 1 2)')).toBe('(1 . 2)');
    });
  });

  describe('list', () => {
    it('複数引数からリストを構築する', () => {
      expect(evalStr('(list 1 2 3)')).toBe('(1 2 3)');
    });

    it('引数なしで nil を返す', () => {
      expect(evalStr('(list)')).toBe('nil');
    });

    it('混合型からもリストを構築する', () => {
      expect(evalStr('(list 1 \'foo "bar")')).toBe('(1 foo bar)');
    });
  });

  describe('eq', () => {
    it('同一シンボルなら t を返す', () => {
      expect(evalStr("(eq 'x 'x)")).toBe('t');
    });

    it('異なるシンボルなら nil を返す', () => {
      expect(evalStr("(eq 'x 'y)")).toBe('nil');
    });

    it('同じ数値なら t を返す', () => {
      expect(evalStr('(eq 1 1)')).toBe('t');
    });
  });

  describe('equal', () => {
    it('構造的に等しいリストなら t を返す', () => {
      expect(evalStr('(equal (list 1 2 3) (list 1 2 3))')).toBe('t');
    });

    it('異なるリストなら nil を返す', () => {
      expect(evalStr('(equal (list 1 2) (list 1 3))')).toBe('nil');
    });
  });

  describe('null', () => {
    it('nil なら t を返す', () => {
      expect(evalStr('(null nil)')).toBe('t');
    });

    it('非 nil なら nil を返す', () => {
      expect(evalStr('(null 1)')).toBe('nil');
    });
  });

  describe('numberp', () => {
    it('数値なら t を返す', () => {
      expect(evalStr('(numberp 42)')).toBe('t');
    });

    it('非数値なら nil を返す', () => {
      expect(evalStr('(numberp "foo")')).toBe('nil');
    });
  });

  describe('stringp', () => {
    it('文字列なら t を返す', () => {
      expect(evalStr('(stringp "foo")')).toBe('t');
    });

    it('非文字列なら nil を返す', () => {
      expect(evalStr('(stringp 42)')).toBe('nil');
    });
  });

  describe('symbolp', () => {
    it('シンボルなら t を返す', () => {
      expect(evalStr("(symbolp 'foo)")).toBe('t');
    });

    it('非シンボルなら nil を返す', () => {
      expect(evalStr('(symbolp 42)')).toBe('nil');
    });
  });

  describe('consp', () => {
    it('Cons なら t を返す', () => {
      expect(evalStr('(consp (list 1 2))')).toBe('t');
    });

    it('nil なら nil を返す', () => {
      expect(evalStr('(consp nil)')).toBe('nil');
    });
  });

  describe('atom', () => {
    it('Cons 以外なら t を返す', () => {
      expect(evalStr('(atom 42)')).toBe('t');
      expect(evalStr('(atom nil)')).toBe('t');
    });

    it('Cons なら nil を返す', () => {
      expect(evalStr('(atom (list 1 2))')).toBe('nil');
    });
  });

  describe('listp', () => {
    it('Cons または nil なら t を返す', () => {
      expect(evalStr('(listp (list 1 2))')).toBe('t');
      expect(evalStr('(listp nil)')).toBe('t');
    });

    it('atom なら nil を返す', () => {
      expect(evalStr('(listp 42)')).toBe('nil');
    });
  });

  describe('format', () => {
    it('~a で値を文字列化して挿入する', () => {
      expect(() => evalStr('(format "~a" "hi")')).not.toThrow();
    });

    it('Round 6: ~Na (右パディング) でクラッシュしない', () => {
      expect(() => evalStr('(format "~5a" "hi")')).not.toThrow();
    });

    it('Round 6: ~-Na (左パディング) でクラッシュしない', () => {
      expect(() => evalStr('(format "~-5a" "hi")')).not.toThrow();
    });

    it('複数の書式指示子を処理する', () => {
      expect(() => evalStr('(format "~a ~a" "hello" "world")')).not.toThrow();
    });
  });

  describe('=', () => {
    it('同じ数値なら t を返す', () => {
      expect(evalStr('(= 1 1)')).toBe('t');
    });

    it('異なる数値なら nil を返す', () => {
      expect(evalStr('(= 1 2)')).toBe('nil');
    });
  });

  describe('<', () => {
    it('小なりの関係なら t を返す', () => {
      expect(evalStr('(< 1 2)')).toBe('t');
    });

    it('大なりの関係なら nil を返す', () => {
      expect(evalStr('(< 2 1)')).toBe('nil');
    });
  });

  describe('>', () => {
    it('大なりの関係なら t を返す', () => {
      expect(evalStr('(> 2 1)')).toBe('t');
    });

    it('小なりの関係なら nil を返す', () => {
      expect(evalStr('(> 1 2)')).toBe('nil');
    });
  });

  describe('<=', () => {
    it('小なりイコールなら t を返す', () => {
      expect(evalStr('(<= 1 1)')).toBe('t');
      expect(evalStr('(<= 1 2)')).toBe('t');
    });

    it('大なりなら nil を返す', () => {
      expect(evalStr('(<= 2 1)')).toBe('nil');
    });
  });

  describe('>=', () => {
    it('大なりイコールなら t を返す', () => {
      expect(evalStr('(>= 1 1)')).toBe('t');
      expect(evalStr('(>= 2 1)')).toBe('t');
    });

    it('小なりなら nil を返す', () => {
      expect(evalStr('(>= 1 2)')).toBe('nil');
    });
  });

  describe('and (kei-lisp 独自仕様)', () => {
    it('全て真なら t を返す', () => {
      expect(evalStr('(and 1 2 3)')).toBe('t');
    });

    it('nil を含むと nil を返す', () => {
      expect(evalStr('(and 1 nil 3)')).toBe('nil');
    });
  });

  describe('or (kei-lisp 独自仕様)', () => {
    it('いずれかが真なら t を返す', () => {
      expect(evalStr('(or nil nil 3)')).toBe('t');
    });

    it('全て nil なら nil を返す', () => {
      expect(evalStr('(or nil nil)')).toBe('nil');
    });
  });

  describe('not', () => {
    it('nil なら t を返す', () => {
      expect(evalStr('(not nil)')).toBe('t');
    });

    it('非 nil なら nil を返す', () => {
      expect(evalStr('(not 1)')).toBe('nil');
    });
  });

  describe('gensym', () => {
    it('呼ぶごとに異なるシンボルを生成する', () => {
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

    it("'foo は (quote foo) と同じシンボルを返す", () => {
      expect(evalStr("'foo")).toBe('foo');
    });
  });

  describe('mapcar', () => {
    it('リストの各要素に関数を適用した結果を返す', () => {
      expect(evalStr('(mapcar (lambda (x) (* x x)) (list 1 2 3))')).toBe('(1 4 9)');
    });

    it('空リストに対しては nil を返す', () => {
      expect(evalStr('(mapcar (lambda (x) x) nil)')).toBe('nil');
    });
  });

  describe('member', () => {
    it('リスト内に要素が存在すれば、その要素以降のサブリストを返す', () => {
      expect(evalStr('(member 2 (list 1 2 3))')).toBe('(2 3)');
    });

    it('存在しない要素を渡すと nil を返す', () => {
      expect(evalStr('(member 99 (list 1 2 3))')).toBe('nil');
    });
  });

  describe('memq', () => {
    it('eq で一致する要素があれば t を返す', () => {
      expect(evalStr("(memq 'b (list 'a 'b 'c))")).toBe('t');
    });

    it('一致する要素がなければ nil を返す', () => {
      expect(evalStr("(memq 'z (list 'a 'b 'c))")).toBe('nil');
    });
  });

  describe('integerp', () => {
    it('整数なら t を返す', () => {
      expect(evalStr('(integerp 42)')).toBe('t');
    });

    it('浮動小数なら nil を返す', () => {
      expect(evalStr('(integerp 3.14)')).toBe('nil');
    });
  });

  describe('floatp', () => {
    it('数値で範囲内なら t を返す (原本踏襲: 範囲チェック実装)', () => {
      expect(evalStr('(floatp 3.14)')).toBe('t');
    });

    it('非数値なら nil を返す', () => {
      expect(evalStr('(floatp "foo")')).toBe('nil');
    });
  });

  describe('neq', () => {
    it('eq の否定を返す', () => {
      expect(evalStr("(neq 'x 'y)")).toBe('t');
      expect(evalStr("(neq 'x 'x)")).toBe('nil');
    });
  });

  describe('nequal', () => {
    it('equal の否定を返す', () => {
      expect(evalStr('(nequal (list 1 2) (list 1 3))')).toBe('t');
      expect(evalStr('(nequal (list 1 2) (list 1 2))')).toBe('nil');
    });
  });

  describe('nth (組み込み)', () => {
    it('リストの n 番目要素を返す (1-origin)', () => {
      expect(evalStr('(nth 2 (list 10 20 30))')).toBe('20');
    });

    it('範囲外なら nil を返す', () => {
      expect(evalStr('(nth 99 (list 1 2))')).toBe('nil');
    });
  });

  describe('last (組み込み)', () => {
    it('リストの最後の Cons セル (要素 1 つのサブリスト) を返す', () => {
      expect(evalStr('(last (list 1 2 3))')).toBe('(3)');
    });
  });

  describe('pi (定数)', () => {
    it('Math.PI を返す', () => {
      const interpreter = new LispInterpreter();
      const result = interpreter.evalString('(pi)');
      expect(result).toBeCloseTo(Math.PI);
    });
  });

  describe('sqrt / sin / cos / tan', () => {
    it('sqrt は平方根を返す', () => {
      expect(evalStr('(sqrt 16)')).toBe('4');
    });

    it('sin / cos / tan は対応する三角関数値を返す', () => {
      const interpreter = new LispInterpreter();
      const sin0 = interpreter.evalString('(sin 0)');
      const cos0 = interpreter.evalString('(cos 0)');
      expect(sin0).toBeCloseTo(0);
      expect(cos0).toBeCloseTo(1);
    });
  });

  describe('round', () => {
    it('小数を最も近い整数に丸める', () => {
      expect(evalStr('(round 3.4)')).toBe('3');
      expect(evalStr('(round 3.6)')).toBe('4');
    });
  });

  describe('rplaca / rplacd', () => {
    it('rplaca は car を破壊的に書き換える', () => {
      const interpreter = new LispInterpreter();
      interpreter.evalString('(setq x (list 1 2 3))');
      interpreter.evalString('(rplaca x 99)');
      expect(Cons.toString(interpreter.evalString('(car x)'))).toBe('99');
    });

    it('rplacd は cdr を破壊的に書き換える', () => {
      const interpreter = new LispInterpreter();
      interpreter.evalString('(setq x (list 1 2 3))');
      interpreter.evalString("(rplacd x '(99))");
      expect(Cons.toString(interpreter.evalString('(cdr x)'))).toBe('(99)');
    });
  });

  describe('push / pop', () => {
    it('push は変数のリストの先頭に要素を追加する', () => {
      const interpreter = new LispInterpreter();
      interpreter.evalString('(setq stack (list 1 2 3))');
      interpreter.evalString('(push 0 stack)');
      expect(Cons.toString(interpreter.evalString('stack'))).toBe('(0 1 2 3)');
    });

    it('pop は変数のリストの先頭要素を取り出す', () => {
      const interpreter = new LispInterpreter();
      interpreter.evalString('(setq stack (list 1 2 3))');
      const popped = interpreter.evalString('(pop stack)');
      expect(popped).toBe(1);
    });
  });
});
