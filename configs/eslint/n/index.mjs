import pluginN from 'eslint-plugin-n';
import { srcFiles } from '../constants.mjs';

/**
 * eslint-plugin-n設定
 *
 * @remarks
 * - Node.js固有のベストプラクティスを強制する。
 * - flat/recommended は設定オブジェクトの配列として提供される。
 */
export const nConfigs = [
  // 推奨ルール
  ...pluginN.configs['flat/recommended'].map((config) => ({ ...config, files: srcFiles })),
  {
    files: srcFiles,
    rules: {},
  },
];
