# Atom

In kei-lisp, the following are called **atoms** — primitive, non-list values:

- [Symbol](#symbol)
- [Number](#number)
- [String](#string)
- [Nil](#nil)

## Symbol

A symbol is an identifier that can be bound to a value. Symbols must start with
an alphabetic character; subsequent characters may include digits as well.

When you enter a bound symbol, the interpreter returns its bound value.
When you enter an unbound symbol, the interpreter prints a warning and returns
`nil`.

```lisp
>> (setq a 10)
10
>> a
10
>> b
I could find no variable binding for b
nil
>> abc
I could find no variable binding for abc
nil
>> abc123
I could find no variable binding for abc123
nil
```

## Number

The interpreter accepts integers, negative numbers, decimal fractions, and
scientific notation:

```lisp
>> 123
123
>> -123
-123
>> 123.456
123.456
>> -123.456
-123.456
>> 123.456e7
1234560000
>> -123.456e-7
-0.0000123456
```

Internally all numbers are JavaScript `number` (IEEE 754 double).

## String

Strings are enclosed in double quotes (`"`):

```lisp
>> "Kyoto"
Kyoto
>> "I have a pen."
I have a pen.
```

Non-ASCII characters (emoji, Japanese, etc.) are preserved correctly:

```lisp
>> "Hello 😀"
Hello 😀
>> "こんにちは"
こんにちは
```

The following escape sequences are recognized inside string literals:

| Escape | Meaning          |
| ------ | ---------------- |
| `\n`   | Newline (LF)     |
| `\t`   | Tab              |
| `\r`   | Carriage return  |
| `\\`   | Single backslash |
| `\"`   | Literal `"`      |

Unknown escapes pass through as the literal character (e.g. `\x` becomes `x`).

## Nil

`nil` represents the absence of a value (sometimes called `null` in other
languages). In kei-lisp, the empty list `()` is also `nil`:

```lisp
>> nil
nil
>> ()
nil
```
