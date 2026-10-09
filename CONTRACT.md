---
id: unminted
category: component
title: shape-check - judge a value against a shape declared as data
status: draft
hydrate-when: Two or more parts of a system check data against shapes declared as data, and each is about to write its own checker
sovereignty: internal
supersedes: []
related: [C0, A3]
---

# shape-check

The contract of record for shape-check, admitted to zorg's component set by the director's ruling `D2` in zorg's `docs/DECISIONS.md`.\
It also carries the fields of a mission-kit registry entry, and that entry is generated from this file when the component is filed, never written as a second copy.\
The registry id is unminted on purpose; one is minted only when the entry is admitted to the registry.

---

## Duty

Judge whether a value fits a shape declared as data.

---

## Contract

What a consumer can depend on, one capability per row.\
A capability is named for what it offers, not for who offers it, so two components that provide the same capability share its name, and the overlap is visible.\
**Provides** means this component implements the capability; **carries from X** means it passes X's capability through its own interface.\
**Requires** names the capabilities of other components a row depends on, as `component:capability`, so a census can follow an application's demand down through the components it reaches.\
The trait column names any trait a system takes on by using the capability.

| Capability | Relation | Requires | What a consumer can depend on | Trait |
|---|---|---|---|---|
| `declared-shape-validation` | provides | none | A value is judged against a shape declared as data; a misfit is explained with where it lies, what the shape expected there, and what would make the value fit, and the same value and shape always get the same verdict and reason. The part that asked owns any refusal. | none |

shape-check holds nothing between judgements, coordinates no actors and contains no model, so it brings no trait.

---

## Shape language and verdicts

**Maturity: provisional**, designed in stage 0 of zorg's Delta 1 under zorg's rulings `D19` and `D20`.\
Each declaration names the exit criterion of zorg's `docs/DELTAS/DELTA-1.md` that proves it and the test that exercises it.

**SD1 - The dialect.**\
A shape is a JSON object whose root carries `"$schema": "urn:apnex:shape-check:dialect:1"`, and no other place in it carries `$schema`.\
The dialect is a subset of JSON Schema 2020-12, and a keyword means what that specification says unless SD2 says otherwise.\
Once released, what dialect 1 means never changes; a keyword added later belongs to a new dialect identifier.\
How a particular shape is versioned belongs to whoever supplies it, not to shape-check.\
Tested by: stage 1's criterion and `E9`, in `test/contract/declared-shape-validation.test.js`.

**SD2 - The keywords.**

| Keyword | Value in a shape | Applies to | What it requires |
|---|---|---|---|
| `type` | one of `object`, `array`, `string`, `number`, `integer`, `boolean`, `null`, or a non-empty list of them without repeats | any value | the value is of one of the types; an `integer` is a number with no fractional part |
| `properties` | an object whose values are shapes | objects | each property present is judged against its shape |
| `required` | a list of distinct strings | objects | each named property is present |
| `additionalProperties` | `false`, or a shape | objects | a property not named in `properties` is absent, or fits the shape |
| `items` | a shape | arrays | every item fits the shape |
| `enum` | a non-empty list of distinct values | any value | the value equals one of them |
| `const` | any value | any value | the value equals it |
| `pattern` | an ECMAScript regular expression, compiled with the `u` flag | strings | the expression matches somewhere in the string |
| `minLength`, `maxLength` | a non-negative integer | strings | the length, counted in Unicode code points, is at least or at most the number |
| `minItems`, `maxItems` | a non-negative integer | arrays | the number of items is at least or at most the number |
| `format` | `uri` only | strings | the string is an absolute URI: a letter, then letters, digits, `+`, `-` or `.`, then `:`, and no whitespace or control character anywhere |

`format` is an assertion in this dialect, not an annotation.\
Two values are equal when they are equal as JSON: numbers by value, so `1` equals `1.0`; objects regardless of the order of their properties.\
A keyword that applies to one type ignores a value of another type, so a string judged against `minItems` meets it.\
Tested by: stage 1's criterion and `E9`, in `test/contract/declared-shape-validation.test.js`.

