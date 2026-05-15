# TSKaigi 発表メモ — JavaScript 実装の自作プログラミング言語を TypeScript 実装に移行した話

## 発表情報

- **場所**: TSKaigi Day2 / RightTouch トラック
- **時間枠**: 11:50 〜 12:20
- **持ち時間**: 10 分
- **テーマ**: 自作 Lisp (kei-lisp) を JS → TS 移行した実体験から、言語実装ドメインで見える TS の強み・限界

---

## 構成案（10 分配分）

| 時間          | 内容                                                                |
| ------------- | ------------------------------------------------------------------- |
| 0:00 〜 0:30  | 自己紹介 / kei-lisp 紹介                                            |
| 0:30 〜 1:30  | 言語実装の構成（字句解析・構文解析・評価器）                        |
| 1:30 〜 4:00  | JS 実装で苦しんだ点（具体例 2〜3 個）                               |
| 4:00 〜 7:00  | TS 移行で得たもの（型ガード / strictTypeChecked / 標準化 / 安全化） |
| 7:00 〜 9:00  | TS の限界（JS 仕様の限界 / 原本踏襲の制約）                         |
| 9:00 〜 10:00 | まとめ                                                              |

---

## トピック候補と論点

### 1. プロジェクト概要

- **kei-lisp** — Common Lisp 風の Lisp 処理系（独自仕様あり）
- **構成**:
  - 字句解析: `Parser`（状態遷移表ベース）
  - 構文解析: `Cons`（cons cell ベースの AST）
  - 評価器: `Evaluator` + `Applier`（eval/apply 二段）
  - 環境: `Table`（連鎖 Map）
  - シンボル: `InterpretedSymbol`（インターン化）
- **規模感**: src/ 配下 12 クラス、TypeScript ベースに移行済み

### 2. JS 時代に苦しんだ点（"あるある" 系）

- **`value.length()` vs `value.length`** — `format_AUX` でメソッド呼び出しと書いてしまい、確実にクラッシュするバグが残っていた
- **`Cons.cdr` が undefined になって evaluator がクラッシュ** — 型が無いと「ここに来る値は何か」が常に不明
- **手書き型ガードを毎回呼ぶ** — `if (anObject instanceof Cons && anObject !== Cons.nil) ...` を全箇所に書く運用
- **ramda 経由で文字列メソッド名を渡してクラッシュ** — `R.invoker(1, methodName)` でタイポすると実行時まで気付かない
- **関数参照を括弧無しで使ってしまう事故** — `this.name.charCodeAt`（括弧無し）で関数オブジェクトを引き算 → NaN

### 3. TS 移行で得たもの

- **`LispValue` ユニオン型 + type predicate でナローイング**

  ```ts
  export type LispValue = Cons | InterpretedSymbol | Table | number | string | null;

  static isCons(anObject: LispValue): anObject is Cons {
    return anObject !== Cons.nil && anObject instanceof Cons;
  }
  ```

  → 各所で `if (Cons.isCons(v)) { v.car }` のようにブランチ内で `Cons` 確定。

- **`strictTypeChecked` + `projectService: true` で型不整合がコンパイル時に出る**
  - `@typescript-eslint/no-non-null-assertion` ERROR
  - `@typescript-eslint/no-explicit-any` ERROR
  - 雑な型逃避が ESLint 段階で潰れる

- **ECMAScript private static fields** で `gensym` カウンタを安全に

  ```ts
  static #generateNumber = 0;
  ```

- **ramda 削除** → 標準 `apply` への置換で型情報が通る

  ```ts
  const fn = target[methodName];
  if (typeof fn !== 'function') {
    throw new TypeError(...);
  }
  (fn as (a: LispValue) => LispValue).apply(target, [args]);
  ```

- **`expose-gc` パッケージ削除** → `v8.setFlagsFromString('--expose_gc')` + `vm.runInNewContext('gc')` で同等機能

- **JS 時代の防衛 null チェックを削除可能に** — `if (this.streamManager == null)` のような「JS では書きたくなる、TS では型上不要」な分岐は、`@typescript-eslint/no-unnecessary-condition` で検知 → 削除。**Lisp の `nil`（= `Cons.nil` シングルトン）と TS の `null` を分けて考える**規律ができる
- **JS 時代の boxed 値防衛コードも削除可能に** — `instanceof Number || typeof === 'number'` のような「boxed Number/String も考慮」する防衛コードは、TS で `LispValue` 型が `number | string`（primitive のみ）と確定していれば **到達不能の死分岐**。`unicorn/no-instanceof-builtins` で検知 → 削除。型述語 `anObject is number` を**正確に**表現できる
- **`process.exit` を `ExitError` に置換** — ライブラリ用途で catch 可能、CLI 用途では REPL の close ハンドラで処理
  ```ts
  export class ExitError extends Error {
    constructor() {
      super('Exit');
      this.name = 'ExitError';
    }
  }
  ```

### 4. TS の限界（言語実装ドメイン特有）

