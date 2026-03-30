import pluginSonarjs from 'eslint-plugin-sonarjs';

/**
 * ESLint config for eslint-plugin-sonarjs.
 */
export const sonarjsConfigs = [
  pluginSonarjs.configs.recommended,
  {
    rules: {},
  },
];
