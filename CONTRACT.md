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

**SD1 - Shape documents and subschemas.**\
A shape document is a JSON object whose root carries `"$schema": "urn:apnex:shape-check:dialect:1"`.\
`$schema` is the dialect marker, not one of SD2's keywords, and it is allowed at a document's root and nowhere else.\
A subschema is a JSON object standing as a value of `properties`, or as the value of `items` or `additionalProperties`; it carries no `$schema`, and the boolean shapes of JSON Schema are not part of the dialect, except `false` as the value of `additionalProperties`.\
A judgement is always of a value against a whole shape document.\
A part that places one document inside another removes the inner document's `$schema` after checking that it names dialect 1.\
The dialect is a subset of JSON Schema 2020-12, and a keyword means what that specification says unless SD2 says otherwise.\
Once released, what dialect 1 means never changes; a keyword added later belongs to a new dialect identifier.\
How a particular shape is versioned belongs to whoever supplies it, not to shape-check.\
Tested by: stage 1's criterion and `E9`, in `test/contract/declared-shape-validation.test.js`, with corpus cases for a marked root, a marker in a subschema, and a document placed inside another.

**SD2 - The keywords.**

| Keyword | Value in a shape | Applies to | What it requires |
|---|---|---|---|
| `type` | one of `object`, `array`, `string`, `number`, `integer`, `boolean`, `null`, or a non-empty list of them without repeats | any value | the value is of one of the types; an `integer` is a number with no fractional part |
| `properties` | an object whose values are subschemas | objects | each property present is judged against its subschema |
| `required` | a list of distinct strings | objects | each named property is present |
| `additionalProperties` | `false`, or a subschema | objects | a property not named in `properties` is absent, or fits the subschema |
| `items` | a subschema | arrays | every item fits the subschema |
| `enum` | a non-empty list of distinct values | any value | the value equals one of them |
| `const` | any value | any value | the value equals it |
| `pattern` | a string holding an ECMAScript regular expression, compiled with the `u` flag | strings | the expression matches somewhere in the string |
| `minLength`, `maxLength` | a non-negative integer | strings | the length, counted in Unicode code points, is at least or at most the number |
| `minItems`, `maxItems` | a non-negative integer | arrays | the number of items is at least or at most the number |
| `format` | the string `uri` | strings | the string is an absolute URI: a letter, then letters, digits, `+`, `-` or `.`, then `:`, and no whitespace or control character anywhere |

A non-negative integer here is a JSON number with no fractional part, at least 0 and at most 9007199254740991.\
`format` is an assertion in this dialect, not an annotation.\
Two values are equal when they are equal as JSON: numbers by value, so `1` equals `1.0`; objects regardless of the order of their properties.\
A keyword that applies to one type ignores a value of another type, so a string judged against `minItems` meets it.\
Tested by: stage 1's criterion and `E9`, in `test/contract/declared-shape-validation.test.js`.

**SD3 - A shape that is refused.**\
A shape is refused, and no value is judged against it, when it has any of these problems:

| `problem` | `pointer` | `keyword` | When |
|---|---|---|---|
| `not-an-object` | the document or subschema | empty | the document, or a subschema, is not a JSON object |
| `missing-dialect` | empty | `$schema` | the root carries no `$schema` |
| `unknown-dialect` | empty | `$schema` | the root's `$schema` is not dialect 1's identifier |
| `nested-dialect` | the subschema | `$schema` | a subschema carries `$schema` |
| `unknown-keyword` | the document or subschema | the keyword | a property is neither one of SD2's keywords nor the root's `$schema` |
| `invalid-value` | the document or subschema | the keyword | a keyword's value is not of the form SD2 gives |
| `invalid-pattern` | the document or subschema | `pattern` | a `pattern` is a string that does not compile |

Each problem is a record of exactly those three fields, with `pointer` an RFC 6901 JSON pointer into the shape.\
When the document is not an object, or its marker is missing or unknown, that one problem is the whole list and nothing else is examined.\
Otherwise every problem is listed: nothing below a keyword whose value is invalid is examined, and every subschema under a valid `properties`, `items` or `additionalProperties` is.\
Problems are ordered by pointer as SD5 orders them, then by keyword, then by problem, each compared by Unicode code point.\
A shape is never partly applied.\
Tested by: stage 1's criterion, in `test/contract/declared-shape-validation.test.js`, with a corpus case for each problem and one shape holding several.

**SD4 - Verdicts and misfit records.**\
A judgement yields exactly one of three verdicts, each a JSON object with no other properties.