#### 4-A. JS 仕様の限界

- **`instanceof String` / `Number`（boxed）の判定**
  - TS 文化的には `unicorn/no-instanceof-builtins` で禁止される非推奨パターン
  - しかし Lisp の `numberp` / `stringp` 仕様上、boxed 数値・文字列も真とする必要があり、**意図的に残す**
  - → `unicorn/no-instanceof-builtins` を 4 箇所で disable
- **JS の Number は IEEE 754 double 一本**
  - Common Lisp の number tower（integer / ratio / single-float / double-float / bignum / complex）を表現できない
  - `numberp` と `doublep` が同一実装になってしまう
  - `floatp` は「IEEE 32-bit 表現可能範囲」という代用実装に
- **任意精度整数（bignum）が無い**
  - `(* 999999999999 999999999999)` は精度落ち。`BigInt` を使う実装に切り替えるなら言語仕様変更レベルの工事

#### 4-B. 原本踏襲の制約 — 「動いていた挙動」を厳密に保つジレンマ

- **`charCodeAt`（括弧無し）で関数参照を引き算 → NaN** のバグを意図して残す
- **`this.keys`（括弧無し）を `for..of` → 実行時 TypeError** のバグも意図して残す
- TS / ESLint は両方を **`@typescript-eslint/unbound-method` で正しく検知できる**が、踏襲方針なので disable
- → 「TS の検知能力は十分すぎるくらい高いが、**仕様として保ちたいバグ**まで撲滅しようとしてしまう」

#### 4-C. ESLint との衝突

- 27 箇所の inline disable が必要に
- **言語実装ドメインで誤検知しやすいルール**:
  - `unicorn/prefer-spread` — Parser.concat() を誤検知
  - `unicorn/no-immediate-mutation` — 状態遷移表構築（new Map 直後に大量 set）と相性が悪い
  - `sonarjs/cognitive-complexity` / `cyclomatic-complexity` — パーサ・評価器は本質的に複雑
  - `sonarjs/public-static-readonly` — `#` 構文（ECMAScript private field）を public と誤検知
- **Lisp 仕様上必然な disable**:
  - `sonarjs/pseudo-random` — Lisp の `(random)` は数値計算用途で `Math.random` で十分
  - `sonarjs/no-identical-functions` — `numberp` と `doublep` は意味が違うが JS 上同一実装

### 5. 設計判断のポイント（時間があれば）

- **LispValue は必要最小限のユニオン**にする（`undefined` を含めない方針 → undefined 起因のバグが消える）
- **nil は `Cons.nil` シングルトン**（`null` ではない）
- **type predicate はクラスの static method** として実装し、各所でナローイング
- **意図して残すバグは "// 原本踏襲" コメントで明示**

### 6. 数値で見る移行成果

- `pnpm exec tsc --noEmit`: エラー 0
- `pnpm lint`: warning 0
- inline disable: TS 移行直後 27 箇所 → Round 4 整理後 **0 箇所**（全て削除完了。コード修正、ルール OFF、設計改善を組み合わせて達成）
- 削除した依存: `ramda`, `expose-gc`（標準ライブラリのみで等価実装）
- 公開 API: `LispInterpreter`（`evalAll` / `evalString` 追加）, `Cons`, `InterpretedSymbol`, `ExitError`

---

## 発表に活きるサンプルコード集

### 例 A: Cons の type predicate（ナローイング）

**Before（JS）**:

```js
function isCons(x) {
  return x instanceof Cons && x !== Cons.nil;
}
// 呼び出し後も TS から見て型は変わらない
```

**After（TS）**:

```ts
static isCons(anObject: LispValue): anObject is Cons {
  return anObject !== Cons.nil && anObject instanceof Cons;
}

// 利用側
if (Cons.isCons(value)) {
  value.car;  // ← TS が Cons 型と認識（ナローイング）
}
```

### 例 B: ramda の R.invoker → 標準 apply

**Before（JS + ramda）**:

```js
const fn = R.invoker(1, methodName);
fn(args, this); // 内部で this[methodName](args) を呼ぶ。typo に弱い
```

**After（TS）**:

```ts
const target = this as unknown as Record<string, unknown>;
const fn = target[methodName];
if (typeof fn !== 'function') {
  throw new TypeError(`${target} does not have method "${methodName}"`);
}
(fn as (a: LispValue) => LispValue).apply(target, [args]);
```

### 例 C: gensym カウンタの安全化

**Before**:

```js
static generateNumber = 0;  // 外から書き換え可能
```

**After**:

```ts
static #generateNumber = 0;  // ECMAScript private static field

static incrementGenerateNumber() {
  Applier.#generateNumber++;
}
```

### 例 D: 終了処理の昇華（process.exit → ExitError）

**Before**:

```js
process.exit(0); // ライブラリ利用者がプロセスを巻き込まれる
```

**After**:

