import pluginUnusedImports from 'eslint-plugin-unused-imports';
import { RULE_LEVEL } from '../const/index.mjs';

const { ERROR, WARN, OFF } = RULE_LEVEL;

/**
 * ESLint config for eslint-plugin-unused-imports.
 *
 * `no-unused-vars` is disabled in favor of `unused-imports/no-unused-vars`.
 */
export const unusedImportsConfigs = [
  {
    plugins: {
      'unused-imports': pluginUnusedImports,
    },
    rules: {
      'no-unused-vars': OFF,
      'unused-imports/no-unused-imports': ERROR,
      'unused-imports/no-unused-vars': [
        WARN,
        { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' },
      ],
    },
  },
];
