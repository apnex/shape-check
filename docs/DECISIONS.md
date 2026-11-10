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

**Ruled by:** not yet ruled; drafted by drawv2 under its `H31-8`, agreed in substance by zorg (zorg's planning reply to drawv2, which agrees all twelve of draw's proposals, the twelfth being this dialect), for the director's ruling and zorg's co-signature.\
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