```ts
export class ExitError extends Error {
  constructor() { super('Exit'); this.name = 'ExitError'; }
}

// インタプリタ側
exit() {
  console.log('Bye!');
  throw new ExitError();
}

// 利用側（REPL）
try {
  /* eval ... */
} catch (e) {
  if (e instanceof ExitError) { rl.close(); return; }
  throw e;
}
```

### 例 F: ASCII 前提設計の silent な非 ASCII 破壊を TS が検知

`unicorn/prefer-code-point` ルールが、Parser のストリーム処理で `charCodeAt(0)` を使っている箇所を指摘。原本は ASCII 前提で書かれていたが、文字列リテラル内に非 ASCII（例: 絵文字）が来ると **サロゲートペアを壊して保存していた**。

```ts
// 原本 JS（silent な破壊）
const value = '😀'; // iterator は code point 単位で yield
value.charCodeAt(0); // → 0xD83D (high surrogate のみ)
String.fromCodePoint(0xd83d); // → 半分壊れた lone surrogate

// TS 移行後（codePointAt 置換）
value.codePointAt(0); // → 0x1F600 (絵文字の正しい code point)
String.fromCodePoint(0x1f600); // → "😀" (正しく保全)
```

#### 設計上の選択 vs 設計バグの線引き

- **状態遷移表は ASCII 前提（0-127 + fallback）**: これは設計上の選択。Lisp の構文要素は ASCII で十分
- **文字列リテラルの中身が壊れる**: これは設計バグ。`(print "Hello 😀")` が破損するのは Lisp 利用者の期待を裏切る

→ TS のルールが「**構文構造の ASCII 前提**」と「**文字内容の Unicode 透過性**」を切り分けるきっかけになった。

#### TS strict typing 的な追加成果

`codePointAt` の戻り値型は `number | undefined`（空文字列で undefined）。`charCodeAt` は `number` 固定（NaN）。
TS migration では `?? 0` / `?? -1` のフォールバックを明示する必要があった。**「JS では NaN で握り潰せた境界条件を TS は明示的に書かせる」** 例。

#### スライドでのメッセージ

> ESLint の "unicorn" 系ルールは一見 cosmetic に見えるが、**設計に潜んだ前提を可視化する**ことがある。
> Lisp 処理系のような「言語仕様を実装する」プロジェクトでは、こういう前提の明示化が言語仕様の正確性に直結する。

---

### 例 E: TS が JS の潜在バグを発見した事例

`@typescript-eslint/unbound-method` が、原本 JS で気付かれていなかった「**メソッド参照を裸で扱う typo**」を 2 箇所検知した。

#### Bug 1: `InterpretedSymbol.compareTo` の `charCodeAt` 括弧無し

```ts
// 原本 JS （バグ）
this.name.charCodeAt < aSymbol.name.charCodeAt // ← () 抜けで関数参照同士の比較
  ? aSymbol.name.length - this.name.charCodeAt // ← length - 関数参照 = NaN
  : this.name.charCodeAt - aSymbol.name.length;
```

- 同メソッド内で `charCodeAt(0)` が 4 回中 2 回 `(0)` 付きで使われていた
- 残り 2 回が **`(0)` の付け忘れ typo**
- JS では実行時に NaN を返すだけ。エラーにならず誰も気付かない
- TS では `@typescript-eslint/unbound-method` が「メソッド参照を裸で渡している」と検知

→ TS 移行時に「`(0)` 付け忘れ」と判明、最小修正で解消

#### Bug 2: `Table.clone` の `this.keys` 括弧無し

```ts
// 原本 JS （バグ）
for (const key of this.keys) {  // ← () 抜けで関数参照を for..of → 実行時 TypeError
```

- 呼ばれた瞬間に確実にクラッシュ
- だが `Table.clone` は実は呼び出し元 0 件の死コードだったので発覚しなかった
- TS の `@typescript-eslint/unbound-method` で初めて顕在化

→ `this.keys()` への 1 文字追加で解消

#### スライドでのメッセージ

> **JS では「実行されないと気付けない」「実行されても NaN や TypeError で握り潰される」バグが、TS では静的に "unbound method を渡しているぞ" と検知される。**
>
> 言語実装のように呼び出しパスが多く、テストカバレッジが追いつきにくいドメインほど、この恩恵は大きい。

---

### 例 G: ESLint の dead-store が Lisp 仕様バグを浮き彫りにした

`Table.setIfExit`（環境束縛の再代入、Common Lisp の `setq` 相当）に対して **4 つの ESLint ルール** が連名で警告:

- `no-useless-assignment` / `sonarjs/no-dead-store` → 「`answer` への代入が即上書きで dead」
- `unicorn/prefer-ternary` → 「if/else を ternary に」
- `@typescript-eslint/no-unnecessary-type-assertion` → 「冗長なキャスト」

**原本 JS（バグ）**:

