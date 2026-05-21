import pluginUnicorn from 'eslint-plugin-unicorn';
import { RULE_LEVEL } from '../const/index.mjs';

const { ERROR, OFF } = RULE_LEVEL;

/**
 * ESLint config for eslint-plugin-unicorn.
 *
 * Several recommended rules are disabled to align with the existing codebase and the Lisp domain.
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
      // 正規表現の最適化を強制
      'unicorn/better-regex': ERROR,
      // NOTE: Parser.concat()を誤検知するため無効化
      // Array.concat() / Array.from() のスプレッド構文への統一を強制
      'unicorn/prefer-spread': OFF,
      // NOTE: Parserの状態遷移表構築と相性が悪いため無効化
      // new Map()/Set() 等の直後のミューテーションを禁止
      'unicorn/no-immediate-mutation': OFF,
      // NOTE: コードベース全体でクラス形式に統一しているため無効化
      // staticメソッドのみのクラスを禁止
      'unicorn/no-static-only-class': OFF,
      // NOTE: Lisp の linked list 走査で `let aCons = this; while (...) { aCons = aCons.cdr }` パターンが必然的に発生するため無効化
      // this のエイリアス代入を禁止
      'unicorn/no-this-assignment': OFF,
    },
  },
];
