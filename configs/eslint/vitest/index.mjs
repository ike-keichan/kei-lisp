import globals from 'globals';
import pluginVitest from 'eslint-plugin-vitest';
import { testFiles } from '../constants.mjs';

/**
 * eslint-plugin-vitest設定
 *
 * @remarks
 * - プラグイン設定：推奨ルールに含まれているため、宣言不要。
 * - テスト環境のグローバル変数（describe, it, expect 等）を設定する。
 */
export const vitestConfigs = [
  {
    files: testFiles,
    plugins: { vitest: pluginVitest },
    languageOptions: {
      globals: {
        ...globals.node,
        ...pluginVitest.environments.env.globals,
      },
    },
    rules: {
      ...pluginVitest.configs.recommended.rules,
    },
  },
];
