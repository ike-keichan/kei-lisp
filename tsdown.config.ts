import { defineConfig } from 'tsdown';

export default defineConfig([
  // ライブラリエントリ（import / require 用）
  {
    entry: { index: 'src/index.ts' },
    format: ['cjs', 'esm'],
    platform: 'node',
    target: 'node24',
    clean: true,
    sourcemap: true,
    shims: true,
    dts: true,
    fixedExtension: false,
  },
  // CLI エントリ
  {
    entry: { cli: 'src/cli.ts' },
    format: ['cjs'],
    platform: 'node',
    target: 'node24',
    shims: true,
    fixedExtension: false,
    outputOptions: {
      banner: '#!/usr/bin/env node\n',
    },
  },
]);
