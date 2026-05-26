# Built-in Functions

Reference for all built-in functions, special forms, and operators in kei-lisp.

Entries are organized into the following categories:

- [Arithmetic](#arithmetic) — `+`, `-`, `*`, `/`, `//`, `mod`, `abs`, `exp`, `expt`, `sqrt`, `sin`, `cos`, `tan`, `round`, `truncate`, `floor`, `ceiling`, `min`, `max`, `random`, `pi`, `napier`
- [Comparison](#comparison) — `=`, `==`, `~=`, `~~`, `<`, `<=`, `>`, `>=`
- [Logic](#logic) — `and`, `or`, `not`
- [Predicates](#predicates) — `atom`, `consp`, `listp`, `numberp`, `integerp`, `floatp`, `doublep`, `stringp`, `symbolp`, `characterp`, `null`, `eq`, `equal`, `neq`, `nequal`, `evenp`, `oddp`, `zerop`, `plusp`, `minusp`
- [List operations](#list-operations) — `car`, `cdr`, `cons`, `list`, `length`, `last`, `nth`, `nthcdr`, `reverse`, `append`, `butlast`, `assoc`, `member`, `memq`, `mapcar`, `mapcan`, `rplaca`, `rplacd`, `push`, `pop`, `copy`, `elt`, `subseq`, `count`, `reduce`, `every`, `some`, `find`, `sort`
- [Strings](#strings) — `string-upcase`, `string-downcase`, `string-trim`, `substring`, `concatenate`
- [Variables and bindings](#variables-and-bindings) — `setq`, `set-allq`, `bind`, `gensym`
- [Functions and special forms](#functions-and-special-forms) — `defun`, `lambda`, `apply`, `quote`, `eval`, `let`, `let*`, `progn`
- [Control flow](#control-flow) — `if`, `cond`, `when`, `unless`, `do`, `do*`, `dolist`
- [I/O and formatting](#io-and-formatting) — `format`, `print`, `princ`, `terpri`
- [System](#system) — `exit`, `gc`, `time`, `trace`, `notrace`

> The original alphabetical reference of each function follows below.

> **Legend**: Entries marked **(kei-lisp specific)** are either not part of
> the Common Lisp standard or behave differently from CL. They are kept for
> historical reasons or because of platform constraints (e.g. JS has only
> one numeric type).

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

### defun

**(defun N L X1 X2 ... Xn)**
Function defining function with N as the function name, L as the argument, and X1, X2 ... and Xn as the process.

```
>> (defun tasu (a b) (+ a b))
tasu
>> (tasu 1 2)
3
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

### doublep

**(kei-lisp specific)** Not present in Common Lisp; in kei-lisp it is the
same as `numberp` (JS has only one numeric type, so "double" and "number"
collapse to the same check).

**(doublep X)**
Function to answer whether X is a Double.

```
>> (doublep 12)
t
>> (doublep 12.3)
t
>> (doublep -12)
t
>> (doublep -12.3)
t
>> (doublep 3.4E-38)
t
>> (doublep 3.4E+38)
t
>> (doublep 1.7E+308)
t
>> (doublep 1.7E-308)
t
>> (doublep '(1 2 3))
nil
>> (doublep '())
nil
>> (doublep 'a)
nil
>> (doublep "a")
nil
>> (doublep "abc")
nil
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
toward negative infinity).

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

**(kei-lisp specific behavior)** In Common Lisp `floatp` is a type-tag
predicate (integer vs float). In kei-lisp, because JS has only one numeric
type (double), `floatp` is interpreted as a **range check**: it returns
`t` when X is representable in IEEE 32-bit (single-precision) float range.

**(floatp X)**
Function to answer whether X is a Float.

```
>> (floatp 12)
t
>> (floatp 12.3)
t
>> (floatp -12)
t
>> (floatp -12.3)
t
>> (floatp 3.4E-38)
t
>> (floatp 3.4E+38)
t
>> (floatp 1.7E-308)
nil
>> (floatp 1.7E+308)
nil
>> (floatp '(1 2 3))
nil
>> (floatp '())
nil
>> (floatp 'a)
nil
>> (floatp "a")
nil
>> (floatp "abc")
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

### integerp

**(integerp X)**
Function to answer whether X is an Integer.

```
>> (integerp 12)
t
>> (integerp 12.3)
nil
>> (integerp -12)
t
>> (integerp -12.3)
nil
>> (integerp 3.4E-38)
nil
>> (integerp 3.4E+38)
t
>> (integerp 1.7E-308)
nil
>> (integerp 1.7E+308)
t
>> (integerp '(1 2 3))
nil
>> (integerp '())
nil
>> (integerp 'a)
nil
>> (integerp "a")
nil
>> (integerp "abc")
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

### pop

**(pop L)**
Function to pop to Symbol-bound list L.

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

**(push X L)**
Function to push the value of X to Symbol-bound list L.

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
Same as the function "[divide](#divide)".

```
>> (/ 10 5)
2
>> (/ 12 5 4)
0.6
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
