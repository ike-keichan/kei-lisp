import { describe, expect, it } from 'vitest';

import * as api from './index.js';

describe('public exports', () => {
  it.each([
    'LispInterpreter',
    'Repl',
    'Cons',
    'InterpretedSymbol',
    'Numeric',
    'Rational',
    'Evaluator',
    'StreamManager',
    'Table',
    'EvalError',
    'ExitError',
    'KeiLispError',
    'ParseError',
  ])('exports %s', (name) => {
    expect(api[name as keyof typeof api]).toBeTypeOf('function');
  });

  it('exports a working LispInterpreter', () => {
    const interpreter = new api.LispInterpreter();
    expect(interpreter.evalString('(+ 1 2)')).toBe(3n);
  });

  it('exposes the error hierarchy rooted at KeiLispError', () => {
    expect(new api.EvalError('x')).toBeInstanceOf(api.KeiLispError);
  });
});
