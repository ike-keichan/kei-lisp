import pluginVitest from 'eslint-plugin-vitest';
import { RULE_LEVEL } from '../const/index.mjs';

const { ERROR, WARN } = RULE_LEVEL;

/**
 * ESLint config for eslint-plugin-vitest.
 */
export const vitestConfigs = [
  pluginVitest.configs.recommended,
  {
    rules: {
      // .only の残存を禁止（CI 全体に影響するため）
      'vitest/no-focused-tests': ERROR,
      // .skip の残存を警告
      'vitest/no-disabled-tests': WARN,
      // プリミティブに toEqual より toBe の使用を強制
      'vitest/prefer-to-be': ERROR,
      // test / it の統一を強制
      'vitest/consistent-test-it': ERROR,
    },
  },
];
