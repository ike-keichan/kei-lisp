import securityPlugin from 'eslint-plugin-security';
/**
 * ESLint config for eslint-plugin-security.
 */
export const securityConfigs = [
  securityPlugin.configs.recommended,
  {
    rules: {},
  },
];
