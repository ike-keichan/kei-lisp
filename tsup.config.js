import { defineConfig } from 'tsup';

export default defineConfig([
    // ライブラリエントリ（import / require 用）
    {
        entry: { index: 'src/index.js' },
        format: ['cjs', 'esm'],
        platform: 'node',
        target: 'node24',
        clean: true,
        splitting: true,
        sourcemap: true,
        treeshake: true,
        shims: true,
    },
    // CLI エントリ
    {
        entry: { cli: 'src/cli.js' },
        format: ['cjs'],
        platform: 'node',
        target: 'node24',
        shims: true,
        banner: {
            js: '#!/usr/bin/env node',
        },
    },
]);
