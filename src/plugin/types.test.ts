import { describe, expect, it } from 'vitest';

import { Cons } from '../value/Cons/index.js';
import { InterpretedSymbol } from '../value/InterpretedSymbol/index.js';
import { LispInterpreter } from '../interpreter/LispInterpreter/index.js';
import type { LispValue } from '../types/index.js';
import type { KeiLispPlugin, PluginContext } from './types.js';

class GreetPlugin implements KeiLispPlugin {
  readonly name = 'greet';
  readonly #symbols = new Set([InterpretedSymbol.of('greet')]);
  has(symbol: InterpretedSymbol): boolean {
    return this.#symbols.has(symbol);
  }
  apply(_symbol: InterpretedSymbol, args: Cons): LispValue {
    return `Hello, ${String(args.car)}!`;
  }
}

class DoublePlugin implements KeiLispPlugin {
  readonly name = 'double';
  readonly #symbols = new Set([InterpretedSymbol.of('double')]);
  has(symbol: InterpretedSymbol): boolean {
    return this.#symbols.has(symbol);
  }
  apply(_symbol: InterpretedSymbol, args: Cons): LispValue {
    return (args.car as bigint) * 2n;
  }
}

/** A plugin that uses ctx.eval to evaluate a sub-form, exercising the recursive eval hook. */
class TwicePlugin implements KeiLispPlugin {
  readonly name = 'twice';
  readonly #symbols = new Set([InterpretedSymbol.of('twice-of-first')]);
  has(symbol: InterpretedSymbol): boolean {
    return this.#symbols.has(symbol);
  }
  apply(_symbol: InterpretedSymbol, args: Cons, ctx: PluginContext): LispValue {
    return ctx.eval(
      new Cons(InterpretedSymbol.of('+'), new Cons(args.car, new Cons(args.car, Cons.nil))),
    );
  }
}

describe('KeiLispPlugin', () => {
  it('routes a registered symbol to the plugin', () => {
    const interpreter = new LispInterpreter();
    interpreter.use(new GreetPlugin());
    expect(interpreter.evalString('(greet "world")')).toBe('Hello, world!');
  });

  it('evaluates arguments before passing them to the plugin', () => {
    const interpreter = new LispInterpreter();
    interpreter.use(new DoublePlugin());
    expect(interpreter.evalString('(double (+ 1 2))')).toBe(6n);
  });

  it('falls through to built-ins when no plugin claims the symbol', () => {
    const interpreter = new LispInterpreter();
    interpreter.use(new GreetPlugin());
    expect(interpreter.evalString('(+ 1 2 3)')).toBe(6n);
  });

  it('throws when no plugin and no built-in claim the symbol', () => {
    const interpreter = new LispInterpreter();
    interpreter.use(new GreetPlugin());
    expect(() => interpreter.evalString('(undefined-fn 1)')).toThrow();
  });

  it('honors registration order (first-match-wins) on symbol collision', () => {
    class GreetUpper implements KeiLispPlugin {
      readonly name = 'greet-upper';
      readonly #symbols = new Set([InterpretedSymbol.of('greet')]);
      has(symbol: InterpretedSymbol): boolean {
        return this.#symbols.has(symbol);
      }
      apply(_symbol: InterpretedSymbol, args: Cons): LispValue {
        return `HELLO, ${String(args.car).toUpperCase()}!`;
      }
    }
    const interpreter = new LispInterpreter();
    interpreter.use(new GreetPlugin());
    interpreter.use(new GreetUpper());
    expect(interpreter.evalString('(greet "world")')).toBe('Hello, world!');
  });

  it('exposes ctx.eval so plugins can recursively evaluate forms', () => {
    const interpreter = new LispInterpreter();
    interpreter.use(new TwicePlugin());
    expect(interpreter.evalString('(twice-of-first 5)')).toBe(10n);
  });

  it('keeps plugin behavior across nested calls (plugins thread through Evaluator)', () => {
    const interpreter = new LispInterpreter();
    interpreter.use(new DoublePlugin());
    expect(interpreter.evalString('(+ (double 3) (double 4))')).toBe(14n);
  });

  it('use() returns the interpreter for chaining', () => {
    const interpreter = new LispInterpreter();
    const result = interpreter.use(new GreetPlugin()).use(new DoublePlugin());
    expect(result).toBe(interpreter);
    expect(interpreter.plugins).toHaveLength(2);
  });
});

describe('plugin dispatch inside user-defined functions', () => {
  it('resolves plugin symbols inside a defun body', () => {
    const interpreter = new LispInterpreter();
    interpreter.use(new DoublePlugin());
    interpreter.evalString('(defun quadruple (n) (double (double n)))');
    expect(interpreter.evalString('(quadruple 3)')).toBe(12n);
  });

  it('resolves plugin symbols inside a lambda passed to mapcar', () => {
    const interpreter = new LispInterpreter();
    interpreter.use(new DoublePlugin());
    expect(String(interpreter.evalString('(mapcar (lambda (n) (double n)) (list 1 2 3))'))).toBe(
      '(2 4 6)',
    );
  });

  it('resolves plugin symbols inside a lambda passed to mapcan', () => {
    const interpreter = new LispInterpreter();
    interpreter.use(new DoublePlugin());
    expect(
      String(interpreter.evalString('(mapcan (lambda (n) (list (double n))) (list 1 2))')),
    ).toBe('(2 4)');
  });

  it('resolves plugin symbols inside a lambda passed to reduce', () => {
    const interpreter = new LispInterpreter();
    interpreter.use(new DoublePlugin());
    expect(interpreter.evalString('(reduce (lambda (a b) (+ (double a) b)) (list 1 2 3))')).toBe(
      11n,
    );
  });

  it('resolves plugin symbols inside predicates passed to every / some / remove-if', () => {
    const interpreter = new LispInterpreter();
    interpreter.use(new DoublePlugin());
    expect(interpreter.evalString('(every (lambda (n) (integerp (double n))) (list 1 2))')).toBe(
      InterpretedSymbol.of('t'),
    );
    expect(interpreter.evalString('(some (lambda (n) (= (double n) 4)) (list 1 2 3))')).toBe(
      InterpretedSymbol.of('t'),
    );
    expect(
      String(interpreter.evalString('(remove-if (lambda (n) (= (double n) 4)) (list 1 2 3))')),
    ).toBe('(1 3)');
  });

  it('resolves plugin symbols inside a sort comparator', () => {
    const interpreter = new LispInterpreter();
    interpreter.use(new DoublePlugin());
    expect(
      String(
        interpreter.evalString('(sort (list 3 1 2) (lambda (a b) (< (double a) (double b))))'),
      ),
    ).toBe('(1 2 3)');
  });
});
