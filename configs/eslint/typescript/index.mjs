import tseslint from 'typescript-eslint';
import { testFiles } from '../constants.mjs';

/**
 * typescript-eslint設定
 *
 * @remarks
 * - TypeScript ファイル（テストコード）向けの型安全ルールを提供する。
 */
export const typescriptConfigs = [
  // 推奨ルール
  ...tseslint.configs.recommended.map((config) => ({ ...config, files: testFiles })),
  {
    files: testFiles,
    rules: {},
  },
];
