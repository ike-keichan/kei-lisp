import securityPlugin from 'eslint-plugin-security';
import { RULE_LEVEL } from '../const/index.mjs';

const { ERROR, OFF } = RULE_LEVEL;

/**
 * ESLint config for eslint-plugin-security.
 */
export const securityConfigs = [
  securityPlugin.configs.recommended,
  {
    rules: {
      // 動的な eval の使用を禁止
      'security/detect-eval-with-expression': ERROR,
      // ReDoS の原因となる安全でない正規表現を禁止
      'security/detect-unsafe-regex': ERROR,
      // 暗号用途に不適切な乱数生成を禁止
      'security/detect-pseudoRandomBytes': ERROR,
      // obj[key] 等の正常なコードも検出するため無効化
      'security/detect-object-injection': OFF,
    },
  },
];
