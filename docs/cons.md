# Cons

In kei-lisp, **Cons** is the fundamental compound data structure used to build
pairs and lists.

- [Pairs](#pairs)
- [Lists](#lists)

## Pairs

A **pair** is a two-element structure written as `(car . cdr)`. The element
before the dot is called **car**; the element after the dot is called **cdr**.
Tokens are separated by parentheses, the dot, and whitespace.

```lisp
>> '(1 . 2)
(1 . 2)

>> '(1.2 . 3.4)
(1.2 . 3.4)

>> '(Hello . World)
(Hello . World)

>> '(1 . nil)
(1)

>> '(nil . 1)
(nil . 1)
```

Note that `(1 . nil)` displays as `(1)` because a Cons whose `cdr` is `nil`
is, by definition, a one-element list.

## Lists

A **list** is a Cons cell whose `cdr` is itself a list (or `nil`). Writing
`(1 2 3)` is internally the chained pair `(1 . (2 . (3 . nil)))`.

The empty list `()` is `nil` — it is a list but not a Cons cell.

```lisp
>> '(1 2 3)
(1 2 3)

>> ()
nil
```

You can access list elements via [`car`](./built-in-functions.md#car),
[`cdr`](./built-in-functions.md#cdr), and other built-in functions:

```lisp
>> (car '(1 2 3))
1
>> (cdr '(1 2 3))
(2 3)
>> (cons 0 '(1 2 3))
(0 1 2 3)
>> (length '(1 2 3))
3
```
