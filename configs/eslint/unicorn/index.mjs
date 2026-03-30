import pluginUnicorn from 'eslint-plugin-unicorn';
import { srcFiles } from '../constants.mjs';

/**
 * eslint-plugin-unicorn設定
 *
 * @remarks
 * - プラグイン設定：レコメンドに含まれているため、宣言不要。
 * - prevent-abbreviations / filename-case は既存コードベースに合わせて無効化。
 */
export const unicornConfigs = [
  // 推奨ルール
  { ...pluginUnicorn.configs['flat/recommended'], files: srcFiles },
  {
    files: srcFiles,
    rules: {
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/filename-case': 'off',
    },
  },
];
