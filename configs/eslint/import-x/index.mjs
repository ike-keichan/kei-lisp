import pluginImportX from 'eslint-plugin-import-x';
import { RULE_LEVEL } from '../const/index.mjs';

const { ERROR, WARN } = RULE_LEVEL;

/**
 * ESLint config for eslint-plugin-import-x.
 */
export const importXConfigs = [
  pluginImportX.flatConfigs.recommended,
  {
    settings: {
      'import-x/resolver': { typescript: true, node: true },
    },
    rules: {
      // 解決できないインポートパスを警告
      // TODO: TS 移行完了後は ERROR に変更
      'import-x/no-unresolved': WARN,
      // 同一モジュールの重複インポートを禁止
      'import-x/no-duplicates': ERROR,
      // モジュール間の循環依存を警告
      'import-x/no-cycle': WARN,
      // 自身のモジュールのインポートを禁止
      'import-x/no-self-import': ERROR,
      // 冗長なパスセグメントの使用を禁止
      'import-x/no-useless-path-segments': ERROR,
      // import 文をファイル先頭に記述を強制
      'import-x/first': ERROR,
      // import 文の順序を警告
      'import-x/order': WARN,
    },
  },
];
