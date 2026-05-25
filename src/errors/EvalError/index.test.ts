import { describe, expect, it } from 'vitest';

import { KeiLispError } from '../KeiLispError/index.js';
import { EvalError } from './index.js';

describe('EvalError', () => {
  describe('constructor', () => {
    it('sets the given message', () => {
      expect(new EvalError('type mismatch').message).toBe('type mismatch');
    });

    it('sets name to "EvalError"', () => {
      expect(new EvalError('x').name).toBe('EvalError');
    });

    it('is an instance of KeiLispError', () => {
      expect(new EvalError('x')).toBeInstanceOf(KeiLispError);
    });

    it('is an instance of Error', () => {
      expect(new EvalError('x')).toBeInstanceOf(Error);
    });

    it('is an instance of EvalError itself', () => {
      expect(new EvalError('x')).toBeInstanceOf(EvalError);
    });
  });
});
