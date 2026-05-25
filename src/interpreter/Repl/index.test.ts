import { describe, expect, it } from 'vitest';

import { LispInterpreter } from '../LispInterpreter/index.js';
import { Repl } from './index.js';

describe('Repl', () => {
  describe('constructor', () => {
    it('creates an internal LispInterpreter when called without arguments', () => {
      const repl = new Repl();
      expect(repl.interpreter).toBeInstanceOf(LispInterpreter);
      repl.rl.close();
    });

    it('uses the provided LispInterpreter instance', () => {
      const interpreter = new LispInterpreter();
      const repl = new Repl(interpreter);
      expect(repl.interpreter).toBe(interpreter);
      repl.rl.close();
    });

    it('creates a readline interface', () => {
      const repl = new Repl();
      expect(repl.rl).toBeDefined();
      repl.rl.close();
    });
  });
});
