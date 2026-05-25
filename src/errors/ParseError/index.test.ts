import { describe, expect, it } from 'vitest';

import { KeiLispError } from '../KeiLispError/index.js';
import { ParseError } from './index.js';

describe('ParseError', () => {
  describe('constructor', () => {
    it('sets the given message', () => {
      expect(new ParseError('bad syntax').message).toBe('bad syntax');
    });

    it('sets name to "ParseError"', () => {
      expect(new ParseError('x').name).toBe('ParseError');
    });

    it('is an instance of KeiLispError', () => {
      expect(new ParseError('x')).toBeInstanceOf(KeiLispError);
    });

    it('is an instance of Error', () => {
      expect(new ParseError('x')).toBeInstanceOf(Error);
    });

    it('is an instance of ParseError itself', () => {
      expect(new ParseError('x')).toBeInstanceOf(ParseError);
    });
  });
});
