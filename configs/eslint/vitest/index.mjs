import pluginVitest from 'eslint-plugin-vitest';

/**
 * ESLint config for eslint-plugin-vitest.
 */
export const vitestConfigs = [
  pluginVitest.configs.recommended,
  {
    rules: {},
  },
];
