import pluginImportX from 'eslint-plugin-import-x';
import { srcFiles } from '../constants.mjs';

/**
 * eslint-plugin-import-x設定
 *
 * @remarks
 * - インポートの解決・重複検出を行う。
 */
export const importXConfigs = [
  {
    files: srcFiles,
    plugins: {
      'import-x': pluginImportX,
    },
    settings: {
      'import-x/resolver': { typescript: true, node: true },
    },
    rules: {
      'import-x/no-unresolved': 'warn',
      'import-x/no-duplicates': 'error',
    },
  },
];
