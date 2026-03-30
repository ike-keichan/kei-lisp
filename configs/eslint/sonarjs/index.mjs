import pluginSonarjs from 'eslint-plugin-sonarjs';
import { srcFiles } from '../constants.mjs';

/**
 * eslint-plugin-sonarjs設定
 *
 * @remarks
 * - プラグイン設定：レコメンドに含まれているため、宣言不要。
 */
export const sonarjsConfigs = [
  // 推奨ルール
  { ...pluginSonarjs.configs.recommended, files: srcFiles },
  {
    files: srcFiles,
    rules: {},
  },
];
