import { describe, expect, it } from 'vitest';

import { KeiLispError } from './index.js';

describe('KeiLispError', () => {
  describe('constructor', () => {
    it('sets the given message', () => {
      expect(new KeiLispError('oops').message).toBe('oops');
    });

    it('sets name to "KeiLispError"', () => {
      expect(new KeiLispError('x').name).toBe('KeiLispError');
    });

    it('is an instance of Error', () => {
      expect(new KeiLispError('x')).toBeInstanceOf(Error);
    });

    it('is an instance of KeiLispError itself', () => {
      expect(new KeiLispError('x')).toBeInstanceOf(KeiLispError);
    });

    it('has a stack trace', () => {
      expect(new KeiLispError('x').stack).toBeDefined();
    });
  });

  describe('throw behavior', () => {
    it('is detected by toThrow(KeiLispError) when thrown', () => {
      expect(() => {
        throw new KeiLispError('boom');
      }).toThrow(KeiLispError);
    });

    it('is also detected by toThrow(Error)', () => {
      expect(() => {
        throw new KeiLispError('boom');
      }).toThrow(Error);
    });
  });
});
