import { describe, expect, it } from 'vitest';

import { Cons } from '../../value/Cons/index.js';
import { LispInterpreter } from '../../interpreter/LispInterpreter/index.js';
import { StreamManager } from '../StreamManager/index.js';
import { Table } from '../Table/index.js';
import { Applier } from './index.js';

const evalStr = (src: string): string => {
  const interpreter = new LispInterpreter();
  return Cons.toString(interpreter.evalString(src));
};

const newApplier = (): Applier => new Applier(new Table(), new StreamManager(), 0);

describe('Applier', () => {
  describe('abs', () => {
    it('returns a positive number as-is', () => {
      expect(evalStr('(abs 5)')).toBe('5');
    });

    it('converts a negative number to its absolute value', () => {
      expect(evalStr('(abs -5)')).toBe('5');
    });

    it('returns 0', () => {
      expect(evalStr('(abs 0)')).toBe('0');
    });

    it('returns the absolute value of a float', () => {
      expect(evalStr('(abs -3.14)')).toBe('3.14');
    });
  });

  describe('add (+)', () => {
    it('adds two arguments', () => {
      expect(evalStr('(+ 1 2)')).toBe('3');
    });

    it('adds multiple arguments', () => {
      expect(evalStr('(+ 1 2 3 4 5)')).toBe('15');
    });

    it('adds while including negative numbers', () => {
      expect(evalStr('(+ 10 -5)')).toBe('5');
    });

    it('adds floats', () => {
      expect(evalStr('(+ 1.5 2.5)')).toBe('4');
    });
  });

  describe('subtract (-)', () => {
    it('subtracts two arguments', () => {
      expect(evalStr('(- 10 3)')).toBe('7');
    });

    it('subtracts multiple arguments left to right', () => {
      expect(evalStr('(- 100 10 20 30)')).toBe('40');
    });
  });

  describe('multiply (*)', () => {
    it('multiplies two arguments', () => {
      expect(evalStr('(* 4 5)')).toBe('20');
    });

    it('multiplies multiple arguments', () => {
      expect(evalStr('(* 2 3 4)')).toBe('24');
    });

    it('returns 0 when any argument is 0', () => {
      expect(evalStr('(* 5 0 3)')).toBe('0');
    });
  });

  describe('divide (/)', () => {
    it('divides integers', () => {
      expect(evalStr('(/ 100 4)')).toBe('25');
    });

    it('divides successively', () => {
      expect(evalStr('(/ 100 2 5)')).toBe('10');
    });
  });

  describe('mod', () => {
    it('returns the remainder', () => {
      expect(evalStr('(mod 10 3)')).toBe('1');
    });

    it('returns 0 when the dividend is divisible', () => {
      expect(evalStr('(mod 10 5)')).toBe('0');
    });
  });

  describe('car', () => {
    it('returns the first element of a list', () => {
      expect(evalStr('(car (list 1 2 3))')).toBe('1');
    });
  });

  describe('cdr', () => {
    it('returns everything but the first element of a list', () => {
      expect(evalStr('(cdr (list 1 2 3))')).toBe('(2 3)');
    });

    it('returns nil for the cdr of a single-element list', () => {
      expect(evalStr('(cdr (list 1))')).toBe('nil');
    });
  });

  describe('cons', () => {
    it('prepends an element to a list', () => {
      expect(evalStr('(cons 1 (list 2 3))')).toBe('(1 2 3)');
    });

    it('builds a single-element list when combined with nil', () => {
      expect(evalStr('(cons 1 nil)')).toBe('(1)');
    });

    it('returns a dotted pair with a number', () => {
      expect(evalStr('(cons 1 2)')).toBe('(1 . 2)');
    });
  });

  describe('list', () => {
    it('builds a list from multiple arguments', () => {
      expect(evalStr('(list 1 2 3)')).toBe('(1 2 3)');
    });

    it('returns nil when called with no arguments', () => {
      expect(evalStr('(list)')).toBe('nil');
    });

    it('builds a list from mixed types', () => {
      expect(evalStr('(list 1 \'foo "bar")')).toBe('(1 foo bar)');
    });
  });

  describe('eq', () => {
    it('returns t for identical symbols', () => {
      expect(evalStr("(eq 'x 'x)")).toBe('t');
    });

    it('returns nil for different symbols', () => {
      expect(evalStr("(eq 'x 'y)")).toBe('nil');
    });

    it('returns t for the same integer', () => {
      expect(evalStr('(eq 1 1)')).toBe('t');
    });

    it('returns t for the same float value', () => {
      expect(evalStr('(eq 3.14 3.14)')).toBe('t');
    });

    it('returns t for the same string content (JS string interning)', () => {
      expect(evalStr('(eq "abc" "abc")')).toBe('t');
    });

    it('returns nil for distinct cons cells with the same structure', () => {
      expect(evalStr('(eq (cons 1 2) (cons 1 2))')).toBe('nil');
    });

    it('returns t when both arguments are nil', () => {
      expect(evalStr('(eq nil nil)')).toBe('t');
    });
  });

  describe('equal', () => {
    it('returns t for structurally equal lists', () => {
      expect(evalStr('(equal (list 1 2 3) (list 1 2 3))')).toBe('t');
    });

    it('returns nil for different lists', () => {
      expect(evalStr('(equal (list 1 2) (list 1 3))')).toBe('nil');
    });
  });

  describe('null', () => {
    it('returns t for nil', () => {
      expect(evalStr('(null nil)')).toBe('t');
    });

    it('returns nil for non-nil values', () => {
      expect(evalStr('(null 1)')).toBe('nil');
    });
  });

  describe('numberp', () => {
    it('returns t for numbers', () => {
      expect(evalStr('(numberp 42)')).toBe('t');
    });

    it('returns nil for non-numbers', () => {
      expect(evalStr('(numberp "foo")')).toBe('nil');
    });
  });

  describe('stringp', () => {
    it('returns t for strings', () => {
      expect(evalStr('(stringp "foo")')).toBe('t');
    });

    it('returns nil for non-strings', () => {
      expect(evalStr('(stringp 42)')).toBe('nil');
    });
  });

  describe('string-upcase', () => {
    it('converts to uppercase', () => {
      expect(evalStr('(string-upcase "hello")')).toBe('HELLO');
    });

    it('returns empty for empty string', () => {
      expect(evalStr('(string-upcase "")')).toBe('');
    });

    it('throws on non-string', () => {
      expect(() => evalStr('(string-upcase 42)')).toThrow();
    });
  });

  describe('string-downcase', () => {
    it('converts to lowercase', () => {
      expect(evalStr('(string-downcase "WORLD")')).toBe('world');
    });

    it('throws on non-string', () => {
      expect(() => evalStr('(string-downcase 42)')).toThrow();
    });
  });

  describe('string-trim', () => {
    it('strips leading and trailing whitespace', () => {
      expect(evalStr('(string-trim "  abc  ")')).toBe('abc');
    });

    it('preserves interior whitespace', () => {
      expect(evalStr('(string-trim " a b ")')).toBe('a b');
    });

    it('throws on non-string', () => {
      expect(() => evalStr('(string-trim 42)')).toThrow();
    });
  });

  describe('substring', () => {
    it('extracts substring from start', () => {
      expect(evalStr('(substring "hello world" 6)')).toBe('world');
    });

    it('extracts substring with end', () => {
      expect(evalStr('(substring "hello world" 0 5)')).toBe('hello');
    });

    it('handles multi-byte characters by code point', () => {
      expect(evalStr('(substring "abc😀def" 3 4)')).toBe('😀');
    });

    it('throws on non-string target', () => {
      expect(() => evalStr('(substring 42 0)')).toThrow();
    });

    it('throws on non-number start', () => {
      expect(() => evalStr('(substring "abc" "x")')).toThrow();
    });
  });

  describe('concatenate', () => {
    it('joins multiple strings', () => {
      expect(evalStr('(concatenate "a" "b" "c")')).toBe('abc');
    });

    it('returns empty for no args', () => {
      expect(evalStr('(concatenate)')).toBe('');
    });

    it('throws on non-string argument', () => {
      expect(() => evalStr('(concatenate "a" 1)')).toThrow();
    });
  });

  describe('length', () => {
    it('returns character count for a string', () => {
      expect(evalStr('(length "hello")')).toBe('5');
    });

    it('counts emoji as single code point', () => {
      expect(evalStr('(length "😀😀")')).toBe('2');
    });

    it('returns element count for a list', () => {
      expect(evalStr('(length (list 1 2 3 4))')).toBe('4');
    });

    it('returns 0 for nil', () => {
      expect(evalStr('(length nil)')).toBe('0');
    });

    it('returns 0 for empty string', () => {
      expect(evalStr('(length "")')).toBe('0');
    });

    it('throws on non-sequence', () => {
      expect(() => evalStr('(length 42)')).toThrow();
    });
  });

  describe('elt', () => {
    it('returns nth character (0-indexed)', () => {
      expect(evalStr('(elt "abc" 1)')).toBe('b');
    });

    it('returns nth list element (0-indexed)', () => {
      expect(evalStr('(elt (list 10 20 30) 2)')).toBe('30');
    });

    it('throws on out-of-range index', () => {
      expect(() => evalStr('(elt "abc" 5)')).toThrow();
    });

    it('throws on non-number index', () => {
      expect(() => evalStr('(elt "abc" "x")')).toThrow();
    });
  });

  describe('subseq', () => {
    it('returns substring of a string with start and end', () => {
      expect(evalStr('(subseq "hello" 1 4)')).toBe('ell');
    });

    it('returns sublist with start and end', () => {
      expect(Cons.toString(new LispInterpreter().evalString('(subseq (list 1 2 3 4 5) 1 4)'))).toBe(
        '(2 3 4)',
      );
    });

    it('omits end to take rest of string', () => {
      expect(evalStr('(subseq "hello" 2)')).toBe('llo');
    });

    it('omits end to take rest of list', () => {
      expect(Cons.toString(new LispInterpreter().evalString('(subseq (list 1 2 3 4 5) 2)'))).toBe(
        '(3 4 5)',
      );
    });
  });

  describe('count', () => {
    it('counts occurrences of a character in a string', () => {
      expect(evalStr('(count "l" "hello")')).toBe('2');
    });

    it('counts occurrences in a list', () => {
      expect(evalStr('(count 2 (list 1 2 3 2 1))')).toBe('2');
    });

    it('returns 0 when not found', () => {
      expect(evalStr('(count "z" "hello")')).toBe('0');
    });

    it('returns 0 for empty sequence', () => {
      expect(evalStr('(count 1 nil)')).toBe('0');
    });
  });

  describe('reduce', () => {
    it('left-folds with no initial value', () => {
      expect(evalStr('(reduce (lambda (a b) (+ a b)) (list 1 2 3 4 5))')).toBe('15');
    });

    it('uses the initial value when provided', () => {
      expect(evalStr('(reduce (lambda (a b) (+ a b)) (list 1 2 3) 100)')).toBe('106');
    });

    it('returns the initial value on empty list', () => {
      expect(evalStr('(reduce + nil 0)')).toBe('0');
    });

    it('returns the lone element when no initial value and single element', () => {
      expect(evalStr('(reduce + (list 42))')).toBe('42');
    });
  });

  describe('every', () => {
    it('returns t when all elements satisfy the predicate', () => {
      expect(evalStr('(every (lambda (x) (> x 0)) (list 1 2 3))')).toBe('t');
    });

    it('returns nil when at least one element fails', () => {
      expect(evalStr('(every (lambda (x) (> x 0)) (list 1 -1 3))')).toBe('nil');
    });

    it('returns t for an empty list (vacuous truth)', () => {
      expect(evalStr('(every (lambda (x) (> x 0)) nil)')).toBe('t');
    });
  });

  describe('some', () => {
    it('returns the first truthy result', () => {
      expect(evalStr('(some (lambda (x) (> x 5)) (list 1 2 9))')).toBe('t');
    });

    it('returns nil when no element satisfies', () => {
      expect(evalStr('(some (lambda (x) (> x 5)) (list 1 2 3))')).toBe('nil');
    });

    it('returns nil for an empty list', () => {
      expect(evalStr('(some (lambda (x) (> x 0)) nil)')).toBe('nil');
    });
  });

  describe('find', () => {
    it('returns the matching element', () => {
      expect(evalStr('(find 3 (list 1 2 3 4))')).toBe('3');
    });

    it('returns nil when not found', () => {
      expect(evalStr('(find 10 (list 1 2 3))')).toBe('nil');
    });

    it('returns nil for an empty list', () => {
      expect(evalStr('(find 1 nil)')).toBe('nil');
    });
  });

  describe('mapcan', () => {
    it('concatenates the lists returned by the function', () => {
      expect(
        Cons.toString(
          new LispInterpreter().evalString('(mapcan (lambda (x) (list x x)) (list 1 2 3))'),
        ),
      ).toBe('(1 1 2 2 3 3)');
    });

    it('skips nil results', () => {
      expect(
        Cons.toString(
          new LispInterpreter().evalString(
            '(mapcan (lambda (x) (if (> x 0) (list x) nil)) (list -1 1 -2 2))',
          ),
        ),
      ).toBe('(1 2)');
    });

    it('returns nil for an empty list', () => {
      expect(evalStr('(mapcan (lambda (x) (list x)) nil)')).toBe('nil');
    });
  });

  describe('sort', () => {
    it('sorts ascending with <', () => {
      expect(
        Cons.toString(new LispInterpreter().evalString('(sort (list 3 1 4 1 5 9 2 6) <)')),
      ).toBe('(1 1 2 3 4 5 6 9)');
    });

    it('sorts descending with >', () => {
      expect(
        Cons.toString(new LispInterpreter().evalString('(sort (list 3 1 4 1 5 9 2 6) >)')),
      ).toBe('(9 6 5 4 3 2 1 1)');
    });

    it('returns nil for an empty list', () => {
      expect(evalStr('(sort nil <)')).toBe('nil');
    });
  });

  describe('symbolp', () => {
    it('returns t for symbols', () => {
      expect(evalStr("(symbolp 'foo)")).toBe('t');
    });

    it('returns nil for non-symbols', () => {
      expect(evalStr('(symbolp 42)')).toBe('nil');
    });
  });

  describe('consp', () => {
    it('returns t for a Cons', () => {
      expect(evalStr('(consp (list 1 2))')).toBe('t');
    });

    it('returns nil for nil', () => {
      expect(evalStr('(consp nil)')).toBe('nil');
    });
  });

  describe('atom', () => {
    it('returns t for non-Cons values', () => {
      expect(evalStr('(atom 42)')).toBe('t');
      expect(evalStr('(atom nil)')).toBe('t');
    });

    it('returns nil for a Cons', () => {
      expect(evalStr('(atom (list 1 2))')).toBe('nil');
    });
  });

  describe('listp', () => {
    it('returns t for a Cons or nil', () => {
      expect(evalStr('(listp (list 1 2))')).toBe('t');
      expect(evalStr('(listp nil)')).toBe('t');
    });

    it('returns nil for an atom', () => {
      expect(evalStr('(listp 42)')).toBe('nil');
    });
  });

  describe('format', () => {
    it('inserts a stringified value with ~a', () => {
      expect(() => evalStr('(format "~a" "hi")')).not.toThrow();
    });

    it('does not crash with ~Na (right padding)', () => {
      expect(() => evalStr('(format "~5a" "hi")')).not.toThrow();
    });

    it('does not crash with ~-Na (left padding)', () => {
      expect(() => evalStr('(format "~-5a" "hi")')).not.toThrow();
    });

    it('handles multiple format directives', () => {
      expect(() => evalStr('(format "~a ~a" "hello" "world")')).not.toThrow();
    });
  });

  describe('=', () => {
    it('returns t for the same number', () => {
      expect(evalStr('(= 1 1)')).toBe('t');
    });

    it('returns nil for different numbers', () => {
      expect(evalStr('(= 1 2)')).toBe('nil');
    });
  });

  describe('<', () => {
    it('returns t for a less-than relation', () => {
      expect(evalStr('(< 1 2)')).toBe('t');
    });

    it('returns nil for a greater-than relation', () => {
      expect(evalStr('(< 2 1)')).toBe('nil');
    });
  });

  describe('>', () => {
    it('returns t for a greater-than relation', () => {
      expect(evalStr('(> 2 1)')).toBe('t');
    });

    it('returns nil for a less-than relation', () => {
      expect(evalStr('(> 1 2)')).toBe('nil');
    });
  });

  describe('<=', () => {
    it('returns t for a less-than-or-equal relation', () => {
      expect(evalStr('(<= 1 1)')).toBe('t');
      expect(evalStr('(<= 1 2)')).toBe('t');
    });

    it('returns nil for a greater-than relation', () => {
      expect(evalStr('(<= 2 1)')).toBe('nil');
    });
  });

  describe('>=', () => {
    it('returns t for a greater-than-or-equal relation', () => {
      expect(evalStr('(>= 1 1)')).toBe('t');
      expect(evalStr('(>= 2 1)')).toBe('t');
    });

    it('returns nil for a less-than relation', () => {
      expect(evalStr('(>= 1 2)')).toBe('nil');
    });
  });

  describe('and (kei-lisp specific)', () => {
    it('returns t when all arguments are truthy', () => {
      expect(evalStr('(and 1 2 3)')).toBe('t');
    });

    it('returns nil when any argument is nil', () => {
      expect(evalStr('(and 1 nil 3)')).toBe('nil');
    });
  });

  describe('or (kei-lisp specific)', () => {
    it('returns t when any argument is truthy', () => {
      expect(evalStr('(or nil nil 3)')).toBe('t');
    });

    it('returns nil when all arguments are nil', () => {
      expect(evalStr('(or nil nil)')).toBe('nil');
    });
  });

  describe('not', () => {
    it('returns t for nil', () => {
      expect(evalStr('(not nil)')).toBe('t');
    });

    it('returns nil for non-nil values', () => {
      expect(evalStr('(not 1)')).toBe('nil');
    });
  });

  describe('gensym', () => {
    it('generates a different symbol on each call', () => {
      const interpreter = new LispInterpreter();
      const s1 = interpreter.evalString('(gensym)');
      const s2 = interpreter.evalString('(gensym)');
      expect(s1).not.toBe(s2);
    });
  });

  describe('quote', () => {
    it('returns its argument unevaluated', () => {
      expect(evalStr('(quote foo)')).toBe('foo');
    });

    it("returns the same symbol for 'foo as for (quote foo)", () => {
      expect(evalStr("'foo")).toBe('foo');
    });
  });

  describe('mapcar', () => {
    it('returns the result of applying the function to each list element', () => {
      expect(evalStr('(mapcar (lambda (x) (* x x)) (list 1 2 3))')).toBe('(1 4 9)');
    });

    it('returns nil for an empty list', () => {
      expect(evalStr('(mapcar (lambda (x) x) nil)')).toBe('nil');
    });
  });

  describe('member', () => {
    it('returns the tail starting from the matching element when one exists', () => {
      expect(evalStr('(member 2 (list 1 2 3))')).toBe('(2 3)');
    });

    it('returns nil when the element is not present', () => {
      expect(evalStr('(member 99 (list 1 2 3))')).toBe('nil');
    });
  });

  describe('memq', () => {
    it('returns t when an eq-matching element exists', () => {
      expect(evalStr("(memq 'b (list 'a 'b 'c))")).toBe('t');
    });

    it('returns nil when no matching element exists', () => {
      expect(evalStr("(memq 'z (list 'a 'b 'c))")).toBe('nil');
    });
  });

  describe('integerp', () => {
    it('returns t for an integer', () => {
      expect(evalStr('(integerp 42)')).toBe('t');
    });

    it('returns nil for a float', () => {
      expect(evalStr('(integerp 3.14)')).toBe('nil');
    });
  });

  describe('floatp', () => {
    it('returns t for a number within IEEE 32-bit range', () => {
      expect(evalStr('(floatp 3.14)')).toBe('t');
    });

    it('returns t for an integer within IEEE 32-bit range (range check, not type-tag)', () => {
      expect(evalStr('(floatp 42)')).toBe('t');
    });

    it('returns nil for a non-number', () => {
      expect(evalStr('(floatp "foo")')).toBe('nil');
    });

    it('returns nil for a value beyond the IEEE 32-bit range', () => {
      expect(evalStr('(floatp 1e40)')).toBe('nil');
    });
  });

  describe('evenp', () => {
    it('returns t for an even integer', () => {
      expect(evalStr('(evenp 4)')).toBe('t');
    });

    it('returns t for zero', () => {
      expect(evalStr('(evenp 0)')).toBe('t');
    });

    it('returns t for a negative even integer', () => {
      expect(evalStr('(evenp -6)')).toBe('t');
    });

    it('returns nil for an odd integer', () => {
      expect(evalStr('(evenp 3)')).toBe('nil');
    });

    it('returns nil for a non-integer number', () => {
      expect(evalStr('(evenp 2.5)')).toBe('nil');
    });

    it('returns nil for a non-number', () => {
      expect(evalStr('(evenp "foo")')).toBe('nil');
    });
  });

  describe('oddp', () => {
    it('returns t for an odd integer', () => {
      expect(evalStr('(oddp 5)')).toBe('t');
    });

    it('returns t for a negative odd integer', () => {
      expect(evalStr('(oddp -7)')).toBe('t');
    });

    it('returns nil for zero', () => {
      expect(evalStr('(oddp 0)')).toBe('nil');
    });

    it('returns nil for an even integer', () => {
      expect(evalStr('(oddp 4)')).toBe('nil');
    });

    it('returns nil for a non-integer number', () => {
      expect(evalStr('(oddp 3.5)')).toBe('nil');
    });

    it('returns nil for a non-number', () => {
      expect(evalStr('(oddp "bar")')).toBe('nil');
    });
  });

  describe('zerop', () => {
    it('returns t for zero', () => {
      expect(evalStr('(zerop 0)')).toBe('t');
    });

    it('returns t for floating-point zero', () => {
      expect(evalStr('(zerop 0.0)')).toBe('t');
    });

    it('returns nil for a positive number', () => {
      expect(evalStr('(zerop 1)')).toBe('nil');
    });

    it('returns nil for a negative number', () => {
      expect(evalStr('(zerop -1)')).toBe('nil');
    });

    it('returns nil for a non-number', () => {
      expect(evalStr('(zerop "0")')).toBe('nil');
    });
  });

  describe('plusp', () => {
    it('returns t for a positive integer', () => {
      expect(evalStr('(plusp 3)')).toBe('t');
    });

    it('returns t for a positive float', () => {
      expect(evalStr('(plusp 0.1)')).toBe('t');
    });

    it('returns nil for zero', () => {
      expect(evalStr('(plusp 0)')).toBe('nil');
    });

    it('returns nil for a negative number', () => {
      expect(evalStr('(plusp -2)')).toBe('nil');
    });

    it('returns nil for a non-number', () => {
      expect(evalStr('(plusp "1")')).toBe('nil');
    });
  });

  describe('minusp', () => {
    it('returns t for a negative integer', () => {
      expect(evalStr('(minusp -3)')).toBe('t');
    });

    it('returns t for a negative float', () => {
      expect(evalStr('(minusp -0.1)')).toBe('t');
    });

    it('returns nil for zero', () => {
      expect(evalStr('(minusp 0)')).toBe('nil');
    });

    it('returns nil for a positive number', () => {
      expect(evalStr('(minusp 2)')).toBe('nil');
    });

    it('returns nil for a non-number', () => {
      expect(evalStr('(minusp "-1")')).toBe('nil');
    });
  });

  describe('neq', () => {
    it('returns the negation of eq', () => {
      expect(evalStr("(neq 'x 'y)")).toBe('t');
      expect(evalStr("(neq 'x 'x)")).toBe('nil');
    });
  });

  describe('nequal', () => {
    it('returns the negation of equal', () => {
      expect(evalStr('(nequal (list 1 2) (list 1 3))')).toBe('t');
      expect(evalStr('(nequal (list 1 2) (list 1 2))')).toBe('nil');
    });
  });

  describe('nth (built-in)', () => {
    it('returns the nth element of a list (1-based)', () => {
      expect(evalStr('(nth 2 (list 10 20 30))')).toBe('20');
    });

    it('returns nil when the index is out of range', () => {
      expect(evalStr('(nth 99 (list 1 2))')).toBe('nil');
    });
  });

  describe('last (built-in)', () => {
    it('returns the last Cons cell (a single-element tail) of a list', () => {
      expect(evalStr('(last (list 1 2 3))')).toBe('(3)');
    });
  });

  describe('pi (constant)', () => {
    it('returns Math.PI', () => {
      const interpreter = new LispInterpreter();
      const result = interpreter.evalString('(pi)');
      expect(result).toBeCloseTo(Math.PI);
    });
  });

  describe('sqrt / sin / cos / tan', () => {
    it('sqrt returns the square root', () => {
      expect(evalStr('(sqrt 16)')).toBe('4');
    });

    it('sin / cos / tan return the corresponding trigonometric values', () => {
      const interpreter = new LispInterpreter();
      const sin0 = interpreter.evalString('(sin 0)');
      const cos0 = interpreter.evalString('(cos 0)');
      expect(sin0).toBeCloseTo(0);
      expect(cos0).toBeCloseTo(1);
    });
  });

  describe('round', () => {
    it('rounds a decimal to the nearest integer', () => {
      expect(evalStr('(round 3.4)')).toBe('3');
      expect(evalStr('(round 3.6)')).toBe('4');
    });
  });

  describe('expt', () => {
    it('computes integer exponent', () => {
      expect(evalStr('(expt 2 10)')).toBe('1024');
    });

    it('computes fractional exponent (square root)', () => {
      expect(evalStr('(expt 9 0.5)')).toBe('3');
    });

    it('returns 1 for any base raised to 0', () => {
      expect(evalStr('(expt 5 0)')).toBe('1');
    });

    it('throws when base is not a number', () => {
      expect(() => evalStr('(expt "x" 2)')).toThrow();
    });
  });

  describe('truncate', () => {
    it('truncates toward zero for positive', () => {
      expect(evalStr('(truncate 3.7)')).toBe('3');
    });

    it('truncates toward zero for negative', () => {
      expect(evalStr('(truncate -3.7)')).toBe('-3');
    });

    it('returns the integer unchanged', () => {
      expect(evalStr('(truncate 5)')).toBe('5');
    });

    it('throws on non-number', () => {
      expect(() => evalStr('(truncate "x")')).toThrow();
    });
  });

  describe('floor', () => {
    it('rounds toward negative infinity for positive', () => {
      expect(evalStr('(floor 3.7)')).toBe('3');
    });

    it('rounds toward negative infinity for negative', () => {
      expect(evalStr('(floor -3.2)')).toBe('-4');
    });

    it('throws on non-number', () => {
      expect(() => evalStr('(floor "x")')).toThrow();
    });
  });

  describe('ceiling', () => {
    it('rounds toward positive infinity for positive', () => {
      expect(evalStr('(ceiling 3.2)')).toBe('4');
    });

    it('rounds toward positive infinity for negative', () => {
      expect(evalStr('(ceiling -3.7)')).toBe('-3');
    });

    it('throws on non-number', () => {
      expect(() => evalStr('(ceiling "x")')).toThrow();
    });
  });

  describe('min', () => {
    it('returns the smallest of multiple arguments', () => {
      expect(evalStr('(min 3 1 4 1 5 9 2 6)')).toBe('1');
    });

    it('returns the single argument when given one', () => {
      expect(evalStr('(min 42)')).toBe('42');
    });

    it('handles mixed integer and float', () => {
      expect(evalStr('(min 2 1.5 3)')).toBe('1.5');
    });

    it('throws on non-number argument', () => {
      expect(() => evalStr('(min 1 "x" 3)')).toThrow();
    });
  });

  describe('max', () => {
    it('returns the largest of multiple arguments', () => {
      expect(evalStr('(max 3 1 4 1 5 9 2 6)')).toBe('9');
    });

    it('returns the single argument when given one', () => {
      expect(evalStr('(max 42)')).toBe('42');
    });

    it('handles mixed integer and float', () => {
      expect(evalStr('(max 2 1.5 3)')).toBe('3');
    });

    it('throws on non-number argument', () => {
      expect(() => evalStr('(max 1 "x" 3)')).toThrow();
    });
  });

  describe('rplaca / rplacd', () => {
    it('rplaca mutates car in place', () => {
      const interpreter = new LispInterpreter();
      interpreter.evalString('(setq x (list 1 2 3))');
      interpreter.evalString('(rplaca x 99)');
      expect(Cons.toString(interpreter.evalString('(car x)'))).toBe('99');
    });

    it('rplacd mutates cdr in place', () => {
      const interpreter = new LispInterpreter();
      interpreter.evalString('(setq x (list 1 2 3))');
      interpreter.evalString("(rplacd x '(99))");
      expect(Cons.toString(interpreter.evalString('(cdr x)'))).toBe('(99)');
    });
  });

  describe('push / pop', () => {
    it('push prepends an element to the list stored in the variable', () => {
      const interpreter = new LispInterpreter();
      interpreter.evalString('(setq stack (list 1 2 3))');
      interpreter.evalString('(push 0 stack)');
      expect(Cons.toString(interpreter.evalString('stack'))).toBe('(0 1 2 3)');
    });

    it('pop removes the first element of the list stored in the variable', () => {
      const interpreter = new LispInterpreter();
      interpreter.evalString('(setq stack (list 1 2 3))');
      const popped = interpreter.evalString('(pop stack)');
      expect(popped).toBe(1);
    });
  });

  describe('spyPrint', () => {
    it('writes the indented line followed by newline to the given WritableStream', () => {
      const chunks: string[] = [];
      const mockStream = {
        write: (chunk: string): boolean => {
          chunks.push(chunk);
          return true;
        },
      } as unknown as NodeJS.WritableStream;
      newApplier().spyPrint(mockStream, 'hello');
      expect(chunks.join('')).toBe('hello\n');
    });

    it('falls back to stdout when the argument is a string descriptor', () => {
      expect(() => newApplier().spyPrint('some-label', 'hello')).not.toThrow();
    });

    it('falls back to stdout when the argument is null', () => {
      expect(() => newApplier().spyPrint(null, 'hello')).not.toThrow();
    });

    it('returns null', () => {
      expect(newApplier().spyPrint(null, 'x')).toBeNull();
    });
  });
});
