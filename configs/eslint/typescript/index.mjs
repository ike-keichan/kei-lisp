import tseslint from 'typescript-eslint';

/**
 * ESLint config for typescript-eslint.
 */
export const typescriptConfigs = [
  ...tseslint.configs.recommended,
  {
    rules: {},
  },
];
