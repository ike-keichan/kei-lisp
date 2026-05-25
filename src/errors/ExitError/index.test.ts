import { describe, expect, it } from 'vitest';

import { ExitError } from './index.js';

describe('ExitError', () => {
  describe('constructor', () => {
    it('can be constructed without arguments', () => {
      expect(new ExitError()).toBeDefined();
    });

    it('sets name to "ExitError"', () => {
      expect(new ExitError().name).toBe('ExitError');
    });

    it('sets message to "Exit"', () => {
      expect(new ExitError().message).toBe('Exit');
    });

    it('is an instance of Error', () => {
      expect(new ExitError()).toBeInstanceOf(Error);
    });

    it('is an instance of ExitError itself', () => {
      expect(new ExitError()).toBeInstanceOf(ExitError);
    });

    it('has a stack trace', () => {
      expect(new ExitError().stack).toBeDefined();
    });
  });

  describe('throw behavior', () => {
    it('is detected by toThrow(ExitError) when thrown', () => {
      expect(() => {
        throw new ExitError();
      }).toThrow(ExitError);
    });

    it('is also detected by toThrow(Error)', () => {
      expect(() => {
        throw new ExitError();
      }).toThrow(Error);
    });
  });
});
