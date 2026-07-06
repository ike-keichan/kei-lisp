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
      // NOTE: v70 で prevent-abbreviations から改名されたため新ルール名で指定
      'unicorn/name-replacements': OFF,
      'unicorn/filename-case': OFF,
      // Lisp 実装のため null を多用するため無効化
      'unicorn/no-null': OFF,
      // 正規表現の最適化を強制
      'unicorn/better-regex': ERROR,
      // NOTE: Parser.concat()を誤検知するため無効化
      // Array.concat() / Array.from() のスプレッド構文への統一を強制
      'unicorn/prefer-spread': OFF,
      // NOTE: Parser.concat()を誤検知するため無効化
      // 配列メソッドの戻り値の無視を禁止
      'unicorn/no-unused-array-method-return': OFF,
      // NOTE: Parserの状態遷移表構築と相性が悪いため無効化
      // new Map()/Set() 等の直後のミューテーションを禁止
      'unicorn/no-immediate-mutation': OFF,
      // NOTE: コードベース全体でクラス形式に統一しているため無効化
      // staticメソッドのみのクラスを禁止
      'unicorn/no-static-only-class': OFF,
      // NOTE: Lisp の linked list 走査で `let aCons = this; while (...) { aCons = aCons.cdr }` パターンが必然的に発生するため無効化
      // this のエイリアス代入を禁止
      'unicorn/no-this-assignment': OFF,
      // NOTE: 既存コードベースの aBoolean 等の aXxx 命名規約と競合するため無効化
      // boolean 変数名に is/has 等の接頭辞を強制
      'unicorn/consistent-boolean-name': OFF,
      // NOTE: Lisp の integerp/evenp/oddp/nth は「整数値を持つ数は整数」の意味論で実装しており、
      // isSafeInteger に置き換えると 2^53 以上で処理系の挙動が変わるため無効化
      // Number.isInteger() より Number.isSafeInteger() を強制
      'unicorn/prefer-number-is-safe-integer': OFF,
      // NOTE: Lisp のリスト構築（S 式の直訳）で new Cons のネストが必然的に発生するため無効化
      // 関数呼び出しのネスト段数を制限
      'unicorn/max-nested-calls': OFF,
      // NOTE: コードベース全体で Cons.isNil() 等の明示的なクラス名参照に統一しており、
      // サブクラスも存在しないため無効化（static 内のみ this 参照になると一貫性が崩れる）
      // static メソッド内での自クラス名参照を禁止
      'unicorn/class-reference-in-static-methods': OFF,
      // NOTE: format の書式展開などの状態機械（while + switch）では case 終端の break が
      // 必然的に発生し、関数への切り出しは可変状態の引き回しを強いるため無効化
      // ループ内にネストした loop/switch での break を禁止
      'unicorn/no-break-in-nested-loop': OFF,
      // NOTE: 既存コードベースは public フィールド（KeiLispPlugin の name 等）を private フィールドより
      // 先に宣言する規約のため、デフォルトの並びから public/private フィールドのみ入れ替えて適用
      // クラスメンバーの宣言順を強制
      'unicorn/consistent-class-member-order': [
        ERROR,
        {
          order: [
            'static-field',
            'static-block',
            'static-method',
            'public-field',
            'private-field',
            'constructor',
            'private-method',
            'public-method',
          ],
        },
      ],
    },
  },
];
