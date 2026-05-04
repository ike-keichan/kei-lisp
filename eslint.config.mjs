import globals from 'globals';
import prettier from 'eslint-config-prettier';

import { FILES } from './configs/eslint/const/index.mjs';

import { jsConfigs } from './configs/eslint/js/index.mjs';
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

  // Language options
  // TODO: TS 移行中は SRC に .ts を追加し、移行完了後は parserOptions.project を設定する
  {
    files: [...SRC, ...CONFIG],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },

  // Base JavaScript rules
  ...jsConfigs,

  // Source files
  ...nConfigs,
  ...sonarjsConfigs,
  ...securityConfigs,
  ...unicornConfigs,
  ...importXConfigs,
  ...unusedImportsConfigs,

  // TypeScript rules (applies to all .ts files including src and tests)
  ...typescriptConfigs,

  // Test files
  ...vitestConfigs,

  // Prettier: disable conflicting formatting rules (must be last)
  prettier,
];