```ts
setIfExit(aSymbol, anObject) {
  let answer = null;
  if (super.has(aSymbol)) {
    answer = this.set(aSymbol, anObject);  // ← 副作用: 現スコープ更新
                                            // ← 戻り値は dead store
  }
  if (this.isRoot()) {
    answer = null;
  } else {
    answer = this.source.setIfExit(aSymbol, anObject);
    // ↑ 現スコープを更新した後も、無条件で親に再帰してしまう
  }
  return answer;
}
```

**ESLint の指摘の本質**: dead-store 警告は表面的にはコード整理の指摘に見えるが、よく見ると **「現スコープを更新したのに、その結果を捨てて親に再帰している」** = **shadowing を破壊する Lisp 仕様バグ** の症状だった。

Common Lisp の `setq` セマンティクス:

```lisp
(let ((x 1))
  (let ((x 2))           ; 内側スコープで x を新たに束縛
    (setq x 100)         ; 内側の x を 100 に
    x))                  ; → 100
;; この時点で外側の x は 1 のまま (shadowing が機能)
```

原本実装では **外側の x も 100 に変わってしまう**。これは CL の標準動作と異なる。

**修正後**:

```ts
setIfExit(aSymbol, anObject) {
  if (super.has(aSymbol)) {
    this.set(aSymbol, anObject);
    return anObject;          // ← 現スコープで完結、再帰しない
  }
  if (this.isRoot()) {
    return null;              // ← 親なしで終端
  }
  return this.source.setIfExit(aSymbol, anObject);  // ← 親に委譲
}
```

#### スライドでのメッセージ

> ESLint の **dead-store** や **prefer-ternary** のような一見「コード整理」系のルールが、**本質的にはロジックバグの症状を指摘していた**ことが TS 移行で判明した。
>
> 「不要に見える代入」は「本来必要だった分岐の欠落」のサインかもしれない。**言語処理系のように "コードのほぼ全てが仕様" のドメインでは、こういう小さな違和感がそのまま仕様の正確性につながる。**

---

### 例 I: 「Lisp 哲学」を TS の型でどう表現するか

Common Lisp には **`void` の概念が存在しない**。「戻り値がない」関数も常に `nil` を返す:

```lisp
(defun do-something () (print "hi"))
(do-something)  ; => nil
```

TS 実装では「戻り値が意味を持たない内部メソッド」をどう型付けするかの設計判断が必要になる:

| 戻り値型                  | 思想                                               |
| ------------------------- | -------------------------------------------------- |
| `: void`                  | TS-idiomatic、「戻り値が存在しない」               |
| `: null` + `return null;` | **Lisp 哲学を TS に投影**、「nil-like な値を返す」 |

#### このコードベースの選択

`Parser` / `Cons` / `Table` の内部メソッドは大半が `: null` + `return null;`:

```ts
Parser.concatCharacter(): null { ...; return null; }
Parser.input(): null { ...; return null; }
Cons.setCar(): null { ...; return null; }
Table.setRoot(): null { ...; return null; }
```

これは **「Lisp は全ての式が値を返す」哲学を TS の型システムに投影した設計判断**。一方で 4 つの `tokenTo*` メソッドだけ `: void` でアウトライアー化していた:

```ts
// アウトライアー (TS 移行直後)
tokenToCharacter(): void {
  this.token = String(this.tokenString[0]);
  return;  // ← void 関数の冗長 return、ESLint が指摘
}
```

→ TS 移行クリーンアップで **コードベースの dominant pattern に合わせて `: null` + `return null;` に統一**。`sonarjs/no-redundant-jump` の警告も解消。

#### スライドでのメッセージ

> 「**何を返す/返さないか**」のような型の細部にも、**実装する言語の哲学**が出てくる。
>
> Lisp 処理系を実装するなら「**全ては値を返す**」を TS の型でも守る価値がある。「void なし」は Lisp の重要な意味論的特徴。
>
> TS 移行は単なる型注釈の追加ではなく、**コードベースの設計思想を可視化・統一する機会**でもある。

---

### 例 J: JS×OOP → TS×OOP で出会った言語機能の限界、そして書き方の選択 ★

**この発表の核となる事例**。TS 移行の「学び」を一つに集約できる物語。

---

#### Step 1: 出発点 — JS × OOP で書かれたパーサ

kei-lisp のパーサ（字句解析器）は、もともと JavaScript で **OOP らしく** 書かれていた。

```js
// JS 時代のパーサ（簡略化）
class Parser {
  constructor() {
    this.token = null; // 完成したトークンを保持するフィールド
    this.state = 0; // 状態機械の現在状態
  }

  // 1 文字進めて状態機械を進める
  // 内部で this.token を書き換えることがある（副作用）
  input() {
    // ... 状態遷移を進める ...
    // tokenTo*() が呼ばれて this.token が設定される
  }

  // 次のトークンが完成するまで input() を繰り返し呼ぶ
  nextToken() {
    this.token = null;
    while (!this.atEnd()) {
      if (this.state === 0 && this.token != null) break;
      this.input();
    }
    return this.token;
  }
}
```

