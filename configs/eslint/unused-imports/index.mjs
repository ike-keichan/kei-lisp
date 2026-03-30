import pluginUnusedImports from 'eslint-plugin-unused-imports';
import { srcFiles } from '../constants.mjs';

/**
 * eslint-plugin-unused-imports設定
 *
 * @remarks
 * - 未使用インポートおよび変数を検出する。
 * - no-unused-vars は本プラグイン側で処理するため無効化。
 */
export const unusedImportsConfigs = [
  {
    files: srcFiles,
    plugins: {
      'unused-imports': pluginUnusedImports,
    },
    rules: {
      'no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' },
      ],
    },
  },
];
