import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

import { FILES } from './configs/eslint/const/index.mjs';

import { nConfigs } from './configs/eslint/n/index.mjs';
import { sonarjsConfigs } from './configs/eslint/sonarjs/index.mjs';
import { securityConfigs } from './configs/eslint/security/index.mjs';
import { unicornConfigs } from './configs/eslint/unicorn/index.mjs';
import { importXConfigs } from './configs/eslint/import-x/index.mjs';
import { unusedImportsConfigs } from './configs/eslint/unused-imports/index.mjs';
import { typescriptConfigs } from './configs/eslint/typescript/index.mjs';
import { vitestConfigs } from './configs/eslint/vitest/index.mjs';

const { SRC, CONFIG } = FILES;

export default [
  // Global ignores
  {
    ignores: ['dist/**', 'node_modules/**', 'out/**'],
  },

  // Source & Config files: base JavaScript rules
  {
    files: [...SRC, ...CONFIG],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },

  // Source files
  ...nConfigs,
  ...sonarjsConfigs,
  ...securityConfigs,
  ...unicornConfigs,
  ...importXConfigs,
  ...unusedImportsConfigs,

  // Test files
  ...typescriptConfigs,
  ...vitestConfigs,

  // Prettier: disable conflicting formatting rules (must be last)
  prettier,
];
