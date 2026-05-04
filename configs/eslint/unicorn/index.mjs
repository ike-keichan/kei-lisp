import pluginUnicorn from 'eslint-plugin-unicorn';
import { RULE_LEVEL } from '../const/index.mjs';

const { ERROR, OFF } = RULE_LEVEL;

/**
 * ESLint config for eslint-plugin-unicorn.
 *
 * `prevent-abbreviations` and `filename-case` are disabled to align with the existing codebase.
 */
export const unicornConfigs = [
  pluginUnicorn.configs.recommended,
  {
    rules: {
      // 既存コードベースに合わせて無効化
      'unicorn/prevent-abbreviations': OFF,
      'unicorn/filename-case': OFF,
      // Lisp 実装のため null を多用するため無効化
      'unicorn/no-null': OFF,
      // CommonJS 混在期間中は抑制
      // TODO: TS 移行完了後に有効化を検討
      'unicorn/prefer-module': OFF,
      // 正規表現の最適化を強制
      'unicorn/better-regex': ERROR,
    },
  },
];
