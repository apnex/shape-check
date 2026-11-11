# shape-check

Judge whether a value fits a shape declared as data.

**Status: built, and certified at zorg's Delta 1, stage 1 (`2bae723`) and amendment 7 (`c3080b1`), and Delta 2, stage 1 (`32b2d2d`); dialect 2 (`SD9`) built for `0.2.0` (`docs/DECISIONS.md` `D5`).**\
Its contract test runs every case of a corpus written from the contract alone by another agent.\
The corpus's public bundle, `@apnex/shape-check/corpus`, names dialect 1 in its top-level `dialect` field, while each case's shape carries its own marker, dialect 1's or dialect 2's (`docs/DECISIONS.md` `D5`).

- `VISION.md` - why it exists, and what it will never be.
- `CONTRACT.md` - what a consumer can depend on, one capability per row.
- `docs/DECISIONS.md` - the rulings about this component.

It belongs to a component set first composed by zorg (`apnex/zorg`), and is released only by its own CI, as a tarball attached to a GitHub release with its SHA-512 beside it, which a consumer names in its `package.json`: `https://github.com/apnex/shape-check/releases/download/v0.1.0/apnex-shape-check-0.1.0.tgz` for `0.1.0`.
