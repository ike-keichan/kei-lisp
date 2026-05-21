import pluginN from 'eslint-plugin-n';
import { RULE_LEVEL } from '../const/index.mjs';

const { ERROR } = RULE_LEVEL;

/**
 * ESLint config for eslint-plugin-n.
 */
export const nConfigs = [
  pluginN.configs['flat/recommended'],
  {
    rules: {
      // fs の Promise API の使用を強制
      'n/prefer-promises/fs': ERROR,
    },
  },
];