これは Java / Python / Ruby などでもよく見る **典型的な状態機械パーサ**。
クラスのフィールドに状態を持ち、メソッドで状態を進めるという、**OOP の王道スタイル**。

---

#### Step 2: TS への移行 — 構造はそのまま、型注釈だけ追加

TS 移行のときは、**ロジックは何も変えず、型注釈だけ追加**するつもりだった。

```ts
class Parser {
  token: LispValue = null; // ← 型注釈追加
  state: number = 0;

  input(): null {
    // ← 型注釈追加
    // ... 中身は JS のまま
    return null;
  }

  nextToken(): LispValue {
    this.token = null;
    while (!this.atEnd()) {
      if (this.state === 0 && this.token != null) break; // ← この行で問題発生
      this.input();
    }
    return this.token;
  }
}
```

ところが ESLint がこの行で **謎の警告** を出した:

```
error: This condition will always return 'false'.
  if (this.state === 0 && this.token != null) break;
                          ^^^^^^^^^^^^^^^^^^
```

「**この条件は常に false**」。でも実行すると正しく動く。何が起きているのか？

---

#### Step 3: 用語の整理 — 何が起きているのか理解する

##### 用語 1: `narrow`（型の絞り込み）

TS が「この変数は今この型だ」を**コードの流れに応じて記憶**する仕組み。

```ts
function greet(name: string | null) {
  // この時点で name は string | null

  if (name === null) return;

  // ↑ 以降、name は確実に string と TS が理解（narrow された）
  name.toUpperCase(); // ← null チェック不要
}
```

普段はとても便利。`as string` キャストを書かなくて済む。

##### 用語 2: `mutation`（値の書き換え）

一度作った変数やフィールドの中身を**後から書き換えること**。

```ts
class Counter {
  count = 0;
  increment() {
    this.count = this.count + 1; // ← mutation
  }
}
```

OOP では **field を method で mutation する** のが基本スタイル。

---

#### Step 4: 衝突のメカニズム

```ts
this.token = null;        // ① TS のメモ:「token は null」と narrow

while (...) {
  if (this.state === 0 && this.token != null) break;  // ② チェック
  this.input();             // ③ メソッド呼び出し
}
```

##### TS の view

```
①: this.token = null
   → TS のメモ:「this.token は null」

③: this.input()
   → TS:「メソッドの中身は見ない。メモはそのまま信じよう」
   → メモ「null」のまま

②: if (this.token != null)
   → TS:「null != null は常に false。このチェック無意味」
   → 警告!
```

##### 実際の runtime

```
①: this.token = null      → 実際に null
②: 1周目:                  → null != null は false、break しない
③: this.input() 実行       → 中で this.token = "1" に書き換わる（mutation）
②: 2周目:                  → "1" != null は true、break する
→ チェックは完全に意味があった!
```

##### たとえ話

机の上に「**リンゴあり**」と書かれたメモがある。

- あなたが部屋を出る
- 誰か（メソッド）が部屋に入って、リンゴを食べる
- あなたが戻ってくる。メモには「リンゴあり」と書いてある
- TS:「メモにあるんだからリンゴはあるはず。確認は無駄」
- 実際: リンゴはない

→ **TS のメモが古いまま、それを信じてしまう**。

##### なぜ TS はメソッドの中身を見ないのか

「全メソッドの全呼び出しを毎回再解析する」はコストが高すぎる:

- メソッドはどこからでも呼ばれる
- 引数や状態によって挙動が変わる
- → 「メソッド呼び出しの結果は予測不能」と仮定するのが現実的

これは **TS の意図的な設計選択**。

---

#### Step 5: TS は「特殊な選択」をしている — 他言語との比較

実は他の言語は **別のアプローチ** を取っている:

| 言語          | この問題の扱い                                                    |
| ------------- | ----------------------------------------------------------------- |
| **TS**        | メモを更新せず信じ続ける（**便利を取った**） → **問題が起きる**   |
| C#            | メソッド呼ばれたらメモを捨てる（保守的） → 起きない               |
| Kotlin        | mutable フィールドのメモは最初から取らない → 起きない（書けない） |
| Dart          | instance フィールドは narrow から除外 → 起きない（書けない）      |
| Java          | そもそも narrow しない → 起きない                                 |
| Python (mypy) | C# 同様、メソッドで破棄 → 起きない                                |
| Lisp / JS     | 静的解析がない → 起きない                                         |

→ **「メモを更新せず信じ続ける」アプローチは TS の独自選択**。
→ **TS が「便利さ」を取った代わりに、mutation 重い OOP との相性を犠牲にした**。

---

#### Step 6: なぜ TS はこの設計にしたか

TS の目標は「**JS の書きやすさを保ちつつ型安全にする**」。
`narrow` を効かせると、`as string` キャストを書かなくて済んで便利:

```ts
function f(x: string | null) {
  if (x === null) return;
  x.length; // ← TS が string と理解、そのまま使える
}
```

普通のコードでは劇的に便利。
**でも mutation 重い OOP（Lisp パーサのような状態機械）と相性が悪い**。

