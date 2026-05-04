import pluginUnusedImports from 'eslint-plugin-unused-imports';
import { RULE_LEVEL } from '../const/index.mjs';

const { ERROR, WARN, OFF } = RULE_LEVEL;

/**
 * ESLint config for eslint-plugin-unused-imports.
 *
 * The base `no-unused-vars` rule and the typescript-eslint variant are both disabled
 * in favor of `unused-imports/no-unused-vars`.
 */
export const unusedImportsConfigs = [
  {
    plugins: {
      'unused-imports': pluginUnusedImports,
    },
    rules: {
      // unused-imports/no-unused-vars に委譲するため無効化
      'no-unused-vars': OFF,
      // TODO: TS 移行完了後は @typescript-eslint/no-unused-vars との競合を避けるため無効化を維持
      '@typescript-eslint/no-unused-vars': OFF,
      // 未使用の import 文を禁止
      'unused-imports/no-unused-imports': ERROR,
      // 未使用の変数を警告（_プレフィックスで抑制可能）
      'unused-imports/no-unused-vars': [
        WARN,
        { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' },
      ],
    },
  },
];
