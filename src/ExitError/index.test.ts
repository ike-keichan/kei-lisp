import { describe, expect, it } from 'vitest';

import { ExitError } from './index.js';

describe('ExitError', () => {
  describe('constructor', () => {
    it('引数なしで構築できる', () => {
      const e = new ExitError();
      expect(e).toBeDefined();
    });

    it('name は "ExitError"', () => {
      const e = new ExitError();
      expect(e.name).toBe('ExitError');
    });

    it('message は "Exit"', () => {
      const e = new ExitError();
      expect(e.message).toBe('Exit');
    });

    it('Error のサブクラス', () => {
      const e = new ExitError();
      expect(e).toBeInstanceOf(Error);
      expect(e).toBeInstanceOf(ExitError);
    });

    it('stack trace を持つ (Error 由来)', () => {
      const e = new ExitError();
      expect(e.stack).toBeDefined();
    });
  });

  describe('throw / catch 動作', () => {
    it('throw して catch でき、ExitError として識別される', () => {
      expect(() => {
        throw new ExitError();
      }).toThrow(ExitError);
    });

    it('Error として catch しても識別可能', () => {
      expect(() => {
        throw new ExitError();
      }).toThrow(Error);
    });
  });
});