これは TS の欠陥ではなく、**設計上のトレードオフ**。

---

#### Step 7: 解決の選択肢

##### 案 A: 警告を黙らせる

```ts
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (this.state === 0 && this.token != null) break;
```

- TS の限界を局所的にコメントで黙らせる
- **動作変化なし**、最小変更
- でも「TS の限界に屈した」状態が残る

##### 案 B: TS のために構造を曲げる

```ts
nextToken() {
  try {
    while (...) {
      if (this.state === 0 && this.token != null) break;
      this.input();
    }
    return this.token;
  } finally {
    this.token = null;  // ← リセットを末尾に
  }
}
```

- `this.token = null` を末尾に追いやって narrow を回避
- 動作はほぼ同じ
- **TS のためだけに try-finally を追加した workaround**

##### 案 C: メソッドが値を return する形に書き直す ★ 採用

```ts
class Parser {
  // input が「結果」も return するように
  input(): LispValue {
    // ... 状態機械を進める ...
    return this.token; // ← 結果を返す
  }

  nextToken(): LispValue {
    this.token = null;
    let token: LispValue = null; // ← ローカル変数で結果を受ける

    while (!this.atEnd()) {
      if (this.state === 0 && token != null) break; // ← ローカル変数で判定
      token = this.input(); // ← 結果を受け取る
    }
    return token;
  }
}
```

- メソッドの戻り値で結果を取得
- ローカル変数 `token` を使うので TS の narrow が悪さしない
- **「TS と仲良くするためにコードを変えた」のではなく、「OOP の良き設計に沿ったら結果として TS とも仲良くなった」**

---

#### Step 8: なぜ案 C を選んだか — Command-Query Separation

OOP のベストプラクティスに **CQS（Command-Query Separation）** という原則がある（Bertrand Meyer 提唱）:

| 種類    | 役割                     | 例                   |
| ------- | ------------------------ | -------------------- |
| Command | 状態を変える、戻り値なし | `cart.addItem(item)` |
| Query   | 値を返す、状態を変えない | `cart.getTotal()`    |

現状コード（案 A の状態）:

- `input()` は **Command（状態を進める）**
- でも結果を取るには **別途 `this.token` field を読む**
- → **「副作用」と「結果取得」が分離していて、OOP として中途半端**

案 C:

- `input()` が **Command と結果の return を一つにまとめる**
- field を外から読む必要がなくなる
- → **OOP のベストプラクティスに沿う設計**

つまり案 C は:

- **TS のための妥協ではなく、OOP として正しく直す改善**
- **その結果として TS の narrow とも仲良くなった**

---

#### Step 9: Before / After

##### Before（TS 移行直後、JS の構造そのまま）

```ts
class Parser {
  token: LispValue = null;
  state = 0;

  input(): null {
    // ... 状態機械 ...
    return null;
  }

  nextToken(): LispValue {
    this.token = null;
    while (!this.atEnd()) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (this.state === 0 && this.token != null) break;
      this.input();
    }
    return this.token;
  }
}
```

##### After（案 C 適用後）

```ts
class Parser {
  token: LispValue = null;
  state = 0;

  input(): LispValue {
    // ← 戻り値型変更
    // ... 状態機械 ...
    return this.token; // ← 結果を return
  }

  nextToken(): LispValue {
    this.token = null;
    let token: LispValue = null; // ← ローカル変数追加

    while (!this.atEnd()) {
      if (this.state === 0 && token != null) break; // ← ローカルを参照
      token = this.input(); // ← 結果を受ける
    }
    return token;
  }
}
```

変化:

- `input()` の戻り値: `null` → `LispValue`
- `nextToken()`: ローカル変数 `token` 追加
- `eslint-disable` コメント削除
- 動作・テスト結果: **完全に同一**

---

#### Step 10: 学び・教訓

1. **JS から TS への移行で「OOP × narrow」の構造的な相性問題に遭遇する**
2. **TS の narrow は便利だが、mutation 重い OOP と衝突する場面がある**
3. **解決は「黙らせる」「TS のために曲げる」「OOP のベストプラクティスに沿う」の三択**
4. **理想は三つ目** — TS への妥協ではなく、**OOP の良き設計に沿うことで結果的に和解**
5. これは **TS 固有の問題**（C# / Kotlin / Java は別アプローチで回避）

---

#### スライドでのメッセージ

> TS の `narrow` は「**JS の書きやすさを残しつつ型安全にする**」ための強力な仕組み。
>
> ただし「**メソッド経由の mutation を見抜けない**」という副作用がある。
>
> Java / Kotlin / C# は「正しさ」を取って narrow を諦めた。
> **TS は「便利さ」を取った代わりに、mutation 重い OOP との相性を犠牲にした**。
>
> Lisp パーサのような状態機械では、JS×OOP からの移行でこの相性問題に出会う。
>
> 対処は「**警告を黙らせる**」「**TS のために構造を曲げる**」「**OOP のベストプラクティスに沿って書き直す**」の三択。
>
> 私たちは三つ目を選んだ。**TS への妥協ではなく、OOP の良き設計（CQS）に沿ったら、結果として TS とも仲良くなった**。
>
> これが TS 移行で得た最大の学び。**TS と OOP の衝突は、OOP を正しく書き直す機会でもある**。

