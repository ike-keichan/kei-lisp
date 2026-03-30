import pluginUnicorn from 'eslint-plugin-unicorn';
import { RULE_LEVEL } from '../const/index.mjs';

const { OFF } = RULE_LEVEL;

/**
 * ESLint config for eslint-plugin-unicorn.
 *
 * `prevent-abbreviations` and `filename-case` are disabled to align with the existing codebase.
 */
export const unicornConfigs = [
  pluginUnicorn.configs.recommended,
  {
    rules: {
      'unicorn/prevent-abbreviations': OFF,
      'unicorn/filename-case': OFF,
    },
  },
];
