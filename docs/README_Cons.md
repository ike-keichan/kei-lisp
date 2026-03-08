# KeiLisp

（this document fix： 2020/12/04 create: 2020/12/04）

## Cons

In this interpreter, the following are called Cons.

- [Pairs](#Pairs)
- [List](#List)

### Pairs

Common Cons notation.　The front part of the "." is called "car" and the back part is called "cdr".
Pairs are separated by "(", ".", ")" and a space or other separator.
The interpreter recognizes when you write as follows.

```
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

### List

List is also part of Cons. For example, if you write a List like "(1 2 3)", the interpreter will internally call "(1 . (2 . (3 . nil)))".<br>
An exceptionally empty-list is a list, but not a Cons! An empty list is written as "()", but recognizes "nil".

```
>> '(1 2 3)
(1 2 3)

>> ()
nil
```