---

#### Q&A 想定

| 質問                                | 回答                                                                                                                 |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 他の言語ではどうしてる?             | 言語ごとに narrow の扱いが違う（C# は破棄、Kotlin/Dart は除外、Java はそもそも narrow しない）                       |
| なぜ TS だけこの設計?               | JS の書きやすさを保ちつつ型安全にしたい、その代償                                                                    |
| 全メソッドを return する形にすべき? | CQS は良い指針、でも毎回ではない。ケースバイケース                                                                   |
| 関数型に書き直したほうが良い?       | parser combinator など理想形はある。ただし kei-lisp の identity を変える話、別議論                                   |
| 例外処理は大丈夫?                   | try-finally を入れない案 C なので、例外時は this.token が leftover するが、次回呼び出し冒頭で reset するので問題なし |

---

### 例 K: TS のルールが Lisp 処理系の出力品質改善を促した

`@typescript-eslint/no-base-to-string` というルールがある:

> 値を文字列化（template literal や `String()`）する際、独自 `toString()` を持たず **デフォルトの `Object.prototype.toString` だけ**を持つ値だと `"[object Object]"` になってしまうので、それを禁止するルール。

#### kei-lisp での発見

このルールを有効化すると 33 箇所でエラー。原因は `LispValue` 型に含まれる **`Table` が独自 `toString()` を持っていなかった**こと:

```ts
type LispValue = Cons | InterpretedSymbol | Table | number | string | null;
//                                          ^^^^^
//                                  Map を継承だけで toString 未定義
```

`Table extends Map<unknown, LispValue>` だが、`Map.prototype.toString` は `Object.prototype.toString` を継承していて `"[object Map]"` を返す。これは LispValue を含むエラーメッセージで:

```ts
console.log('Can not apply "+" to "' + String(args.car) + '"');
// args.car が Table だった場合: 'Can not apply "+" to "[object Map]"'  ← 醜い
```

#### 修正

Common Lisp の慣習に合わせて `#<Environment>` を返す `toString()` を追加:

```ts
class Table extends Map<unknown, LispValue> {
  // ...
  toString(): string {
    return '#<Environment>';
  }
}
```

これで:
- `LispValue` の全分岐が独自 `toString()` を持つ → ルール OK
- エラーメッセージや REPL 出力が **Lisp 慣習に沿った形**で表示される

#### スライドでのメッセージ

> ESLint のルールを「**コード規約の押し付け**」と捉えがちだが、**Lisp 処理系の出力品質改善のヒント**として活きることがある。
>
> `Map` を継承しただけだと `"[object Map]"` になる罠を、TS が「型上は OK だが文字列化したらおかしいよ」と教えてくれた。
>
> 言語処理系のように **「内部値が外（エラーメッセージ等）に出ていく」プロジェクト**では、こういうルールが特に役立つ。

---

### 例 L: 動的型言語処理系の本質と「関数は単一型を返せ」ルールの衝突

`sonarjs/function-return-type` というルール:

> 関数が常に同じ型を返すことを強制（return パスごとに型が違うと警告）

#### kei-lisp での発見

このルールを有効化すると **28 箇所**でエラー。すべて Lisp の組み込み関数。

例: `abs`
```ts
abs(args: Cons): LispValue {
  if (Cons.isNumber(args.car)) {
    return Math.abs(args.car);  // ← number 型
  }
  return Cons.nil;              // ← Cons 型
}
```

`abs` は引数が数値なら数値を返し、そうでなければ nil を返す。**Lisp 仕様としてそれが正解**:
- `(abs 5)` → `5` （number）
- `(abs "hello")` → `nil` （Cons）

これは `add`、`car`、`cdr`、`length` ... 大半の Lisp 組み込み関数で同じパターン。

#### 動的型言語の処理系として

**動的型言語の組み込み関数は、引数の型によって戻り型が変わるのが基本仕様**:
- 数値が来たら数値計算
- 文字列が来たら文字列処理
- 不正値ならエラー値（nil 等）

これを「単一型を返せ」と修正すると、**Lisp の自然な実装を破壊**する。
他に手としては:
- 例外を投げる（仕様変更）
- always Cons.nil（機能放棄）
- union 型を狭める（無限の場合分け）

いずれも Lisp として不適切。

#### 結論

このルールは **動的型言語の処理系実装と本質的に相性が悪い**。`OFF` で確定。

#### スライドでのメッセージ

