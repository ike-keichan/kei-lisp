import { describe, expect, it } from 'vitest';

import { Cons } from '../Cons/index.js';
import { InterpretedSymbol } from '../InterpretedSymbol/index.js';
import { Parser } from './index.js';

describe('Parser', () => {
  describe('constructor', () => {
    it('文字列を受け取って Parser を生成する', () => {
      const p = new Parser('(1 2 3)');
      expect(p.state).toBe(0);
      expect(p.tokenString).toBe('');
    });

    it('peek バッファを PEEKCOUNT + 1 サイズで初期化する', () => {
      expect(new Parser('abc').nexts.length).toBe(11);
    });
  });

  describe('atEnd', () => {
    it('空入力なら true を返す', () => {
      expect(new Parser('').atEnd()).toBe(true);
    });

    it('文字が残っていれば false を返す', () => {
      expect(new Parser('abc').atEnd()).toBe(false);
    });
  });

  describe('parse (static)', () => {
    it('整数をパースする', () => {
      const result = Parser.parse('(42)');
      expect((result as Cons).car).toBe(42);
    });

    it('浮動小数をパースする', () => {
      const result = Parser.parse('(3.14)');
      expect((result as Cons).car).toBe(3.14);
    });

    it('負数をパースする', () => {
      const result = Parser.parse('(-42)');
      expect((result as Cons).car).toBe(-42);
    });

    it('シンボルをパースして intern する', () => {
      const result = Parser.parse('(foo)');
      expect((result as Cons).car).toBe(InterpretedSymbol.of('foo'));
    });

    it('文字列リテラルをパースする', () => {
      const result = Parser.parse('("hello")');
      expect((result as Cons).car).toBe('hello');
    });

    it('リスト (1 2 3) をパースする', () => {
      const result = Parser.parse('((1 2 3))');
      const list = (result as Cons).car as Cons;
      expect(list.length()).toBe(3);
      expect(list.nth(2)).toBe(2);
    });

    it('ネストしたリストをパースする', () => {
      const result = Parser.parse('(((1) (2 3)))');
      const outer = (result as Cons).car as Cons;
      expect((outer.nth(1) as Cons).nth(1) as number).toBe(1);
      expect((outer.nth(2) as Cons).nth(2) as number).toBe(3);
    });

    it("'x をパースして (quote x) に展開する", () => {
      const result = Parser.parse("('x)");
      const quoted = (result as Cons).car as Cons;
      expect(quoted.car).toBe(InterpretedSymbol.of('quote'));
    });

    it('Quirk: (quote +) は 0 として解釈する', () => {
      const result = Parser.parse("('+)");
      const quoted = (result as Cons).car as Cons;
      expect((quoted.cdr as Cons).car).toBe(0);
    });

    it('Quirk: 空白で囲まれた + はシンボルとして解釈する', () => {
      const result = Parser.parse('(( + ))');
      const list = (result as Cons).car as Cons;
      expect(list.nth(1)).toBe(InterpretedSymbol.of('+'));
    });

    it('Round 4-C: 絵文字を含む文字列を保全する', () => {
      const result = Parser.parse('("Hello 😀")');
      expect((result as Cons).car).toBe('Hello 😀');
    });

    it('Round 4-C: 日本語文字列を保全する', () => {
      const result = Parser.parse('("こんにちは")');
      expect((result as Cons).car).toBe('こんにちは');
    });

    it('関数呼び出しの形をパースする', () => {
      const result = Parser.parse('((foo 1 2 3))');
      const call = (result as Cons).car as Cons;
      expect(call.car).toBe(InterpretedSymbol.of('foo'));
      expect(call.nth(4)).toBe(3);
    });
  });

  describe('nextChar', () => {
    it('1 文字進めて値を返す', () => {
      const p = new Parser('abc');
      expect(p.nextChar()).toBeDefined();
    });

    it('入力末尾を超えると atEnd を true にする', () => {
      const p = new Parser('a');
      for (let i = 0; i < 15; i++) {
        p.nextChar();
      }
      expect(p.atEnd()).toBe(true);
    });
  });

  describe('peekChar', () => {
    it('次の文字を返すが consume しない', () => {
      const p = new Parser('abc');
      expect(p.peekChar()).toBe(p.peekChar());
    });
  });

  describe('nextState', () => {
    it('NextState インスタンスを生成する', () => {
      const p = new Parser('');
      const ns = p.nextState(1, 'foo');
      expect(ns.nextState).toBe(1);
      expect(ns.methodName).toBe('foo');
    });

    it('null 引数も許容する', () => {
      const ns = new Parser('').nextState(null, null);
      expect(ns.nextState).toBeNull();
      expect(ns.methodName).toBeNull();
    });
  });

  describe('nextToken', () => {
    it('入力全体をパースして式を返す', () => {
      const p = new Parser('(42)');
      const result = p.nextToken();
      // parse 経由ではなく nextToken 直接呼び出しでも (42) リストが返る
      expect(Cons.isCons(result)).toBe(true);
    });

    it('数値リテラルもパースして返す', () => {
      const p = new Parser('(99)');
      const result = p.nextToken() as Cons;
      expect(result.car).toBe(99);
    });
  });
});
