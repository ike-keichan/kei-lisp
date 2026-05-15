import pluginSonarjs from 'eslint-plugin-sonarjs';
import { RULE_LEVEL } from '../const/index.mjs';

const { WARN, OFF } = RULE_LEVEL;

/**
 * ESLint config for eslint-plugin-sonarjs.
 */
export const sonarjsConfigs = [
  pluginSonarjs.configs.recommended,
  {
    rules: {
      // 同一文字列リテラルの重複使用を警告（3回以上）
      'sonarjs/no-duplicate-string': [WARN, { threshold: 3 }],
      // ネストした if 文の簡略化を強制
      'sonarjs/no-collapsible-if': WARN,
      // NOTE: Lisp処理系として本質的に複雑な状態機械・パーサ・評価器を含むため無効化
      // 循環的複雑度の上限を警告
      'sonarjs/cyclomatic-complexity': OFF,
      // NOTE: Lisp処理系として本質的に複雑な状態機械・パーサ・評価器を含むため無効化
      // 認知的複雑度の上限を警告
      'sonarjs/cognitive-complexity': OFF,
      // 関数が常に同じ型を返すことを強制
      // TODO: ルール有効化 / 該当箇所の修正どちらで対応するか判断
      'sonarjs/function-return-type': OFF,
      // NOTE: Lispの (random) は数値計算用途で疑似乱数で十分なため無効化
      // 暗号用途で安全でない疑似乱数の使用を禁止
      'sonarjs/pseudo-random': OFF,
      // NOTE: # 構文 (ECMAScript private field) を public と誤検知するため無効化
      // public な静的プロパティに readonly 修飾子の使用を強制
      'sonarjs/public-static-readonly': OFF,
    },
  },
];