**SD3 - A shape that is refused.**\
A shape is refused, and no value is judged against it, when its root lacks the dialect identifier or carries another, when any place in it uses a keyword SD2 does not list, when a keyword's value is not of the form SD2 gives, or when a `pattern` does not compile.\
The verdict then lists every problem with the shape: a JSON pointer into the shape, the keyword, and the reason.\
A shape is never partly applied.\
Tested by: stage 1's criterion, in `test/contract/declared-shape-validation.test.js`, with cases for an unknown keyword, an unknown dialect identifier, a missing one, a malformed keyword value and a pattern that does not compile.

**SD4 - Verdicts and misfit records.**\
A judgement yields one of three verdicts: `fits`; `misfit`, with a list of misfit records; or `shape-refused`, with the list of SD3.\
A misfit record has four fields: `pointer`, an RFC 6901 JSON pointer into the value; `keyword`; `expected`, the part of the shape the value broke; and `fit`, a sentence saying what would fit, made from this fixed table so that every implementation and every corpus case agrees on its text.

| Keyword | `pointer` | `expected` | `fit` |
|---|---|---|---|
| `type` | the value | the keyword's value | `a value of type T`, with types in the shape's order joined by ` or ` |
| `required` | where the missing property would be | the missing property's name | `a property named P` |
| `additionalProperties` with `false` | the property not allowed | `false` | `no property named P` |
| `enum` | the value | the keyword's value | `one of V`, with each value JSON-encoded and joined by `, ` |
| `const` | the value | the keyword's value | `exactly V`, JSON-encoded |
| `pattern` | the string | the keyword's value | `a string matching P` |
| `minLength` | the string | the keyword's value | `a string of length at least N` |
| `maxLength` | the string | the keyword's value | `a string of length at most N` |
| `minItems` | the array | the keyword's value | `an array of length at least N` |
| `maxItems` | the array | the keyword's value | `an array of length at most N` |
| `format` | the string | `uri` | `an absolute URI, such as https://example.com/page` |

A property not allowed by an `additionalProperties` shape is judged against that shape, and its misfits are that shape's own.\
Tested by: stage 1's criterion and `E9`, in `test/contract/declared-shape-validation.test.js`.

**SD5 - Every misfit, in one order.**\
A judgement reports every misfit in the value, not the first.\
Misfits are ordered by pointer and then by keyword.\
Pointers compare token by token: two array indices compare as numbers, any other two tokens by Unicode code point, and a pointer sorts before every longer pointer it begins.\
Keywords compare by Unicode code point.\
The same shape and value always yield the same verdict, record for record and in the same order.\
Tested by: `E9`, in `test/contract/declared-shape-validation.test.js` and in the tests of operation-call and entity-store that run the corpus.

**SD6 - The corpus.**\
The package ships a corpus of cases, each a JSON file holding a description, a shape, a value and the expected verdict, so that every component carrying `declared-shape-validation` can run the same cases.\
It covers every keyword of SD2, each refusal of SD3, ordering under SD5, and an unknown dialect identifier.\
An agent other than the one that implements shape-check writes it from this section alone.\
Tested by: stage 1's criterion, by `test/contract/declared-shape-validation.test.js` running every case; and `E9`, by operation-call's and entity-store's `test/contract/declared-shape-validation.test.js` running every case.

---

## Reference

Not yet built.\
This repository, `apnex/shape-check`, private until its first working code: `VISION.md` and, once built, the implementation.

---

## Fit criteria

### Does my project want this at all

- More than one part of your system checks data against declared shapes, and the checks must agree.
- A caller, often an agent, must be able to fix a refused value from the refusal alone.

### Does it meet my requirement

- Shapes are data both sides can read.
- The same value and shape always get the same verdict and reason.
- Every misfit says where it lies and what would fix it.

**It is the wrong tool when**

| You need | Reach elsewhere, because shape-check is |
|---|---|
| shapes stored, versioned or shared between systems | not a store or a registry of shapes |
| a value repaired, filled in or coerced | not a repairer |
| a decision about who may submit a value | not an authority |
| a refusal for any reason other than fit | not the owner of every refusal |

---

## Adjustment policy

Internal and sovereign, so a fit gap has somewhere to go.

1. Record a measured gap where both sides can see it.
2. Resolve it by adjusting shape-check, so every consumer gets the change, or by fracturing it when the gap reveals a second duty.
3. Never fork.

---

## Edges

**Composes:** nothing registered.

**Consumes, through a declared contract:** nothing.

**Composed-by:** nothing yet.\
Its capability is carried by operation-call and entity-store.
