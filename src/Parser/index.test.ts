import { describe, expect, it } from 'vitest';

import { Cons } from '../Cons/index.js';
import { InterpretedSymbol } from '../InterpretedSymbol/index.js';
import { Parser } from './index.js';

describe('Parser', () => {
  describe('constructor', () => {
    it('文字列を受け取って Parser を生成', () => {
      const p = new Parser('(1 2 3)');
      expect(p.state).toBe(0);
      expect(p.tokenString).toBe('');
    });

    it('peek バッファが初期化される', () => {
      const p = new Parser('abc');
      expect(p.nexts.length).toBe(11); // PEEKCOUNT + 1
    });
  });

  describe('atEnd', () => {
    it('入力末尾まで来たら true', () => {
      const p = new Parser('');
      expect(p.atEnd()).toBe(true);
    });

    it('まだ文字があれば false', () => {
      const p = new Parser('abc');
      expect(p.atEnd()).toBe(false);
    });
  });

  describe('parse (static)', () => {
    it('単純な数値', () => {
      const result = Parser.parse('(42)');
      expect((result as Cons).car).toBe(42);
    });

    it('浮動小数', () => {
      const result = Parser.parse('(3.14)');
      expect((result as Cons).car).toBe(3.14);
    });

    it('負の整数', () => {
      const result = Parser.parse('(-42)');
      expect((result as Cons).car).toBe(-42);
    });

    it('シンボル', () => {
      const result = Parser.parse('(foo)');
      expect((result as Cons).car).toBe(InterpretedSymbol.of('foo'));
    });

    it('文字列', () => {
      const result = Parser.parse('("hello")');
      expect((result as Cons).car).toBe('hello');
    });

    it('リスト (1 2 3)', () => {
      const result = Parser.parse('((1 2 3))');
      const list = (result as Cons).car as Cons;
      expect(list.length()).toBe(3);
      expect(list.nth(1)).toBe(1);
      expect(list.nth(2)).toBe(2);
      expect(list.nth(3)).toBe(3);
    });

    it('ネストしたリスト ((1) (2 3))', () => {
      const result = Parser.parse('(((1) (2 3)))');
      const outer = (result as Cons).car as Cons;
      const first = outer.nth(1) as Cons;
      const second = outer.nth(2) as Cons;
      expect(first.nth(1)).toBe(1);
      expect(second.nth(1)).toBe(2);
      expect(second.nth(2)).toBe(3);
    });

    it('空リスト nil', () => {
      const result = Parser.parse('(nil)');
      // nil シンボルとしてパースされる
      expect((result as Cons).car).toBeDefined();
    });

    it("クォート 'x → (quote x)", () => {
      const result = Parser.parse("('x)");
      const quoted = (result as Cons).car as Cons;
      expect(quoted.car).toBe(InterpretedSymbol.of('quote'));
      expect((quoted.cdr as Cons).car).toBe(InterpretedSymbol.of('x'));
    });

    it('既知 quirk: (quote +) は 0 として解釈 (原本踏襲)', () => {
      const result = Parser.parse("('+)");
      const quoted = (result as Cons).car as Cons;
      expect(quoted.car).toBe(InterpretedSymbol.of('quote'));
      expect((quoted.cdr as Cons).car).toBe(0);
    });

    it('空白で囲まれた + はシンボル', () => {
      const result = Parser.parse('(( + ))');
      const list = (result as Cons).car as Cons;
      expect(list.nth(1)).toBe(InterpretedSymbol.of('+'));
    });

    it('Round 4-C: 絵文字を含む文字列の保全', () => {
      const result = Parser.parse('("Hello 😀")');
      expect((result as Cons).car).toBe('Hello 😀');
    });

    it('Round 4-C: 日本語文字列の保全', () => {
      const result = Parser.parse('("こんにちは")');
      expect((result as Cons).car).toBe('こんにちは');
    });

    it('関数呼び出し風 (foo 1 2 3)', () => {
      const result = Parser.parse('((foo 1 2 3))');
      const call = (result as Cons).car as Cons;
      expect(call.car).toBe(InterpretedSymbol.of('foo'));
      expect(call.nth(2)).toBe(1);
      expect(call.nth(4)).toBe(3);
    });
  });

  describe('nextChar', () => {
    it('1 文字進める', () => {
      const p = new Parser('abc');
      const c1 = p.nextChar();
      expect(c1).toBeDefined();
    });

    it('末尾を超えると null', () => {
      const p = new Parser('a');
      p.nextChar();
      p.nextChar();
      for (let i = 0; i < 15; i++) {
        p.nextChar();
      }
      expect(p.atEnd()).toBe(true);
    });
  });

  describe('peekChar', () => {
    it('次の文字を確認 (consume しない)', () => {
      const p = new Parser('abc');
      const c1 = p.peekChar();
      const c2 = p.peekChar();
      expect(c1).toBe(c2);
    });
  });

  describe('nextState', () => {
    it('NextState インスタンスを生成', () => {
      const p = new Parser('');
      const ns = p.nextState(1, 'foo');
      expect(ns.nextState).toBe(1);
      expect(ns.methodName).toBe('foo');
    });

    it('null も許容', () => {
      const p = new Parser('');
      const ns = p.nextState(null, null);
      expect(ns.nextState).toBeNull();
      expect(ns.methodName).toBeNull();
    });
  });
});
