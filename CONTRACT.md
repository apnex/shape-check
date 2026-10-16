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
| `plain-json-value` | provides | none | An arbitrary value is read once, without the call stack, into a deeply frozen plain JSON value - reading only own enumerable data properties through their descriptors when reading what application code handed back (zorg's `D54`), or reading each object once when snapshotting a caller's input (zorg's `EM12`), with depth, UTF-8 byte-length and safe-integer measures and any native promise met given a do-nothing handler - or refused as not plain JSON; and any plain JSON value is written in canonical form (`SD4`). | none |

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
| `format` | the string `uri` | strings | the string is an absolute URI: an ASCII letter, then ASCII letters, ASCII digits, `+`, `-` or `.`, then `:`, and no whitespace or control character anywhere |

A non-negative integer here is a JSON number with no fractional part, at least 0 and at most 9007199254740991.\
For `uri`, a whitespace character is any character ECMAScript's `\s` matches, and a control character is any code point from U+0000 to U+001F or from U+007F to U+009F.\
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
A subschema position is each value of `properties`, and the value of `items`, and the value of `additionalProperties` other than `false`; a value there that is not an object is the problem `not-an-object` at that position, never `invalid-value` at its parent, and its siblings are still examined.\
`invalid-value` is every other keyword value not of the form SD2 gives, such as `properties` that is not an object, or `required` holding a repeated name.\
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
Each case is one JSON file holding exactly `description`, a string; `shape`, any JSON value; `value`, any JSON value; and `verdict`, the expected verdict of SD4.\
Every case can cross AGP both as a request carrying its value and as a refusal carrying its misfits: every integer anywhere in it lies within 9007199254740991 of zero, its `shape` and its `value` each nest at most 20 levels, its `shape` is at most 65536 bytes in canonical JSON, and the whole case at most 131072 bytes.\
A judgement beyond those limits, such as a `const` holding a larger integer or a shape of more than 65536 bytes, is tested in shape-check's own tests, not in the corpus; the limits are the ones a store and a host admit, so every corpus shape is one both can take.\
It covers, for every keyword of SD2, a value that fits and one that does not; every problem of SD3; one shape with several problems; ordering under SD5; `enum` and `const` holding objects; and the body shape of zorg's knowledge entry.\
An agent other than the one that implements shape-check writes it from this section alone.\
Tested by: stage 1's criterion, by `test/contract/declared-shape-validation.test.js` running every case and checking each against these limits, with a case whose shape is exactly 65536 bytes, an unused `enum` member making up its size, and a value of 0 that fits; and `E12`, by `test/contract/public-surface.test.js` reading the corpus as `@apnex/shape-check/corpus`.

**SD7 - How a carrying component runs the corpus.**\
In operation-call, a fixture host declares, for each case, one operation whose input shape is the case's shape, and a caller invokes it with the case's value as its input.\
A refused shape makes the declaration fail with the case's problems; a misfit ends the call refused with code `input-misfit` and the case's misfits; a fit reaches the operation.\
In entity-store, a store is opened, for each case, with one kind whose body shape is the case's shape and the largest entity size a store allows, 262144 bytes, which every case's value fits within, and an entity is created with the case's value as its body.\
A refused shape makes opening fail with the case's problems; a misfit is refused with code `misfit` and the case's misfits; a fit is accepted.\
Neither component limits an input or a body to objects, and every case crosses AGP whole (SD6), so every case reaches the judgement and its records come back; each component compares the records it returns with the case's, in canonical JSON, byte for byte.\
Tested by: `E9`, in `operation-call/test/contract/declared-shape-validation.test.js` and `entity-store/test/contract/declared-shape-validation.test.js`.

**SD8 - Plain JSON values, snapshots, measures and canonical form (`D54`, `D55`).**\
`readPlainJson(value)` returns `{ok: true, value}`, where `value` is a fresh deeply frozen plain JSON value, or `{ok: false}` (after calling `observePromises(value)` so a consumer never walks the rejected value a second time to observe promises): it accepts `null`, booleans, finite numbers (`-0` normalised to `0`), strings, plain arrays (`Array.prototype`, `length` read from its own data descriptor, elements `0` to `length - 1` all own enumerable data properties with no holes, no extra own properties and no symbol keys) and plain objects (`Object.prototype` or `null` prototype, own enumerable string data properties only, no symbol keys, no non-enumerable properties, no getters or setters, `__proto__` and `then` defined as ordinary own data properties); any other value, a cycle on the active path, or a throw from a `Proxy` trap returns `{ok: false}`, while shared aliases on distinct paths are copied once without the call stack.\
`observePromises(value, maxNodes = 1000)` walks up to `maxNodes` objects or arrays by identity without the call stack, reading own data descriptors (`Object.getOwnPropertyDescriptor` over `Object.getOwnPropertyNames`, never invoking getters, setters or conversions, and catching any `Proxy` trap throw), and for `value` and every value obtained from an own data descriptor within `maxNodes` that is a native `Promise` (`instanceof Promise`), calls `Promise.prototype.then.call(v, noop, noop)` inside a `try`/`catch` guard, which consumes its rejection whenever attachment succeeds (when a promise carries an own `constructor` or `Symbol.species` getter that throws before reactions are installed, the throw is caught and that promise's rejection cannot be suppressed by ECMAScript).\
`snapshotJson(value)` snapshots a caller's input (`EM12`) without the call stack, returning `{ok: true, value}` (deeply frozen) or `{ok: false}`: it accepts `null`, booleans, finite numbers (`-0` normalised to `0`), strings, arrays (`Array.isArray`, reading `length` once and requiring every index `0` to `length - 1` to be present via `i in v` with no holes, reading `v[i]` once, ignoring non-index properties) and plain objects (`Object.prototype` or `null` prototype, reading each key of `Object.keys(v)` once via `v[k]` and defining it as an own enumerable data property on the copy, `__proto__` included, ignoring non-enumerable and symbol keys), memoising shared object identities so each object is read once, refusing cycles on the active path, array holes, non-finite numbers and non-JSON types as `{ok: false}`, and propagating any exception thrown by an input getter or `Proxy` trap to the caller.\
`SAFE_INTEGER_LIMIT` is `9007199254740991`; `toCanonicalJson(value)` writes any plain JSON value in `SD4`'s canonical form without the call stack; `utf8ByteLength(text)` returns the UTF-8 byte length of `text`; `nestingDepth(value)` returns `0` for a scalar and `1` plus the greatest child depth for an array or object (so `[]` and `{}` have depth `1`, matching AGP's container depth and `EM10` and `EM11`); and `firstUnsafeInteger(value)` returns `{pointer, value}` for the first integer outside `[-SAFE_INTEGER_LIMIT, SAFE_INTEGER_LIMIT]` in `SD5` pointer order (`pointer` `""` at the root), or `null` when every integer is within bounds.\
Tested by: `test/contract/plain-json-value.test.js`, covering descriptor-only reading, getters never called, `then` data properties vs native promises (including a throwing `constructor` getter), `Proxy` trap throws, `__proto__`, shared aliases, deep nesting beyond the call stack, cycles, sparse arrays, symbols, non-enumerable properties, `snapshotJson`, `toCanonicalJson`, `utf8ByteLength`, `nestingDepth` and `firstUnsafeInteger`.

---

## Reference

This repository, `apnex/shape-check`, private until its first working code is certified.\
The package `@apnex/shape-check` exports `judgeShapeValue`, `prepareShapeDocument`, `SHAPE_DIALECT_ID`, `readPlainJson`, `observePromises`, `snapshotJson`, `toCanonicalJson`, `utf8ByteLength`, `nestingDepth`, `firstUnsafeInteger` and `SAFE_INTEGER_LIMIT`, as `export-map.json` records, and `@apnex/shape-check/corpus` holds the corpus of SD6, written from this contract by an agent other than the one that built the implementation.\
The implementation imports no module particular to one runtime.

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
Its capabilities are carried or consumed by operation-call, entity-store, entity-api, caller-identity, operation-proxy and operation-command.
