# Decisions

One ruling per entry, append-only.\
A ruling is never edited; a later one supersedes it and says so.

Rulings that shape this component together with others are held in zorg's `docs/DECISIONS.md`, and cited here as "zorg's `Dn`".

---

## D1 - The component stands in its own repository

**Ruled by:** the director, 2026-10-09 (zorg's `D16`).\
**Affects:** this repository.

**Ruling.**\
This component was split out of zorg with the history of its vision and contract, and is private until its first working code.\
Its vision was ratified by zorg's `D5`, and its contract of record is `CONTRACT.md` (zorg's `D17`).

**Why.**\
Each component holds its own boundary and its own history from the start, as zorg's `D10` intends.

---

## D2 - Renamed shape-check

**Ruled by:** the director, 2026-10-09 (zorg's `D18`).\
**Affects:** this repository, its package, `VISION.md`, `CONTRACT.md` and `README.md`.

**Ruling.**\
The component formerly named shapecheck is named shape-check, in hyphenated whole words like every other name in the workspace; its repository is `apnex/shape-check`, and GitHub redirects the old name.\
Earlier entries keep the name they were written with.

---

## D3 - The first release, 0.1.0, carrying the five shared fixes

**Ruled by:** the director, 2026-11-10 (draw's `H31-5`, on zorg's agreement: draw's request, `upstream/drawv2-shared-component-fixes-request.md`, and zorg's reply, `upstream/drawv2-shared-component-fixes-reply.md`, whose answers bind).\
**Affects:** `package.json` and its lockfile, `.nvmrc`, `.github/workflows/gate.yml` and `release.yml`, `tools/consumer-test.mjs`, `CONTRACT.md`'s frontmatter and Reference, and `README.md`; nothing in `src/`, and nothing the component does.

**Ruling.**\
The five fixes every consumer of the components zorg maintains needs, made by draw's builders on zorg's agreement, none changing what the component does:
1. A release in the pinned-file form, gated by CI: `gate.yml` runs `npm test` and `npm run docs:check` on every push and pull request on Node 22 and 24, then the consumer test on Node 22 -- the package packed, installed into an empty project with `--omit=dev`, no AGP package installed, and every export imported by name; `release.yml`, on a tag `v<version>` that the repository's `release tags` ruleset protects, runs the gate, packs the package once, attaches the `.tgz` and its `.sha512` to a draft GitHub release, downloads both back and compares them, and only then publishes, immutable releases being enabled for the repository before its first tag; the first release is `0.1.0`.
2. A Node 22 floor: `engines` `>=22`, and `.nvmrc` `22`.
3. Dependencies between components as release files: none: it depends on no other component, each pinned in the lockfile by its integrity.
4. AGP declared as what it is: none: it takes nothing of AGP's.
5. The contract's frontmatter brought to mission-kit's: `id: C3`, `status: active`, and the sentences that said the id was unminted and the repository private until its first working code restated.

**Choices made at build.**
- `private: true` stays: it stops publishing to the npm registry, and `npm pack` packs the package with it.
- The style rules `npm run docs:check` holds are vendored in `tools/`, so CI fetches no mission-kit checkout.
- Its contract claims no browser runtime, so the consumer test imports the package in Node alone, loading nothing in Chrome.

**Why.**\
Draw takes components as public GitHub release files pinned by hash and runs Node 22 in production (draw's `H26-2`); a `file:` link builds only beside a checkout, and an AGP declared for install would make every consumer install it though every import of it is a type.

---

## D4 - Dialect 2 adds `minimum`, `maximum` and `uniqueItems`, and dialect 1 is unchanged

**Ruled by:** the director, 2026-11-11, drafted by drawv2 under its `H31-8` and co-signed by zorg (`zorg/docs/DECISIONS.md` `D76`).\
**Affects:** `CONTRACT.md` (a capability row, `bounded-shape-validation`, and `SD9`), `export-map.json` (the row deferred under this ruling); nothing in `src/`, and nothing the component does until it is built.

**Ruling.**\
A second dialect, `urn:apnex:shape-check:dialect:2`, keeps every keyword of dialect 1 with its meaning and adds three, named and meaning as JSON Schema 2020-12 names and means them: `minimum` and `maximum` on numbers, and `uniqueItems` on arrays.\
Dialect 1 does not change, as `SD1` promises: a dialect 1 document using one of the three is refused as it is today.\
Each new keyword's misfit is recorded in `SD4`'s form, with a fixed `fit` sentence.\
The corpus cases for dialect 2 are written from `SD9` by an agent other than the one that implements it, as `SD6` requires of every case.\
Until it is built and its cases pass, `bounded-shape-validation` is deferred under this ruling in `export-map.json`.

**Why.**\
A part bounding a number or requiring distinct items today writes its own check beside the shape, which is the second checker this component exists to remove.\
`drawv2` needs both to state its kinds' fields as shapes - coordinates and counts bounded, a list of members without repeats - and zorg agreed the dialect as a gain for every consumer.\
JSON Schema's names keep the dialect a subset of JSON Schema 2020-12, as `SD1` states of dialect 1.

**Alternatives refuted.**\
Adding the keywords to dialect 1 - `SD1` says what a released dialect means never changes.\
Exclusive bounds as well - no consumer has asked for them, and they can join a later dialect when one does.

---

## D5 - 0.2.0: dialect 2 built

**Ruled by:** the director, 2026-11-11 (draw's `H31-9`, building the contract the director ratified and zorg co-signed under zorg's `D76`; `D4` here).\
**Affects:** `src/shape-dialect.ts`, `src/shape-document-check.ts`, `src/value-judgement.ts`, `corpus/` (dialect 2's cases, and one earlier case's marker), `test/contract/bounded-shape-validation.test.js`, `CONTRACT.md` (`SD9` and Reference), `export-map.json`, `README.md`, and `package.json` and its lockfile; a minor release, `0.2.0`.

**Ruling.**\
Dialect 2, as `D4` designs it and `SD9` states it, is built: a document marked `urn:apnex:shape-check:dialect:2` may use every keyword of dialect 1 with its meaning, and `minimum`, `maximum` and `uniqueItems`.\
Preparation refuses a dialect 1 document using any of the three with `unknown-keyword`, as before, and a dialect 2 document holding a `minimum` or `maximum` that is no JSON number, or a `uniqueItems` that is no boolean, with `invalid-value`; a `$schema` naming neither dialect is `unknown-dialect`.\
Judgement reports `minimum` and `maximum` at the number, `expected` the keyword's value, and `uniqueItems` at the array, `expected` `true`, with `SD4`'s three new fixed sentences, ordered as `SD5` orders every misfit.\
`bounded-shape-validation` is current: `export-map.json` serves it by `judgeShapeValue`, `prepareShapeDocument` and the corpus, and defers nothing.\
Dialect 1 is unchanged: every case written before passes as before, and every dialect 1 shape of the corpus, marked dialect 2, is judged the same, record for record.

**The corpus, written first by another agent.**\
Dialect 2's 112 cases, `corpus/dialect-2-*.json`, were written from the contract alone by a fresh agent dispatched from draw's top level, which read no implementation, and committed on their own before any implementation code; none is changed.\
One earlier case, `refused-unknown-dialect-string`, used dialect 2's identifier as an unknown dialect, which `SD9` makes known; its marker is now `urn:apnex:shape-check:dialect:3`, still unknown, and the writer's `dialect-2-refused-marker-is-a-known-dialect` carries `SD9`'s verdict for that same shape.\
The writer's readings where the contract left a choice are the implementation's too: `-0` written `0` in a `fit`, as canonical JSON writes it; one `uniqueItems` record per array, however many items repeat; strings equal by code point; a dialect 1 document's ill-formed `minimum`, `maximum` or `uniqueItems` an `unknown-keyword`, its value never examined; a marker in a subschema `nested-dialect`, whichever dialect it names; `exclusiveMinimum`, `exclusiveMaximum` and `multipleOf` still unknown keywords in dialect 2; and the bounds in the new `fit` sentences written as canonical JSON writes numbers.

**Choices made at build.**
- The judgement takes no dialect: a shape that has passed preparation holds a keyword of dialect 2 only when it is a dialect 2 document, so one judgement serves both, which is what keeps a dialect 1 shape and the same shape marked dialect 2 judged the same.
- A bound must be a JSON number, so a finite one: a `NaN` or an infinity, which only a JavaScript caller can hand in, is `invalid-value`.
- `uniqueItems` compares the items' canonical JSON, which is equality as `SD2` states it -- numbers by value, `-0` as `0`, objects whatever their property order -- in one pass over the array, so 100000 items are judged in a fraction of a second.
- `SHAPE_DIALECT_ID` still names dialect 1, and no export is added, as `SD9` and Reference name none; the corpus's public bundle still declares dialect 1 in its `dialect` field, each case's shape carrying its own marker, so the data path every carrying component reads keeps its form.
- `bounded-shape-validation` has its own contract test file, as every row does here, so `test/contract/contract-coverage.test.js` reports no row to-do.
- The corpus's public bundle is written by `JSON.stringify`, which writes `-0` as `0`, so the corpus's `-0` cases, dialect 1's and dialect 2's, reach every judgement that reads the bundle as `0`, as any JSON carrying them would; so `test/contract/bounded-shape-validation.test.js` also judges each of the eight case files holding `-0`, dialect 1's two among them, read from its own file with `-0` intact, and holds `-0` against a bound, in a bound's `fit` and in `uniqueItems` beyond the corpus, as `SD6` places a judgement the corpus cannot carry in shape-check's own tests.

**Mutants.**\
The repository keeps no mutation tool, so each of 13 mutants was made as one exact replacement in a copy of the working tree, built and run against every test: bounds compared inclusively each way, `uniqueItems` never reported, compared by `JSON.stringify` so property order counted, reported at an item rather than the array, or demanded by `uniqueItems: false`; dialect 1 taking dialect 2's keywords, and dialect 2 unknown; a bound or a `uniqueItems` of any value accepted, and an infinite bound accepted; the bounds applied to a value of another type; and a `-0` bound written `-0` in its `fit`.\
Every one was killed, the last only once the test of `-0` above was added.

**Why.**\
`D4`'s reasons stand: a part bounding a number or requiring distinct items writes its own check beside the shape today, the second checker this component exists to remove, and draw needs both to state its kinds' fields as shapes.\
A new capability under `0.x` is a minor release; the components that depend on `0.1.0` keep it until one needs dialect 2 through them.