The three verdicts look like this:
```json
{ "verdict": "fits" }
{ "verdict": "misfit", "misfits": [{ "pointer": "/summary", "keyword": "maxLength", "expected": 1024, "fit": "a string of length at most 1024" }] }
{ "verdict": "shape-refused", "problems": [{ "pointer": "", "keyword": "$schema", "problem": "unknown-dialect" }] }
```

A misfit record has exactly four fields: `pointer`, an RFC 6901 JSON pointer into the value; `keyword`; `expected`, the part of the shape the value broke; and `fit`, a sentence made from this fixed table, so that every implementation and every corpus case agrees on its text.

| Keyword | `pointer` | `expected` | `fit` |
|---|---|---|---|
| `type` | the value | the keyword's value | `a value of type T`, the types in the shape's order joined by ` or ` |
| `required` | where the missing property would be | the missing property's name | `a property named P` |
| `additionalProperties` with `false` | the property not allowed | `false` | `no property named P` |
| `enum` | the value | the keyword's value | `one of V`, the values in the shape's order joined by `, ` |
| `const` | the value | the keyword's value | `exactly V` |
| `pattern` | the string | the keyword's value | `a string matching P` |
| `minLength` | the string | the keyword's value | `a string of length at least N` |
| `maxLength` | the string | the keyword's value | `a string of length at most N` |
| `minItems` | the array | the keyword's value | `an array of length at least N` |
| `maxItems` | the array | the keyword's value | `an array of length at most N` |
| `format` | the string | `uri` | `an absolute URI, such as https://example.com/page` |

`T` is a type's name as written; `N` is the number in decimal; `P` and each `V` are written in canonical JSON.\
Canonical JSON has no whitespace, writes an object's properties ordered by the Unicode code points of their names, and writes strings and numbers as ECMAScript's `JSON.stringify` does.\
A property not allowed by an `additionalProperties` subschema is judged against that subschema, and its misfits are the subschema's own.\
Tested by: stage 1's criterion and `E9`, in `test/contract/declared-shape-validation.test.js`, with corpus cases whose `enum` and `const` hold objects.

**SD5 - Every misfit, in one order.**\
A judgement reports every misfit in the value, not the first.\
Misfits are ordered by pointer and then by keyword.\
Pointers compare token by token, and at the first token where two pointers differ both tokens name children of one parent: indices of one array compare as numbers, property names by Unicode code point, and a pointer sorts before every longer pointer it begins.\
Keywords compare by Unicode code point.\
The same shape and value always yield the same verdict, record for record and in the same order.\
Tested by: `E9`, in `test/contract/declared-shape-validation.test.js`, with a corpus case misfitting at array indices 2 and 10, and in the tests of operation-call and entity-store that run the corpus.

**SD6 - The corpus.**\
The package ships a corpus in its `corpus/` directory, exported as `@apnex/shape-check/corpus`, so that every component carrying `declared-shape-validation` runs the same cases.\
Each case is one JSON file holding exactly `description`, a string; `shape`, any JSON value; `value`, any JSON value whose numbers are all integers within 9007199254740991 of zero or not integers, and which nests at most 20 levels; and `verdict`, the expected verdict of SD4.\
It covers, for every keyword of SD2, a value that fits and one that does not; every problem of SD3; one shape with several problems; ordering under SD5; `enum` and `const` holding objects; and the body shape of zorg's knowledge entry.\
An agent other than the one that implements shape-check writes it from this section alone.\
Tested by: stage 1's criterion, by `test/contract/declared-shape-validation.test.js` running every case.

**SD7 - How a carrying component runs the corpus.**\
In operation-call, a fixture host declares, for each case, one operation whose input shape is the case's shape, and a caller invokes it with the case's value as its input.\
A refused shape makes the declaration fail with the case's problems; a misfit ends the call refused with code `input-misfit` and the case's misfits; a fit reaches the operation.\
In entity-store, a store is opened, for each case, with one kind whose body shape is the case's shape, and an entity is created with the case's value as its body.\
A refused shape makes opening fail with the case's problems; a misfit is refused with code `misfit` and the case's misfits; a fit is accepted.\
Neither component limits an input or a body to objects, so every case reaches the judgement; each compares the records it returns with the case's, in canonical JSON, byte for byte.\
Tested by: `E9`, in `operation-call/test/contract/declared-shape-validation.test.js` and `entity-store/test/contract/declared-shape-validation.test.js`.

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
