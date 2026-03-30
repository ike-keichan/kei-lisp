import securityPlugin from 'eslint-plugin-security';
import { srcFiles } from '../constants.mjs';

/**
 * eslint-plugin-security設定
 *
 * @remarks
 * - プラグイン設定：レコメンドに含まれているため、宣言不要。
 */
export const securityConfigs = [
  // 推奨ルール
  { ...securityPlugin.configs.recommended, files: srcFiles },
  {
    files: srcFiles,
    rules: {},
  },
];
