# shape-check - Vision

**Status: ratified by the director, 2026-10-09 (zorg's `docs/DECISIONS.md`, `D5`), amended 2026-10-14 (`D55`); enduring.**\
This document states why shape-check exists and what it will never be.\
It carries no current state, no roadmap, and no schedule.

Holding this document authorises nothing.\
It does not ratify a decision, admit a component to any registry, or approve a contract change.\
A change of direction is recorded as a decision first and absorbed here afterwards.

---

## North star

> Let every part of a system judge a value against a shape declared as data in exactly the same way, and say what to fix when it does not fit.

Four terms in that sentence carry weight, so this document defines them rather than leaving them to the reader.

**Every part of a system** means any component or application that must accept or refuse a value by its shape - an operation checking its input, a store checking a record, an application checking what it was sent.

**A shape declared as data** means a description of what a value must contain, written as data both sides can read, never as code only one side can run.

**Exactly the same way** means that the same value judged against the same shape gets the same verdict and the same reason, whichever part asks.

**Say what to fix** means a misfit names where in the value it lies, what the shape expected there, and what would make the value fit.

---

## Why it exists

Systems check data at every boundary, and each boundary tends to grow its own checker.\
Two checkers of the same shape drift: one accepts what the other refuses, and the reasons they give differ, so a caller cannot tell which rule it broke.

An agent that is told only "invalid" guesses at the fix and tries again.\
One that is told where the value is wrong and what was expected fixes it once.

shape-check judges shapes once, for every part that needs it, and explains every refusal.

---

## What it is

An embeddable library that takes a shape and a value and returns a verdict: the value fits, or it does not and here is why.\
Shapes are supplied by whoever asks; shape-check keeps none of its own.\
It also reads any value handed across a boundary into the plain JSON value every judgement starts from, running none of its code, measures its depth and integers, and writes any plain JSON value in the canonical form its verdicts use (zorg's `D54`, `D55`).\
It judges the values a system exchanges and keeps, never a transport's own envelope, which the transport checks for itself.

It is embedded by components and applications that own their own process and their own shapes.

---

## What it is not

**Not the owner of meaning.**\
It knows what a shape requires, never what the shape is for or why a value matters.

**Not an authority.**\
It judges whether a value fits, never whether its sender may submit it.

**Not a store or a registry of shapes.**\
It holds nothing between judgements.\
Where shapes live, and how they are versioned and shared, belongs to whoever supplies them.

**Not a repairer.**\
It never changes, fills in, or coerces a value to make it fit.\
It judges the value it was given, and the caller that submitted the value fixes it.

**Not a network service.**\
It never listens and never sends.

**Not the owner of every refusal.**\
It explains why a value does not fit its shape.\
A refusal for any other reason - a revision that moved, an operation that declined - belongs to the part that refuses.\
Even for a misfit, the part that asked decides whether to refuse and owns the refusal; shape-check gives the verdict and the reason.

---

## What success means

Four dimensions.\
They are not weighted, and they do not collapse.

**Agreement.**\
Two parts judging the same value against the same shape never disagree, in verdict or in reason.\
The measure is that the parts which carry shape-check show no case where one accepts what another refuses.

**Legibility.**\
Every misfit is explained completely: where it lies, what was expected there, and what would fit.\
The measure is that a caller, often an agent, fixes a refused value in one attempt whenever the value can be made to fit.

**Leanness.**\
It is small enough that no part would rather write its own checker.\
The measure is its size and its cost per judgement, stated and small.

**Reuse.**\
A second, unrelated system adopts it without a variant, a fork, or a change.

A programme strong on three of these and weak on one has one unmet dimension, and which one it is says more than any average of the four.

---

## Authority

Held by the director.\
Drafted by anyone; ratified only by the director.

This statement is amended, never quietly rewritten.\
A ruling that changes direction is recorded as a decision and absorbed here, so the reasoning survives the change.

Where this narrative and a verified record disagree about state, the record governs.
