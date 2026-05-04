import pluginSonarjs from 'eslint-plugin-sonarjs';
import { RULE_LEVEL } from '../const/index.mjs';

const { WARN } = RULE_LEVEL;

/**
 * ESLint config for eslint-plugin-sonarjs.
 */
export const sonarjsConfigs = [
  pluginSonarjs.configs.recommended,
  {
    rules: {
      // 同一文字列リテラルの重複使用を警告（3回以上）
      'sonarjs/no-duplicate-string': [WARN, { threshold: 3 }],
      // 循環的複雑度の上限を警告（10以上）
      'sonarjs/cyclomatic-complexity': [WARN, { threshold: 10 }],
      // ネストした if 文の簡略化を強制
      'sonarjs/no-collapsible-if': WARN,
    },
  },
];
