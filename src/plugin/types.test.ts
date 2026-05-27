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
    return (args.car as number) * 2;
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
    expect(interpreter.evalString('(double (+ 1 2))')).toBe(6);
  });

  it('falls through to built-ins when no plugin claims the symbol', () => {
    const interpreter = new LispInterpreter();
    interpreter.use(new GreetPlugin());
    expect(interpreter.evalString('(+ 1 2 3)')).toBe(6);
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
    expect(interpreter.evalString('(twice-of-first 5)')).toBe(10);
  });

  it('keeps plugin behavior across nested calls (plugins thread through Evaluator)', () => {
    const interpreter = new LispInterpreter();
    interpreter.use(new DoublePlugin());
    expect(interpreter.evalString('(+ (double 3) (double 4))')).toBe(14);
  });

  it('use() returns the interpreter for chaining', () => {
    const interpreter = new LispInterpreter();
    const result = interpreter.use(new GreetPlugin()).use(new DoublePlugin());
    expect(result).toBe(interpreter);
    expect(interpreter.plugins.length).toBe(2);
  });
});
