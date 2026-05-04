import tseslint from 'typescript-eslint';
import { FILES, RULE_LEVEL } from '../const/index.mjs';

const { TEST } = FILES;
const { ERROR, WARN } = RULE_LEVEL;

/**
 * ESLint config for typescript-eslint.
 *
 * TODO: tsconfig の parserOptions.project 設定後、strictTypeChecked に切り替える。
 */
export const typescriptConfigs = [
  ...tseslint.configs.strict,
  {
    rules: {
      // any の使用を禁止
      '@typescript-eslint/no-explicit-any': ERROR,
      // null 非許容アサーション（!）の使用を禁止
      '@typescript-eslint/no-non-null-assertion': ERROR,
    },
  },
  {
    // テストコードではモック等で any を使いやすくするため警告に緩和
    files: TEST,
    rules: {
      '@typescript-eslint/no-explicit-any': WARN,
    },
  },
];
