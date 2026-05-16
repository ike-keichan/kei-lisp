import { describe, expect, it } from 'vitest';

import { Cons } from '../Cons/index.js';
import { InterpretedSymbol } from '../InterpretedSymbol/index.js';
import { Parser } from './index.js';

describe('Parser', () => {
  describe('基本パース', () => {
    it('数値のパース', () => {
      const result = Parser.parse('(42)');
      expect(result).toBeInstanceOf(Cons);
      expect((result as Cons).car).toBe(42);
    });

    it('浮動小数のパース', () => {
      const result = Parser.parse('(3.14)');
      expect((result as Cons).car).toBe(3.14);
    });

    it('シンボルのパース (intern される)', () => {
      const result = Parser.parse('(foo)');
      const car = (result as Cons).car;
      expect(car).toBe(InterpretedSymbol.of('foo'));
    });

    it('文字列のパース', () => {
      const result = Parser.parse('("hello")');
      expect((result as Cons).car).toBe('hello');
    });

    it('リストのパース (1 2 3)', () => {
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
  });

  describe('クォート記法', () => {
    it("'x → (quote x)", () => {
      const result = Parser.parse("('x)");
      const quoted = (result as Cons).car as Cons;
      expect(quoted.car).toBe(InterpretedSymbol.of('quote'));
      expect((quoted.cdr as Cons).car).toBe(InterpretedSymbol.of('x'));
    });
  });

  describe('既知の quirk', () => {
    it('(quote +) → (quote 0) のバグ的挙動 (原本踏襲)', () => {
      // 単独 + は sign 状態を経て整数 0 として解釈される
      const result = Parser.parse("('+)");
      const quoted = (result as Cons).car as Cons;
      expect(quoted.car).toBe(InterpretedSymbol.of('quote'));
      expect((quoted.cdr as Cons).car).toBe(0);
    });

    it('空白で囲まれた + は シンボルとして解釈', () => {
      const result = Parser.parse('(( + ))');
      const list = (result as Cons).car as Cons;
      expect(list.nth(1)).toBe(InterpretedSymbol.of('+'));
    });
  });

  describe('Unicode 透過保全 (Round 4-C 修正後)', () => {
    it('絵文字を含む文字列が破壊されない', () => {
      const result = Parser.parse('("Hello 😀")');
      const str = (result as Cons).car;
      expect(str).toBe('Hello 😀');
    });

    it('日本語文字列も保全される', () => {
      const result = Parser.parse('("こんにちは")');
      const str = (result as Cons).car;
      expect(str).toBe('こんにちは');
    });
  });
});
