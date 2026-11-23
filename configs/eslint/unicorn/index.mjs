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
      // --- v80 で追加・拡張された規則 ---
      // NOTE: JSDoc / TSDoc は行頭に `*` を付ける標準の書き方で統一しているため無効化
      // ドキュメントコメントの行頭の `*` を取り除かせる
      'unicorn/no-asterisk-prefix-in-documentation-comments': OFF,
      // NOTE: `/** ... */` の1行の JSDoc を書けなくなるため無効化
      // 1行のブロックコメントを複数行の形に強制
      'unicorn/single-line-block-comment-style': OFF,
      // NOTE: Parser.concat()を誤検知するため無効化
      // NOTE: v80 で no-unused-array-method-return から置き換えられたため新ルール名で指定
      // 組み込みメソッドの戻り値の無視を禁止
      'unicorn/no-unused-builtin-method-return': OFF,
      // NOTE: 以下は制御構造の書き方の好みに関する規則。評価器 (Applier / Evaluator) は
      // 「条件を確かめて早期 return し、最後に本来の処理を書く」形で統一しており、
      // 規則に合わせると広い範囲の書き換えになるうえ、読みやすさも上がらないため無効化
      // if 文を三項演算子に置き換えさせる
      'unicorn/prefer-ternary': OFF,
      // 三項演算子を、式の中の変わる部分だけに寄せさせる
      'unicorn/prefer-minimal-ternary': OFF,
      // 連続するガード節を `||` で1つにまとめさせる
      'unicorn/prefer-combined-guards': OFF,
      // 単純な条件を先に書かせる
      'unicorn/prefer-simple-condition-first': OFF,
      // 関数の残りを包む if を、早期 return に置き換えさせる
      'unicorn/prefer-early-return': OFF,
      // ループの残りを包む if を、早期 continue に置き換えさせる
      'unicorn/prefer-continue': OFF,
    },
  },
];
