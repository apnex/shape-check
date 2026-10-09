---
id: unminted
category: component
title: shapecheck - judge a value against a shape declared as data
status: draft
hydrate-when: Two or more parts of a system check data against shapes declared as data, and each is about to write its own checker
sovereignty: internal
supersedes: []
related: [C0, A3]
---

# shapecheck

The contract of record for shapecheck, admitted to zorg's component set by the director's ruling `D2` in zorg's `docs/DECISIONS.md`.\
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

shapecheck holds nothing between judgements, coordinates no actors and contains no model, so it brings no trait.

Owed before it is built: the language shapes are written in, how a shape states its version, and the exact form of a misfit explanation (zorg's `docs/ARCHITECTURE-TARGET.md`, owed and open).

---

## Reference

Not yet built.\
This repository, `apnex/shapecheck`, private until its first working code: `VISION.md` and, once built, the implementation.

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

| You need | Reach elsewhere, because shapecheck is |
|---|---|
| shapes stored, versioned or shared between systems | not a store or a registry of shapes |
| a value repaired, filled in or coerced | not a repairer |
| a decision about who may submit a value | not an authority |
| a refusal for any reason other than fit | not the owner of every refusal |

---

## Adjustment policy

Internal and sovereign, so a fit gap has somewhere to go.

1. Record a measured gap where both sides can see it.
2. Resolve it by adjusting shapecheck, so every consumer gets the change, or by fracturing it when the gap reveals a second duty.
3. Never fork.

---

## Edges

**Composes:** nothing registered.

**Consumes, through a declared contract:** nothing.

**Composed-by:** nothing yet.\
Its capability is carried by opcall and entitystore.
