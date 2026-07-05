# Built-in Functions

Reference for all built-in functions, special forms, and operators in kei-lisp.

Entries are organized into the following categories:

- [Arithmetic](#arithmetic) — `+`, `-`, `*`, `/`, `//`, `mod`, `abs`, `exp`, `expt`, `sqrt`, `sin`, `cos`, `tan`, `round`, `truncate`, `floor`, `ceiling`, `min`, `max`, `1+`, `1-`, `random`, `pi`, `napier`
- [Comparison](#comparison) — `=`, `==`, `~=`, `~~`, `<`, `<=`, `>`, `>=`
- [Logic](#logic) — `and`, `or`, `not`
- [Predicates](#predicates) — `atom`, `consp`, `listp`, `numberp`, `integerp`, `floatp`, `rationalp`, `stringp`, `symbolp`, `characterp`, `null`, `eq`, `equal`, `neq`, `nequal`, `evenp`, `oddp`, `zerop`, `plusp`, `minusp`
- [List operations](#list-operations) — `car`, `cdr`, `cons`, `list`, `length`, `last`, `nth`, `nthcdr`, `reverse`, `append`, `butlast`, `assoc`, `member`, `memq`, `mapcar`, `mapcan`, `rplaca`, `rplacd`, `push`, `pop`, `copy`, `elt`, `subseq`, `count`, `reduce`, `every`, `some`, `find`, `position`, `remove`, `remove-if`, `sort`, `getf`
- [Data structures](#data-structures) — `make-hash-table`, `gethash`, `remhash`, `hash-table-count`, `hash-table-p`, `vector`, `make-array`, `aref`, `svref`, `vectorp`
- [Strings](#strings) — `string-upcase`, `string-downcase`, `string-trim`, `substring`, `concatenate`
- [Variables and bindings](#variables-and-bindings) — `setq`, `setf`, `incf`, `decf`, `set-allq`, `bind`, `gensym`, `destructuring-bind`
- [Functions and special forms](#functions-and-special-forms) — `defun`, `lambda`, `apply`, `quote`, `eval`, `let`, `let*`, `progn`, `defstruct`
- [Macros](#macros) — `defmacro`, backquote (`` ` ``, `,`, `,@`), `macroexpand`, `macroexpand-1`
- [Control flow](#control-flow) — `if`, `cond`, `case`, `when`, `unless`, `do`, `do*`, `dolist`, `catch`, `throw`
- [Error handling](#error-handling) — `error`, `handler-case`
- [I/O and formatting](#io-and-formatting) — `format`, `print`, `princ`, `terpri`, `with-output-to-string`, `read-from-string`, `load`
- [System](#system) — `exit`, `gc`, `time`, `trace`, `notrace`

> The original alphabetical reference of each function follows below.

> **Legend**: Entries marked **(kei-lisp specific)** are either not part of
> the Common Lisp standard or behave differently from CL. They are kept for
> historical reasons or because of platform constraints.
>
> **Numbers**: kei-lisp has a numeric tower — integers (arbitrary
> precision), exact rationals (created by `/`, printed as `1/2`), and
> double-precision floats. Exact operands stay exact; as soon as a float
> is involved the result is a float (float contagion).

## Comments

`;` starts a line comment that continues to the end of the line. Block comments
are not supported.

```lisp
>> (+ 1 ; one
      2 ; two
      3) ; three
6
```

## Alphabetical reference

### abs

**(abs X)**
Function to answer the absolute value of X.

```
>> (abs -10.0)
10
```

### add

**(add X1 X2 ... Xn)**
Function to answer the sum of X1, X2 ... and Xn.

```
>> (add 1 2)
3
>> (add 12 -34 5.6 -7.8 90)
65.8
```

### and

**(and X1 X2 ... Xn)**
Function to answer the logical product of X1, X2 ... and Xn.

```
>> (and t nil)
nil
>> (and (= 1 1) (= 1 1))
t
>> (and (= 1 1) (= 2 1))
nil
>> (and t (= 1 1))
t
>> (and nil (= 1 1))
nil
>> (and nil (= 2 1))
nil
```

### append

**(append L1 L2)**
Functions to answer the combined list of L1 and L2.

```
>> (append '(a b c) '(d e f))
(a b c d e f)
```

### aref

**(aref V N)**
Function that returns the element of vector V at the zero-based index N.
`svref` is an alias. Usable as a [setf](#setf) place. Signals an error for
an out-of-range index.

```
>> (setq v (vector 10 20 30))
#(10 20 30)
>> (aref v 1)
20
>> (setf (aref v 0) 99)
99
>> v
#(99 20 30)
```

### apply

**(apply X L)**
Function to answer the result of applying X to L.

```
>> (apply + '(1 2))
3
```

### assoc

**(assoc X L)**
Find the pairs with the key specified by X from the L association list

```
>> (assoc 'c  '((a . 10) (b . 20) (c . 30)))
(c . 30)
>> (setq a-list '((1 . abc) (2 . def) (3 . ghi)))
((1 . abc) (2 . def) (3 . ghi))
>> (assoc 2 a-list)
(2 . def)
```

### atom

**(atom X)**
Function to answer whether X is an Atom.

```
>> (atom '(1 2 3))
nil
>> (atom '())
t
>> (atom 'a)
t
>> (atom 1)
t
>> (atom "a")
t
>> (atom "abc")
t
>> (atom nil)
t
```

### bind

**(kei-lisp specific)** Not present in Common Lisp.

**(bind X)**
Functions to answer the number of values bound to the X Symbol.

```
>> (bind a)
nil
>> (setq a 10)
10
>> (bind a)
1
>> (let ((a 20))
        (bind a))
2
```

### butlast

**(butlast L X)**
Functions to answer the list with the X values removed from the end of L.

```
>> (butlast '(a b c d e f g) 3)
(a b c d)
```

### car

**(car L)**
Function to answer the value of the head from L.

```
>> (car '(a b c))
a
>> (car '(1 2 3))
1
```

### case

**(case KEY (KEYS X1 ... Xn) ... (otherwise Y1 ... Yn))**
Special form that evaluates KEY and runs the body of the first clause whose
keys match it. A clause head may be a single key or a list of keys; keys are
**not** evaluated and are compared by identity (`eq`). A head of `t` or
`otherwise` always matches. Returns nil when no clause matches (matches
Common Lisp `case`; Scheme and Clojure have the same construct).

```
>> (case 2 (1 'one) ((2 3) 'two-or-three) (otherwise 'other))
two-or-three
>> (case 'foo ((bar foo) 42))
42
>> (case 9 (1 'one))
nil
```

### catch

**(catch TAG X1 ... Xn)**
Special form for dynamic non-local exit. Evaluates TAG, then the body; when
a [throw](#throw) with an `eq` tag fires during the body (even deep inside
function calls), control unwinds here and the thrown value becomes the
result. Otherwise returns the last body value (matches Common Lisp
`catch`; note this is **not** exception handling — see
[handler-case](#handler-case) for errors, and note Clojure's `try`/`catch`
has different semantics).

```
>> (catch 'tag 1 2 3)
3
>> (catch 'done (dolist (x '(1 2 3)) (when (= x 2) (throw 'done x))))
2
```

### cdr

**(cdr L)**
Function to answer the value of the tail from L.

```
>> (cdr '(a b c))
(b c)
>> (cdr '(1 2 3))
(2 3)
```

### characterp

**(characterp X)**
Function to answer whether X is a Character.

```
>> (characterp '(1 2 3))
nil
>> (characterp '())
nil
>> (characterp 'a)
nil
>> (characterp 1)
nil
>> (characterp "a")
t
>> (characterp "abc")
nil
```

### cond

**(cond (X1 Y11 Y12 ... Y1n) ... (Xn Yn1 Yn2 ... Ynn))**
Function to answer Yn1, Yn2 ... and Ynn satisfy the Xn condition.

```
>> (cond (t 10) (nil 20))
10
>> (cond
        ((= 1 2) 10)
        ((= 1 3) 20)
     	((= 1 1) 30))
30
```

### cons

**(cons X Y)**
Function to answer the X and Y pairs.

```
>> (cons 'a 'b)
(a . b)
>> (cons 'a '(b c))
(a b c)
>> (cons '(a b c) '(1 2 3))
((a b c) 1 2 3)
```

### consp

**(consp X)**
Function to answer whether X is a Cons.

```
>> (consp '(1 2 3))
t
>> (consp '())
nil
>> (consp 'a)
nil
>> (consp 1)
nil
>> (consp "a")
nil
>> (consp "abc")
nil
```

### copy

**(copy X)**
Function to answer a copy of X.

```
>> (setq a 10)
10
>> (eq a (copy a))
t
>> (setq a '(a b))
(a b)
>> (eq a (copy a))
nil
```

### cos

**(cos X)**
Function to answer an cos of X.
Due to the limited accuracy of PI, there will be a slight error.

```
>> (cos 0)
1
>> (cos (/ (pi) 2))
6.123233995736766e-17
>> (cos (pi))
-1
```

### count

**(count ITEM SEQ)**
Function that returns the number of times ITEM appears in SEQ. For strings,
ITEM must be a single-character string. Returns 0 when SEQ is empty or
ITEM does not occur.

```
>> (count 2 '(1 2 3 2 1))
2
>> (count "l" "hello")
2
>> (count "z" "hello")
0
>> (count 1 nil)
0
```

### decf

**(decf PLACE)** / **(decf PLACE DELTA)**
Special form that decrements the number stored in a generalized place (see
[setf](#setf)) by DELTA (default 1) and returns the new value.

```
>> (setq n 10)
10
>> (decf n)
9
>> (decf n 4)
5
```

### defun

**(defun N L X1 X2 ... Xn)**
Function defining function with N as the function name, L as the argument, and X1, X2 ... and Xn as the process.

```
>> (defun tasu (a b) (+ a b))
tasu
>> (tasu 1 2)
3
```

### defmacro

**(defmacro N L X1 X2 ... Xn)**
Macro defining special form with N as the macro name, L as the argument list, and
X1, X2 ... and Xn as the body. Unlike `defun`, a macro receives its arguments
**unevaluated**; the body is evaluated to produce a new form, which is then
evaluated in the caller's environment. Combine with the backquote syntax
(`` ` ``, `,`, `,@`) to build the expansion, and with [`gensym`](#gensym) to
introduce fresh names that avoid variable capture.

```
>> (defmacro my-when (test . body) `(if ,test (progn ,@body) nil))
my-when
>> (my-when t 1 2 3)
3
>> (my-when nil (setq x 99))
nil
```

See also [`macroexpand`](#macroexpand) / [`macroexpand-1`](#macroexpand-1) for
inspecting expansions, and [Backquote](#backquote-quasiquote) for the template
syntax.

### defstruct

**(defstruct NAME FIELD1 ... FIELDn)**
Special form that defines a structure type and generates a positional
constructor `make-NAME`, a predicate `NAME-p`, and one accessor
`NAME-FIELD` per field. Accessors are usable as [setf](#setf) places.
Instances are represented as tagged lists `(NAME V1 ... Vn)`.

**(kei-lisp specific behavior)** Common Lisp's `defstruct` constructor takes
keyword arguments (`:field value`); kei-lisp's constructor is positional
until keyword symbols are introduced. Records exist in every major dialect
(CL `defstruct` / Scheme `define-record-type` / Clojure `defrecord`).

```
>> (defstruct point x y)
point
>> (setq p (make-point 3 4))
(point 3 4)
>> (point-x p)
3
>> (setf (point-y p) 40)
40
>> (point-p p)
t
```

### destructuring-bind

**(destructuring-bind PATTERN EXPR X1 ... Xn)**
Special form that evaluates EXPR, binds the symbols of the (possibly nested
or dotted) PATTERN to the corresponding parts of the value, and evaluates the
body in the new scope. Signals an error when the shape does not match
(matches Common Lisp `destructuring-bind`; Scheme and Clojure offer the same
idea as `let-values` / destructuring `let`).

```
>> (destructuring-bind (a b) '(1 2) (list b a))
(2 1)
>> (destructuring-bind (a (b . rest)) '(1 (2 3 4)) rest)
(3 4)
```

### divide

**(divide X1 X2 ... Xn)**
Function to answer the quotient of X1 divided by X2 ... and Xn.

```
>> (divide 10 5)
2
>> (divide 12 5 4)
0.6
```

### do

**(do L X1 X2 ... Xn)**
List L is a list of temporary variables, functions to do X in parallel.

```
>> (do ((ans 0)(a 0 (+ a 1)))
        ((= a 10) ans)
        (setq ans (+ ans a)))
45
```

### do\*

<br>**(do\* L X1 X2 ... Xn)**
List L is a list of temporary variables, functions to do X in sequence.

```
>> (do* ((a 0 (+ a 1)) (ans 0 (+ ans a)))
        ((= a 10) ans))
55
```

### dolist

**(dolist L X1 X2 ... Xn)**
Functions to do X in order for the elements of the list L

```
>> (dolist (each '(a b c) t)
        (format "~a~%" each))
a
b
c
t
```

### error

**(error MESSAGE X1 ... Xn)**
Function that formats MESSAGE with the given arguments (using the
[format](#format) directives) and signals it as an evaluation error. The
error can be intercepted with [handler-case](#handler-case); otherwise it
propagates to the caller (the REPL prints it; the library throws
`EvalError`).

```
>> (error "bad value: ~a" 42)
Error: bad value: 42
>> (handler-case (error "boom") (error (e) e))
boom
```

### eval

**(eval X)**
Function to answer the result of applying X to L.

```
>> (eval (+ 1 2))
3
```

### elt

**(elt SEQ INDEX)**
Function that returns the element of SEQ at the zero-based INDEX. Works
on both strings (returns a single-character string) and lists. Throws if
INDEX is out of range.

```
>> (elt "abc" 1)
b
>> (elt '(10 20 30) 2)
30
```

### eq

**(eq X Y)**
Function that answers whether X and Y are equal or not.

```
>> (eq 'a 'a)
t
>> (eq 'a 'b)
nil
>> (eq 1 1)
t
>> (eq 1 2)
nil
>> (eq 1 1.0)
t
>> (eq 1 "1")
nil
>> (eq '(a b) '(a b))
nil
```

### equal

**(equal X Y)**
Function that answers whether X and Y are equal or not.

```
>> (equal 'a 'a)
t
>> (equal 'a 'b)
nil
>> (equal 1 1)
t
>> (equal 1 2)
nil
>> (equal 1 1.0)
t
>> (equal 1 "1")
nil
>> (equal '(a b) '(a b))
t
```

### evenp

**(evenp X)**
Predicate that returns t if X is an even integer, nil otherwise. Non-integer
numbers and non-numbers return nil.

```
>> (evenp 4)
t
>> (evenp 0)
t
>> (evenp -6)
t
>> (evenp 3)
nil
>> (evenp 2.5)
nil
```

### every

**(every PREDICATE LIST)**
Predicate that returns t if PREDICATE returns a non-nil value for every
element of LIST, nil otherwise. Returns t for the empty list (vacuous
truth).

```
>> (every (lambda (x) (> x 0)) '(1 2 3))
t
>> (every (lambda (x) (> x 0)) '(1 -1 3))
nil
>> (every (lambda (x) (> x 0)) nil)
t
```

### exit

**(kei-lisp specific)** Not present in Common Lisp (CL exit behavior is
implementation-defined, e.g. SBCL provides `sb-ext:exit`). Throws an
`ExitError` that library users can catch at the boundary.

**(exit)**
Function to exit the Lisp interpreter.

```
>> (exit)
Bye!
```

### exp

**(exp X)**
Function to answer the X power of e.

```
>> (exp 1)
2.718281828459045
>> (exp 2)
7.38905609893065
```

### expt

**(expt B E)**
Function that returns the base B raised to the exponent E.

```
>> (expt 2 10)
1024
>> (expt 9 0.5)
3
>> (expt 5 0)
1
```

### floor

**(floor X)**
Function that returns the largest integer less than or equal to X (rounded
toward negative infinity). The result is an integer (CL semantics); works
on integers, rationals, and floats.

```
>> (floor 3.7)
3
>> (floor -3.2)
-4
```

### ceiling

**(ceiling X)**
Function that returns the smallest integer greater than or equal to X
(rounded toward positive infinity).

```
>> (ceiling 3.2)
4
>> (ceiling -3.7)
-3
```

### find

**(find ITEM LIST)**
Function that returns the first element of LIST that is `eq` to ITEM, or
nil if not found. Returns nil for the empty list.

**(kei-lisp specific behavior)** Common Lisp's `find` accepts `:test` /
`:key` / `:from-end` keyword arguments; kei-lisp's variant uses `eq`
(identity) and only supports the positional 2-arg form.

```
>> (find 3 '(1 2 3 4))
3
>> (find 10 '(1 2 3))
nil
```

### floatp

**(floatp X)**
Function to answer whether X is a float (a double-precision floating-point
number). Integers are a distinct type and answer nil (CL type-tag
semantics). A literal is a float when it contains a decimal point or an
exponent.

```
>> (floatp 12.3)
t
>> (floatp 1.0)
t
>> (floatp 12)
nil
>> (floatp (/ 1 2))
nil
>> (floatp "a")
nil
```

### format

**(format L X1 X2 ... Xn)**
Function to format and write output. `L` is a format-string template;
`X1`, `X2`, ... are values to interpolate. Each `~` introduces a directive:

| Directive | Meaning                                                  |
| --------- | -------------------------------------------------------- |
| `~a`      | Insert next argument's printable form                    |
| `~Na`     | Insert next argument right-padded with spaces to width N |
| `~-Na`    | Insert next argument left-padded with spaces to width N  |
| `~%`      | Newline                                                  |

```
>> (setq a 10)
10
>> (format "~a" a)
10nil
>> (format "~a~%" a)
10
nil
>> (format "~5a~%" "hi")
hi
nil
>> (format "~-5a~%" "hi")
   hi
nil
```

`format` writes its formatted text to stdout and returns `nil`. In the
REPL the trailing `nil` you see is the return value being printed by the
REPL itself (use `~%` to insert a newline between the output and the
returned `nil`).

### gc

**(kei-lisp specific)** Not present in Common Lisp (CL's `room` prints
memory info but returns no value).

**(gc)**
Triggers a garbage collection and returns an association list of
post-GC memory statistics in bytes.

| Key          | Value (bytes)                                        |
| ------------ | ---------------------------------------------------- |
| `heap-used`  | V8 heap actually used by live objects                |
| `heap-total` | Total size of the V8 heap                            |
| `rss`        | Resident Set Size (total memory held by the process) |

```
>> (gc)
((heap-used . 12345678) (heap-total . 23456789) (rss . 45678901))
>> (cdr (assoc 'heap-used (gc)))
12345678
```

### gensym

**(gensym)**
Function to answer the new symbol.

```
>> (gensym)
id0
>> (gensym)
id1
```

### getf

**(getf PLIST KEY)** / **(getf PLIST KEY DEFAULT)**
Function that looks up KEY in a property list (a flat list of alternating
keys and values) and returns the value that follows it, or DEFAULT (nil when
omitted) if the key is absent. Usable as a [setf](#setf) place.

```
>> (setq pl '(a 1 b 2))
(a 1 b 2)
>> (getf pl 'b)
2
>> (getf pl 'c 99)
99
>> (setf (getf pl 'c) 3)
3
>> pl
(a 1 b 2 c 3)
```

### gethash

**(gethash KEY H)** / **(gethash KEY H DEFAULT)**
Function that looks up KEY in the hash table H and returns the stored value,
or DEFAULT (nil when omitted). Keys are compared by identity (`eq`); symbols,
keywords, integers, and strings all work as keys. Usable as a [setf](#setf)
place.

**(kei-lisp specific behavior)** CL's `gethash` returns a second value
indicating presence; kei-lisp returns only the value (use a unique default
to distinguish a stored nil).

```
>> (setq h (make-hash-table))
#<hash-table :count 0>
>> (setf (gethash :name h) "kei")
kei
>> (gethash :name h)
kei
>> (gethash :missing h 99)
99
```

### hash-table-count

**(hash-table-count H)**
Function that returns the number of entries in the hash table H.

```
>> (setq h (make-hash-table))
#<hash-table :count 0>
>> (setf (gethash 'a h) 1)
1
>> (hash-table-count h)
1
```

### hash-table-p

**(hash-table-p X)**
Function to answer whether X is a hash table.

```
>> (hash-table-p (make-hash-table))
t
>> (hash-table-p '(a 1))
nil
```

### handler-case

**(handler-case FORM (TYPE (VAR) X1 ... Xn) ...)**
Special form for error handling — the common subset of Common Lisp
`handler-case`, Scheme `guard`, and Clojure `try`/`catch`. Evaluates FORM;
when it signals an error, runs the body of the first clause whose TYPE
matches: `error` matches any interpreter error, `parse-error` /
`eval-error` match the specific families. VAR (optional) is bound to the
error message string. `throw` and `exit` are control flow, not errors, and
pass through untouched.

**(kei-lisp specific behavior)** CL's condition system (`signal`,
`restart-case`, condition classes) is not implemented; conditions are
represented by their message string.

```
>> (handler-case (+ 1 2) (error (e) 99))
3
>> (handler-case (error "boom") (error (e) e))
boom
>> (handler-case (undefined-fn 1) (eval-error (e) 'recovered))
recovered
```

### if

**(if X Y Z)**
Functions to do Y when X is t and to do Z when X is nil.

```
>> (if t (+ 2 3) (* 2 3))
5
>> (if nil (+ 2 3) (* 2 3))
6
>> (if (= 1 1) (+ 2 3) (* 2 3))
5
>> (if (= 1 2) (+ 2 3) (* 2 3))
6
```

### incf

**(incf PLACE)** / **(incf PLACE DELTA)**
Special form that increments the number stored in a generalized place (see
[setf](#setf)) by DELTA (default 1) and returns the new value.

```
>> (setq n 10)
10
>> (incf n)
11
>> (setq x (list 1 2))
(1 2)
>> (incf (car x))
2
>> x
(2 2)
```

### integerp

**(integerp X)**
Function to answer whether X is an integer. Integers have arbitrary
precision (bignum). An integral **float** such as `1.0` is not an integer
(CL type-tag semantics).

```
>> (integerp 12)
t
>> (integerp 99999999999999999999)
t
>> (integerp 1.0)
nil
>> (integerp (/ 1 2))
nil
```

### lambda

**(lambda L X1 X2 ... Xn)**
Function to generate the lambda expression with L as the argument, and X1, X2 ... and Xn as the process.

```
>>  (lambda (a b) (+ a b))
(lambda (a b) (+ a b))
>> ((lambda (a b) (+ a b)) 1 2)
3
```

### last

**(last L)**
Functions to answer the last element of the list L.

```
>> (last '(a b c d e f g h i j))
(j)
>> (last '(1 (2 (3 4) (5) (6 7) 8) 9))
(9)
>> (last '(((k (r s t u)) g (m)) c d ((n) (o (v w x y z) q))))
(((n) (o (v w x y z) q)))
```

### length

**(length SEQ)**
Function that returns the number of elements in a list, the number of code
points in a string, or 0 for nil. Throws on other types.

```
>> (length '(a b c d e f g h i j))
10
>> (length "hello")
5
>> (length "😀😀")
2
>> (length nil)
0
```

### let

**(let L X1 X2 ... Xn)**
Explicitly create a new environment. List L is a list of temporary variables, functions to do Y in parallel.

```
>> (setq a 10)
10
>> (let ((a 20)
        (b a))
        (format "~a~%~a~%" a b))
20
10
nil
```

### let\*

<br>**(let\* L X1 X2 ... Xn)**
Explicitly create a new environment. List L is a list of temporary variables, functions to do Y in sequence.

```
>> (setq a 10)
10
>> (let* ((a 20)
        (b a))
        (format "~a~%~a~%" a b))
20
20
nil
```

### list

**(list X1 X2 ... Xn)**
Functions to make a list of X1, X2 ... and Xn.

```
>> (list 'a 'b 'c 'd)
(a b c d)
>> (list 1 2 3 4)
(1 2 3 4)
```

### listp

**(listp X)**
Function to answer whether X is a List.

```
>> (listp '(1 2 3))
t
>> (listp '())
t
>> (listp 'a)
nil
>> (listp 1)
nil
>> (listp "a")
nil
>> (listp "abc")
nil
```

### load

**(load PATH)**
Function that reads the file at PATH, parses it, and evaluates every
top-level form in the global environment. Returns t. Definitions
(`defun`, `defmacro`, `setq`, ...) made by the file are available
afterwards.

```
>> (load "lib.lisp")
t
>> (function-defined-in-lib 1)
...
```

### make-array

**(make-array N)** / **(make-array N INIT)**
Function that returns a fresh one-dimensional vector of N elements, each
initialized to INIT (nil when omitted).

**(kei-lisp specific behavior)** CL's `make-array` takes dimensions and
keyword arguments (`:initial-element`); kei-lisp supports one dimension
with a positional initial element.

```
>> (make-array 3)
#(nil nil nil)
>> (make-array 3 0)
#(0 0 0)
```

### make-hash-table

**(make-hash-table)**
Function that returns a fresh, empty hash table. Entries are read with
[gethash](#gethash), written with `(setf (gethash key h) value)`, and
removed with [remhash](#remhash).

```
>> (make-hash-table)
#<hash-table :count 0>
```

### macroexpand

**(macroexpand X)**
Function to expand the form X repeatedly while its operator names a macro,
returning the fully expanded top-level form **without evaluating it**. X is
evaluated first, so quote the form you want to expand. Expansion is applied only
to the top-level form (not recursively into sub-forms), matching Common Lisp.

```
>> (defmacro inc (x) `(+ ,x 1))
inc
>> (defmacro inc2 (x) `(inc (inc ,x)))
inc2
>> (macroexpand '(inc2 5))
(+ (inc 5) 1)
```

### macroexpand-1

**(macroexpand-1 X)**
Function to expand the form X exactly once when its operator names a macro,
returning the result **without evaluating it**. X is evaluated first, so quote
the form you want to expand. A non-macro form is returned unchanged.

```
>> (defmacro my-when (test . body) `(if ,test (progn ,@body) nil))
my-when
>> (macroexpand-1 '(my-when t 1 2))
(if t (progn 1 2) nil)
>> (macroexpand-1 '(+ 1 2))
(+ 1 2)
```

### mapcar

**(mapcar X L)**
Functions to apply X to the elements of list L in sequence.

```
>> (mapcar list '(a b c))
((a) (b) (c))
>>  (mapcar (lambda (a) (* a 10)) '(1 2 3))
(10 20 30)
```

### mapcan

**(mapcan FN LIST)**
Function that applies FN to each element of LIST and concatenates the
resulting lists into a single list. Non-cons (including nil) results
contribute nothing.

```
>> (mapcan (lambda (x) (list x x)) '(1 2 3))
(1 1 2 2 3 3)
>> (mapcan (lambda (x) (if (> x 0) (list x) nil)) '(-1 1 -2 2))
(1 2)
```

### max

**(max X1 X2 ... Xn)**
Function that returns the largest of its numeric arguments. Requires at
least one argument.

```
>> (max 3 1 4 1 5 9 2 6)
9
>> (max 42)
42
>> (max 2 1.5 3)
3
```

### member

**(member X L)**
Functions to answer the list of subsequent elements when the list L contains X.

```
>> (member 'b '(a b c))
(b c)
>> (member 'd '(a b c))
nil
>> (member '2 '(1 (2 (3 4) (5) (6 7) 8) 9))
nil
```

### memq

**(memq X L)**
Functions to answer whether or not X is an element of list L.

```
>> (memq 'b '(a b c))
t
>> (memq 'd '(a b c))
nil
>> (memq '2 '(1 (2 (3 4) (5) (6 7) 8) 9))
nil
```

### min

**(min X1 X2 ... Xn)**
Function that returns the smallest of its numeric arguments. Requires at
least one argument.

```
>> (min 3 1 4 1 5 9 2 6)
1
>> (min 42)
42
>> (min 2 1.5 3)
1.5
```

### minusp

**(minusp X)**
Predicate that returns t if X is a number strictly less than zero, nil
otherwise. Non-numbers return nil.

```
>> (minusp -3)
t
>> (minusp -0.1)
t
>> (minusp 0)
nil
>> (minusp 2)
nil
```

### mod

**(mod X1 X2 ... Xn)**
Function to answer the excess of X1 divide by X2 ... and Xn.

```
>> (mod 1000 3)
1
>> (mod 100 43 8)
6
```

### multiply

**(multiply X1 X2 ... Xn)**
Function to answer the product of X1 and X2 ... and Xn.

```
>> (multiply 2 3)
6
>> (multiply 20 30 40)
24000
```

### napier

**(napier)**
Function to answer the Napier number

```
>> (napier)
2.718281828459045
```

### neq

**(neq X Y)**
Function that answers whether X and Y are not equal or not.

```
>> (neq 'a 'a)
nil
>> (neq 'a 'b)
t
>> (neq 1 1)
nil
>> (neq 1 2)
t
>> (neq 1 1.0)
nil
>> (neq 1 "1")
nil
>> (neq '(a b) '(a b))
t
```

### nequal

**(nequal X Y)**
Function that answers whether X and Y are not equal or not.

```
>> (nequal 'a 'a)
nil
>> (nequal 'a 'b)
t
>> (nequal 1 1)
nil
>> (nequal 1 2)
t
>> (nequal 1 1.0)
nil
>> (nequal 1 "1")
nil
>> (nequal '(a b c) '(a b c))
nil
```

### not

**(not X)**
Function to answer the logical negation of X.

```
>> (not t)
nil
>> (not nil)
t
>> (not (= 1 1))
nil
>> (not (= 1 2))
t
```

### notrace

**(notrace)**
Function to no output the calculation process.<br>
You can turn on the output with "[trace](#trace)".

```
>> (notrace)
t
```

### nth

**(nth X L)**
Function to answer the X-th element of the list L.

```
>> (nth 2 '(a b c d e f g h i j))
b
>> (nth 2 '(1 (2 (3 4) (5) (6 7) 8) 9))
(2 (3 4) (5) (6 7) 8)
>> (nth 4 '(((k (r s t u)) g (m)) c d ((n) (o (v w x y z) q))))
((n) (o (v w x y z) q))
```

### nthcdr

**(nthcdr X L)**
Function to answer the X-th element of tail of the list L.

```
>> (nthcdr 2 '(a b c d e f g h i j))
(c d e f g h i j)
>> (nthcdr 2 '(1 (2 (3 4) (5) (6 7) 8) 9))
(9)
>> (nthcdr 1 '(1 (2 (3 4) (5) (6 7) 8) 9))
((2 (3 4) (5) (6 7) 8) 9)
```

### null

**(null X)**
Function to answer whether X is a Nil.

```
>> (null '(1 2 3))
nil
>> (null '())
t
>> (null 'a)
nil
>> (null 1)
nil
>> (null "a")
nil
>> (null "abc")
nil
```

### numberp

**(numberp X)**
Function to answer whether X is a Number.

```
>> (numberp 12)
t
>> (numberp 12.3)
t
>> (numberp -12)
t
>> (numberp -12.3)
t
>> (numberp '(1 2 3))
nil
>> (numberp '())
nil
>> (numberp 'a)
nil
>> (numberp "a")
nil
>> (numberp "abc")
nil
```

### or

**(or X1 X2 ... Xn)**
Function to answer the logical sums of X1, X2 ... and Xn.

```
>> (or t nil)
t
>> (or (= 1 1) (= 1 1))
t
>> (or (= 1 1) (= 2 1))
t
>> (or t (= 1 1))
t
>> (or nil (= 1 1))
t
>> (or nil (= 2 1))
nil
```

### oddp

**(oddp X)**
Predicate that returns t if X is an odd integer, nil otherwise. Non-integer
numbers and non-numbers return nil.

```
>> (oddp 5)
t
>> (oddp -7)
t
>> (oddp 0)
nil
>> (oddp 4)
nil
>> (oddp 3.5)
nil
```

### pi

**(pi)**
Function to answer Pi.

```
>> (pi)
3.141592653589793
```

### plusp

**(plusp X)**
Predicate that returns t if X is a number strictly greater than zero, nil
otherwise. Non-numbers return nil.

```
>> (plusp 3)
t
>> (plusp 0.1)
t
>> (plusp 0)
nil
>> (plusp -2)
nil
```

### position

**(position ITEM LIST)**
Function that returns the zero-based index of the first element of LIST that
is `eq` to ITEM, or nil if not found.

**(kei-lisp specific behavior)** Common Lisp's `position` accepts `:test` /
`:key` / `:from-end` keyword arguments; kei-lisp's variant uses `eq`
(identity) and only supports the positional 2-arg form.

```
>> (position 'c '(a b c))
2
>> (position 'z '(a b c))
nil
```

### pop

**(pop PLACE)**
Special form that removes and returns the first element of the list stored
in a generalized place (see [setf](#setf)): a symbol, `(car x)`, `(cdr x)`,
and so on. Returns nil when the place value is not a Cons.

```
>> (setq a '(1 2 3))
(1 2 3)
>> (pop a)
1
>> (pop a)
2
>> (pop a)
3
>> (pop a)
nil
```

### progn

**(progn X1 X2 ... Xn)**
Evaluates X1, X2 ... Xn in sequence and returns the value of Xn.
Performs no binding and creates no new scope (matches Common Lisp `progn` /
Scheme `begin` / Clojure `do`).

```
>> (setq a 10)
10
>> (progn (format "~a~%" a)
          (setq a (+ a 10))
          (format "~a~%" a))
10
20
nil
```

### princ

**(princ X)**
Function to output X without a newline.

```
>> (princ (+ 1 2))
33
```

### print

**(print X)**
Function to output X with a newline.

```
>> (print (+ 1 2))
3
3
```

### push

**(push X PLACE)**
Special form that prepends the value of X onto the list stored in a
generalized place (see [setf](#setf)): a symbol, `(cdr x)`, and so on.
Returns the new list.

**(kei-lisp specific behavior)** `push` here is destructive on the place,
matching Common Lisp; note that Clojure's `conj` / Scheme's SRFI-1 idioms
are non-destructive.

```
>> (setq a '())
nil
>> (push 1 a)
(1)
>> (push 2 a)
(2 1)
>> (push 3 a)
(3 2 1)
```

### quote

**(quote X)**
Function to answer the reference.

```
>> (quote a)
a
>> (quote 1)
1
```

### backquote (quasiquote)

**`` `X `` / `,Y` / `,@Z`**
Backquote (`` ` ``) is a quasiquote: like `quote` it returns the template X
unevaluated, except that any `,Y` (unquote) inside the template is replaced by
the value of Y, and any `,@Z` (unquote-splicing) splices the elements of the
list Z into the surrounding list. Nested backquotes raise the level, so an inner
`,` only takes effect at the matching depth. This is the primary tool for
building the expansion returned by a [`defmacro`](#defmacro) body.

```
>> (setq x 5)
5
>> `(a ,x c)
(a 5 c)
>> `(a ,@(list 1 2 3) z)
(a 1 2 3 z)
>> `(sum ,(+ 1 2 3))
(sum 6)
>> `(a . ,x)
(a . 5)
```

Using `,` or `,@` outside of a backquote signals an error.

### random

**(random)**
Function to answer a random number greater than or equal to 0 and less than or equal to 1.

```
>> (random)
0.009480010828665675
>> (random)
0.8373835786363886
>> (random)
0.11100420744539452
>> (random)
0.9867023484200941
```

### rationalp

**(rationalp X)**
Function to answer whether X is an exact rational number: an integer or a
ratio. Floats are not rational (CL semantics).

```
>> (rationalp 1)
t
>> (rationalp (/ 1 2))
t
>> (rationalp 0.5)
nil
```

### reduce

**(reduce FN LIST [INIT])**
Function that left-folds LIST using FN. With INIT, starts the accumulator
from INIT and folds: `(fn init e1)`, `(fn r1 e2)`, … With no INIT,
starts from the first element and folds the rest. For an empty LIST,
returns INIT if given, otherwise calls FN with no arguments.

**(kei-lisp specific behavior)** Common Lisp's `reduce` accepts `:from-end`,
`:initial-value`, `:key`, `:start`, `:end` keyword arguments; kei-lisp's
variant only supports the positional 2 or 3-arg form (initial value as
the third positional argument).

```
>> (reduce (lambda (a b) (+ a b)) '(1 2 3 4 5))
15
>> (reduce (lambda (a b) (+ a b)) '(1 2 3) 100)
106
>> (reduce + nil 0)
0
```

### remove

**(remove ITEM LIST)**
Function that returns a fresh list with every element `eq` to ITEM removed.
The original list is not modified.

**(kei-lisp specific behavior)** This follows Common Lisp: `remove` removes
an **item**. Clojure's and SRFI-1's `remove` take a **predicate** instead —
that variant is [remove-if](#remove-if) here. CL's `:test` / `:key` /
`:count` keyword arguments are not supported.

```
>> (remove 2 '(1 2 3 2))
(1 3)
>> (remove 9 '(1 2 3))
(1 2 3)
```

### remove-if

**(remove-if PRED LIST)**
Function that returns a fresh list with every element satisfying the
predicate PRED removed. The original list is not modified.

```
>> (remove-if (lambda (v) (evenp v)) '(1 2 3 4))
(1 3)
>> (remove-if 'oddp '(1 2 3 4))
(2 4)
```

### read-from-string

**(read-from-string S)**
Function that parses the string S and returns the first expression it
contains, without evaluating it (code as data). Combine with `eval` to
run it.

```
>> (read-from-string "(+ 1 2)")
(+ 1 2)
>> (eval (read-from-string "(+ 1 2)"))
3
```

### remhash

**(remhash KEY H)**
Function that removes KEY from the hash table H. Returns t when the key
was present, nil otherwise.

```
>> (setq h (make-hash-table))
#<hash-table :count 0>
>> (setf (gethash 'a h) 1)
1
>> (remhash 'a h)
t
>> (remhash 'a h)
nil
```

### reverse

**(reverse L)**
Function to answer the list of list L inverse order.

```
>> (reverse '(a b c))
(c b a)
>> (reverse '(1 (2 (3 4) (5) (6 7) 8) 9))
(9 (2 (3 4) (5) (6 7) 8) 1)
```

### round

**(round X)**
Function to answer the rounded value of X.

```
>> (round 1.1)
1
>> (round 1.9)
2
>> (round 1.49)
1
>> (round 1.50)
2
```

### rplaca

**(rplaca X L)**
Function to bind X to the head of list L.

```
>> (setq a '(1 2 3))
(1 2 3)
>> (rplaca a 4)
(4 2 3)
```

### rplacd

**(rplacd X L)**
Function to bind X to the tail of list L.

```
>> (setq a '(1 2 3))
(1 2 3)
>> (rplacd a 4)
(1 . 4)
```

### setf

**(setf PLACE1 X1 PLACE2 X2 ... PLACEn Xn)**
Special form that assigns each value to the corresponding **generalized
place**, like [setq](#setq) but accepting places. Supported places: a symbol,
`(car x)`, `(cdr x)`, `(nth n x)` (1-based, like `nth`), `(elt x n)`
(zero-based), `(getf plist key)`, and struct field accessors generated by
[defstruct](#defstruct). Returns the last assigned value.

**(kei-lisp specific behavior)** Common Lisp's `setf` is extensible via
setf expanders; kei-lisp supports the fixed set of places above.

```
>> (setq x (list 1 2 3))
(1 2 3)
>> (setf (car x) 99)
99
>> x
(99 2 3)
>> (setf (nth 2 x) 88 (elt x 2) 77)
77
>> x
(99 88 77)
```

### setq

**(setq X Y)**
Functions to bind the value of Y to X.

```
>> (setq a 10)
10
>> a
10
>> (setq b "hello")
hello
>> b
hello
>> (let ((a 20))
        (setq a a))
20
>> a
10
```

### set-allq

**(kei-lisp specific)** Not present in Common Lisp.

**(set-allq X Y)**
Functions to bind the value of Y to X to the entire environment.

```
>> (setq a 10)
10
>> (let ((a 20))
        (set-allq a a))
20
>> a
20
```

### sin

**(sin X)**
Function to answer a sin of X.
Due to the limited accuracy of PI, there will be a slight error.

```
>> (sin 0)
0
>> (sin (/ (pi) 2))
1
>> (sin (pi))
1.2246467991473532e-16
```

### some

**(some PREDICATE LIST)**
Function that applies PREDICATE to each element in turn and returns the
first non-nil result, or nil if all results were nil. Returns nil for
an empty list.

```
>> (some (lambda (x) (> x 5)) '(1 2 9))
t
>> (some (lambda (x) (> x 5)) '(1 2 3))
nil
```

### sort

**(sort LIST PREDICATE)**
Function that returns LIST sorted using PREDICATE as the comparison
function. PREDICATE should return a non-nil value when its first argument
should come before its second.

**(kei-lisp specific behavior)** Common Lisp's `sort` is destructive and
accepts `:key`; kei-lisp's variant is non-destructive (returns a new
list) and only supports the positional 2-arg form.

```
>> (sort '(3 1 4 1 5 9 2 6) <)
(1 1 2 3 4 5 6 9)
>> (sort '(3 1 4 1 5 9 2 6) >)
(9 6 5 4 3 2 1 1)
```

### sqrt

**(sqrt X)**
Function to answer the square root of X.

```
>> (sqrt 1)
1
>> (sqrt 2)
1.4142135623730951
>> (sqrt 3)
1.7320508075688772
>> (sqrt 4)
2
>> (sqrt 9)
3
```

### subseq

**(subseq SEQ START [END])**
Function that returns the sub-sequence of SEQ from START (inclusive) to
END (exclusive). If END is omitted, returns through the end of SEQ.
Works on both strings (returns a string) and lists (returns a list).

```
>> (subseq "hello" 1 4)
ell
>> (subseq "hello" 2)
llo
>> (subseq '(1 2 3 4 5) 1 4)
(2 3 4)
>> (subseq '(1 2 3 4 5) 2)
(3 4 5)
```

### substring

**(substring STR START [END])**
Function that returns a substring of STR from START (inclusive) to END
(exclusive). If END is omitted, returns through the end of STR.

**(kei-lisp specific)** Not present in Common Lisp; use `subseq` for the
CL-compatible form (`subseq` also handles strings). `substring` is kept
for naming familiarity with other Lisp dialects.

```
>> (substring "hello world" 0 5)
hello
>> (substring "hello world" 6)
world
```

### concatenate

**(concatenate STR1 STR2 ...)**
Function that concatenates string arguments into a single string. Returns
the empty string when given no arguments.

**(kei-lisp specific behavior)** Common Lisp's `concatenate` takes a
type designator (`(concatenate 'string ...)`); kei-lisp's variant accepts
strings directly and only produces strings. Throws if any argument is
not a string.

```
>> (concatenate "a" "b" "c")
abc
>> (concatenate)

```

### subtract

**(subtract X1 X2 ... Xn)**
Function to answer the difference of X1 minus X2 ... and Xn.

```
>> (subtract 30 15 10)
5
>> (subtract 30 12.3 4.5)
13.2
```

### string-downcase

**(string-downcase STR)**
Function that returns STR converted to lowercase.

```
>> (string-downcase "WORLD")
world
```

### string-trim

**(string-trim STR)**
Function that returns STR with leading and trailing whitespace removed.
Interior whitespace is preserved.

**(kei-lisp specific behavior)** Common Lisp's `string-trim` takes a
character bag; kei-lisp uses JavaScript's `String.prototype.trim`, which
trims any Unicode whitespace.

```
>> (string-trim "  abc  ")
abc
>> (string-trim " a b ")
a b
```

### string-upcase

**(string-upcase STR)**
Function that returns STR converted to uppercase.

```
>> (string-upcase "hello")
HELLO
```

### stringp

**(stringp X)**
Function to answer whether X is a String.

```
>> (stringp '(1 2 3))
nil
>> (stringp '())
nil
>> (stringp 'a)
nil
>> (stringp 1)
nil
>> (stringp "a")
t
>> (stringp "abc")
t
```

### svref

**(svref V N)**
Alias of [aref](#aref) (simple-vector access).

### symbolp

**(symbolp X)**
Function to answer whether X is a Symbol.

```
>> (symbolp '(1 2 3))
nil
>> (symbolp '())
nil
>> (symbolp 'a)
t
>> (symbolp 1)
nil
>> (symbolp "a")
nil
>> (symbolp "abc")
nil
```

### tan

**(tan X)**
Function to answer a tan of X.
Due to the limited accuracy of PI, there will be a slight error.

```
>> (tan 0)
0
>> (tan (/ (pi) 4))
0.9999999999999999
```

### terpri

**(terpri)**
Function to output new line;

```
>> (terpri)

t
```

### throw

**(throw TAG X)**
Special form that evaluates TAG and X, then unwinds to the nearest
dynamically enclosing [catch](#catch) whose tag is `eq` to TAG; X becomes
the value of that `catch`. A `throw` with no matching `catch` signals an
evaluation error.

```
>> (catch 'tag (throw 'tag 42) 'not-reached)
42
```

### time

**(time X)**
Function to answer the processing time(ms) of X.

```
>> (time)
0.022915
>> (time (+ 1 2))
0.210059
>> (time (length '(a b c d e f g)))
6.062648
```

### trace

**(trace)**
Function to output the calculation process.<br>
You can turn off the output with "[notrace](#notrace)".

```
>> (trace)
t <== trace
t
>> (+ 1 (* 2 (+ 3 4)))
| (+ 1 (* 2 (+ 3 4)))
| | (* 2 (+ 3 4))
| | | (+ 3 4)
| | | (+ 3 4)
| | | 7 <== (+ 3 4)
| | (* 2 7)
| | 14 <== (* 2 7)
| (+ 1 14)
| 15 <== (+ 1 14)
15
```

### truncate

**(truncate X)**
Function that returns the integer part of X by rounding toward zero.

```
>> (truncate 3.7)
3
>> (truncate -3.7)
-3
>> (truncate 5)
5
```

### unless

**(unless X Y)**
Function to do Y when X is nil.

```
>> (unless t (+ 3 4))
nil
>> (unless nil (+ 3 4))
7
>> (unless (= 1 1) (+ 3 4))
nil
>> (unless (= 1 2) (+ 3 4))
7
```

### vector

**(vector X1 X2 ... Xn)**
Function that returns a fresh vector of the given elements. Vectors print
as `#(1 2 3)` (CL syntax; there is no reader literal yet) and provide
O(1) indexed access via [aref](#aref).

```
>> (vector 1 2 3)
#(1 2 3)
>> (length (vector 1 2 3))
3
```

### vectorp

**(vectorp X)**
Function to answer whether X is a vector.

```
>> (vectorp (vector 1))
t
>> (vectorp '(1))
nil
```

### when

**(when X Y)**
Function to do Y when X is t.

```
>> (when t (+ 3 4))
7
>> (when nil (+ 3 4))
nil
>> (when (= 1 1) (+ 3 4))
7
>> (when (= 1 2) (+ 3 4))
nil
```

### with-output-to-string

**(with-output-to-string () X1 ... Xn)**
Special form that evaluates the body while capturing program output
(`princ`, `print`, `terpri`, `format`) and returns the captured text as a
string. Corresponds to CL `with-output-to-string` / Clojure `with-out-str`.

**(kei-lisp specific behavior)** The stream variable list is accepted for
CL compatibility but no stream object is bound (kei-lisp has no stream
objects yet); write it as `()`.

```
>> (with-output-to-string () (princ 1) (princ 'a))
1a
>> (with-output-to-string () (format "~a-~a" 1 2))
1-2
```

### zerop

**(zerop X)**
Predicate that returns t if X is the number zero (either integer or
floating-point), nil otherwise. Non-numbers return nil.

```
>> (zerop 0)
t
>> (zerop 0.0)
t
>> (zerop 1)
nil
>> (zerop -1)
nil
```

### 1+

**(1+ X)**
Function that returns X plus 1. Conventional CL name for incrementing a
numeric value.

```
>> (1+ 5)
6
>> (1+ 2.5)
3.5
>> (1+ -3)
-2
```

### 1-

**(1- X)**
Function that returns X minus 1. Note: this is a decrement operation, not
"1 minus X".

```
>> (1- 5)
4
>> (1- 2.5)
1.5
>> (1- -3)
-4
```

### +

**(+ X1 X2 ... Xn)**
Function to answer the sum of X1, X2 ... and Xn.<br>
Same as the function "[add](#add)".

```
>> (+ 1 2)
3
>> (+ 12 -34 5.6 -7.8 90)
65.8
```

### -

**(- X1 X2 ... Xn)**
Function to answer the difference of X1 minus X2 ... and Xn.<br>
Same as the function "[subtract](#subtract)".

```
>> (- 30 15 10)
5
>> (- 30 12.3 4.5)
13.2
```

### \*

**(\* X1 X2 ... Xn)**
Function to answer the product of X1 and X2 ... and Xn.<br>
Same as the function "[multiply](#multiply)".

```
>> (* 2 3)
6
>> (* 20 30 40)
24000
```

### /

**(/ X1 X2 ... Xn)**
Function to answer the quotient of X1 divided by X2 ... and Xn.<br>
Same as the function "[divide](#divide)". Division of integers is **exact**:
when it does not divide evenly the result is a rational (CL semantics).
Involving a float makes the result a float. Exact division by zero signals
an error.

```
>> (/ 10 5)
2
>> (/ 1 2)
1/2
>> (/ 12 5 4)
3/5
>> (/ 1.0 2)
0.5
```

### //

**(kei-lisp specific)** Common Lisp uses `mod` / `rem`; `//` as an operator
is unique to kei-lisp.

**(// X1 X2 ... Xn)**
Function to answer the excess of X1 divide by X2 ... and Xn.<br>
Same as the function "[mod](#mod)".

```
>> (// 1000 3)
1
>> (// 100 43 8)
6
```

### =

**(kei-lisp specific)** In Common Lisp `=` is the **numeric** comparison
operator; in kei-lisp it is an alias for `equal` (structural equality
including non-numeric values).

**(= X Y)**
Function that answers whether X and Y are equal or not.<br>
Same as the function "[equal](#equal)".

```
>> (= 'a 'a)
t
>> (= 'a 'b)
nil
>> (= 1 1)
t
>> (= 1 2)
nil
>> (= 1 1.0)
t
>> (= 1 "1")
nil
>> (= '(a b) '(a b))
t
```

### ==

**(kei-lisp specific)** Not present in Common Lisp; alias for `eq`
(identity comparison).

**(== X Y)**
Function that answers whether X and Y are equal or not.<br>
Same as the function "[eq](#eq)".

```
>> (== 'a 'a)
t
>> (== 'a 'b)
nil
>> (== 1 1)
t
>> (== 1 2)
nil
>> (== 1 1.0)
t
>> (== 1 "1")
nil
>> (== '(a b) '(a b))
nil
```

### ~=

**(kei-lisp specific)** Not present in Common Lisp; alias for `nequal`
(structural not-equal).

**(~= X Y)**
Function that answers whether X and Y are not equal or not.<br>
Same as the function "[nequal](#nequal)".

```
>> (~= 'a 'a)
nil
>> (~= 'a 'b)
t
>> (~= 1 1)
nil
>> (~= 1 2)
t
>> (~= 1 1.0)
nil
>> (~= 1 "1")
t
>> (~= '(a b) '(a b))
nil
```

### ~~

**(kei-lisp specific)** Not present in Common Lisp; alias for `neq`
(identity not-equal).

**(~~ X Y)**
Function that answers whether X and Y are not equal or not.<br>
Same as the function "[neq](#neq)".

```
>> (~~ 'a 'a)
nil
>> (~~ 'a 'b)
t
>> (~~ 1 1)
nil
>> (~~ 1 2)
t
>> (~~ 1 1.0)
nil
>> (~~ 1 "1")
t
>> (~~ '(a b) '(a b))
t
```

### <

**(< X1 X2 ... Xn)**
Function to answers whether X1, X2 ... and Xn is arranged in ascending order with no overlap.

```
>> (< 1 2 3)
t
>> (< 1 1 2)
nil
>> (< 3 2 1)
nil
```

### <=

**(<= X1 X2 ... Xn)**
Function to answers whether X1, X2 ... and Xn is arranged in ascending order with overlap.

```
>> (<= 1 2 3)
t
>> (<= 1 1 2)
t
>> (<= 3 2 1)
nil
```

### >

**(> X1 X2 ... Xn)**
Function to answers whether X1, X2 ... and Xn is arranged in descending order with no overlap.

```
>> (> 3 2 1)
t
>> (> 2 2 1)
nil
>> (> 1 2 3)
nil
```

### >=

**(>= X1 X2 ... Xn)**
Function to answers whether X1, X2 ... and Xn is arranged in descending order with overlap.

```
>> (>= 3 2 1)
t
>> (>= 2 2 1)
t
>> (>= 1 2 3)
nil
```