> 静的型言語のベストプラクティスを **動的型言語の処理系**にそのまま適用できないことがある。
>
> 「関数は単一型を返せ」は**多くの場面で正しい**が、Lisp / Python / Ruby などを実装する側は **引数によって戻り型が変わる関数群**を書くのが必然。
>
> TS の型システムは `LispValue` という union 型でこれを表現できるが、それを**「単一型」と捉えるかどうか**でルール解釈が分かれる。
>
> **TS で動的型言語処理系を書くなら、こうしたルールを意識的に OFF にする判断**が必要。

---

### 例 H: Lisp の linked list 走査と ESLint ルールの想定のズレ

`Cons` の `last` / `length` / `nth` はリスト走査の core。Common Lisp の `(do ((c cons (cdr c))) ...)` を素直に書き下した:

```ts
length(): number {
  let count = 0;
  let aCons: LispValue = this;  // ← this をループ変数の初期値に
  while (Cons.isCons(aCons)) {
    count++;
    aCons = aCons.cdr;          // ← cdr で進める
  }
  return count;
}
```

ESLint は警告:

- `unicorn/no-this-assignment`
- `@typescript-eslint/no-this-alias`

#### ルールの本来の目的

両ルールとも **`const self = this` という古い JS idiom**（arrow function 普及前の `this` 保持パターン）を防ぐためのもの。

```js
// ルールが想定する違反パターン
function outer() {
  const self = this;
  setTimeout(function () {
    self.doSomething();
  }, 1000);
  //         ^^^^^^^^ () => this.doSomething() で済むのに
}
```

#### Lisp ドメインとのズレ

`let aCons = this` は **「this の参照を保持する」目的ではなく、「this を起点にループ変数を初期化する」目的**。再代入してリストを辿る idiom であって、callback の this 問題とは無関係。

ルールはこの違いを認識できない → グローバル OFF で対応。

#### スライドでのメッセージ

> 汎用 ESLint ルールは「一般的な JS の悪い書き方」を防ぐもの。**ドメイン固有の正当な書き方とぶつかることがある**。
>
> Lisp の linked list 走査、SQL のクエリビルダ、ゲームのメインループ等、**ドメインの idiom を理解した上でルール無効化を判断する**のが TS 移行の地味だが重要な作業。

---

## 発表前チェックリスト

- [ ] `pnpm build` が通る
- [ ] `pnpm exec tsc --noEmit` でエラー 0
- [ ] `pnpm lint` で warning 0
- [ ] REPL 起動 → `(+ 1 2 3)` / `(fact 10)` 動作確認
- [ ] スライド用コード断片を 4〜6 個選定
- [ ] サンプルコードのスクリーンショット or シンタックスハイライト準備
- [x] Round 4 完了: インライン disable 27 → **0 件達成**

---

## 発表で言わない方が良いこと

- 移行が「完全に終わってない」事実 — Round 4 が進行中であることに触れない
- ESLint config 設計議論の内輪話
- 個別 disable の理由を全件解説（時間切れになる）

---

## Q&A 想定

| 質問                               | 回答方針                                                                                                                               |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| なぜ ramda を消した?               | 依存削減 + `R.invoker` 等で型情報が通らない箇所を消すため                                                                              |
| なぜ JS を維持しなかった?          | 字句解析・構文解析・評価器は型がある方が圧倒的に楽。原本のバグも TS の検知で発見できた                                                 |
| TS migration にどれくらいかかった? | 段階的（インライン disable 整理を 10 ラウンド以上に分けて進めた）                                                                      |
| Common Lisp 完全準拠?              | No。独自仕様あり（`progn` の引数解釈、parser quirk、`floatp` の意味 等）                                                               |
| なぜ "意図的にバグを残す"?         | "動いていた挙動" を保つため。利用者の Lisp プログラムの互換性を最優先                                                                  |
| ESLint と衝突しない構成にできた?   | 一部のルールは Lisp ドメイン全体で OFF にしないと運用できない（`prefer-spread` / `no-immediate-mutation` / `cognitive-complexity` 等） |

---

## 発表後の発展ネタ（時間が余った場合）

- パーサ quirk（`+`/`-` 単独トークン化のバグ、独自コメント記号 `#` `%`）
- `progn` の独自仕様（第一引数を束縛リストとして処理）
- 末尾呼び出し最適化、マクロ、コンディションシステム等の今後の機能拡張候補

---

## 参考: 移行作業のラウンド構成（社内記録的メモ）

- **Round 1**: process.exit 撤廃 + Parser 誤検知ルールのグローバル無効化
- **Round 2**: pseudo-random / number*/double* 統合 / gensym カウンタ private 化
- **Round 3**: 複雑度系 / extraneous-class 系のグローバル無効化
- **Round 4**: 27 個の inline disable を 10 サブグループ（A〜J）に分割して個別判断 → **完了 (0 件達成)**
- **Round 5 以降**: ESLint 設定 TODO / テスト基盤 / 実害バグ修正 / ドキュメント / CI / リリース整備

→ 発表では「ラウンド分割」という進め方自体は触れず、**完成後の絵面**だけ見せる方が時間効率が良い。
