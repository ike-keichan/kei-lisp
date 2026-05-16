import { describe, expect, it } from 'vitest';

import { ExitError } from './index.js';

describe('ExitError', () => {
  describe('constructor', () => {
    it('引数なしで構築できる', () => {
      expect(new ExitError()).toBeDefined();
    });

    it('name に "ExitError" を設定する', () => {
      expect(new ExitError().name).toBe('ExitError');
    });

    it('message に "Exit" を設定する', () => {
      expect(new ExitError().message).toBe('Exit');
    });

    it('Error のインスタンスである', () => {
      expect(new ExitError()).toBeInstanceOf(Error);
    });

    it('ExitError 自身のインスタンスである', () => {
      expect(new ExitError()).toBeInstanceOf(ExitError);
    });

    it('stack trace を持つ', () => {
      expect(new ExitError().stack).toBeDefined();
    });
  });

  describe('throw 挙動', () => {
    it('throw して toThrow(ExitError) で検知する', () => {
      expect(() => {
        throw new ExitError();
      }).toThrow(ExitError);
    });

    it('toThrow(Error) でも検知する', () => {
      expect(() => {
        throw new ExitError();
      }).toThrow(Error);
    });
  });
});
