import { describe, expect, it } from 'vitest';

import pkg from '../../../package.json' with { type: 'json' };

import { CliApp } from './index.js';

const runCli = (
  args: string[],
): { stdout: string[]; stderr: string[]; status: number; replStarted: boolean } => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  let replStarted = false;
  const status = CliApp.run(
    args,
    (line) => stdout.push(line),
    (line) => stderr.push(line),
    () => {
      replStarted = true;
    },
  );
  return { stdout, stderr, status, replStarted };
};

describe('CliApp', () => {
  describe('run', () => {
    describe('--version', () => {
      it('prints the package version', () => {
        expect(runCli(['--version']).stdout).toEqual([`kei-lisp v${pkg.version}`]);
      });

      it('accepts the -v short flag', () => {
        expect(runCli(['-v']).stdout.join('')).toContain(pkg.version);
      });

      it('returns exit code 0', () => {
        expect(runCli(['--version']).status).toBe(0);
      });

      it('does not start the REPL', () => {
        expect(runCli(['--version']).replStarted).toBe(false);
      });
    });

    describe('--help', () => {
      it('prints the usage message', () => {
        expect(runCli(['--help']).stdout.join('')).toContain('Usage: kei-lisp [options]');
      });

      it('accepts the -h short flag', () => {
        expect(runCli(['-h']).stdout.join('')).toContain('Usage: kei-lisp [options]');
      });

      it('returns exit code 0', () => {
        expect(runCli(['--help']).status).toBe(0);
      });
    });

    describe('unknown argument', () => {
      it('reports the unknown argument on stderr', () => {
        expect(runCli(['--bogus']).stderr.join('\n')).toContain('unknown argument: --bogus');
      });

      it('prints the usage message on stderr', () => {
        expect(runCli(['--bogus']).stderr.join('\n')).toContain('Usage: kei-lisp [options]');
      });

      it('returns exit code 1', () => {
        expect(runCli(['--bogus']).status).toBe(1);
      });

      it('does not start the REPL', () => {
        expect(runCli(['--bogus']).replStarted).toBe(false);
      });
    });

    describe('no arguments', () => {
      it('starts the REPL', () => {
        expect(runCli([]).replStarted).toBe(true);
      });

      it('returns exit code 0', () => {
        expect(runCli([]).status).toBe(0);
      });
    });
  });
});
