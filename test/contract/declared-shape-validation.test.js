// declared-shape-validation - the contract test for shape-check's one capability (CONTRACT.md, SD1 to SD7).
//
// Runs every case of the corpus, read through the public data path @apnex/shape-check/corpus as a
// consumer would, checks each case against SD6's limits, and compares each verdict with the expected one
// in canonical JSON, byte for byte, as SD7 asks of every component carrying the capability. Judgements
// beyond the corpus's limits, which SD6 places in shape-check's own tests, follow.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import corpus from "@apnex/shape-check/corpus" with { type: "json" };
import { judgeShapeValue, prepareShapeDocument, SHAPE_DIALECT_ID } from "@apnex/shape-check";

const here = path.dirname(fileURLToPath(import.meta.url));

// The canonical JSON SD4 defines, written here so the test compares records without trusting the code under test.
const byCodePoint = (a, b) => {
	const x = Array.from(a, (c) => c.codePointAt(0));
	const y = Array.from(b, (c) => c.codePointAt(0));
	for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] !== y[i]) return x[i] - y[i];
	return x.length - y.length;
};
const canonical = (v) => Array.isArray(v) ? `[${v.map(canonical).join(",")}]`
	: v !== null && typeof v === "object" ? `{${Object.keys(v).sort(byCodePoint).map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`
	: JSON.stringify(v);
const depth = (v) => v === null || typeof v !== "object" ? 0 : 1 + Math.max(0, ...Object.values(v).map(depth));
const safeIntegers = (v) => typeof v === "number" ? !Number.isInteger(v) || Number.isSafeInteger(v)
	: v !== null && typeof v === "object" ? Object.values(v).every(safeIntegers) : true;

test("the public corpus holds every case file, and declares dialect 1", () => {
	const files = fs.readdirSync(path.join(here, "..", "..", "corpus")).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)).sort();
	assert.equal(corpus.dialect, SHAPE_DIALECT_ID);
	assert.deepEqual(corpus.cases.map((c) => c.name).sort(), files);
	assert.ok(corpus.cases.length > 0);
});

for (const c of corpus.cases) {
	test(`corpus: ${c.name}`, () => {
		const { name, ...document } = c;
		assert.deepEqual(Object.keys(document).sort(), ["description", "shape", "value", "verdict"]);
		assert.ok(safeIntegers(document), "SD6: every integer is within 9007199254740991 of zero");
		assert.ok(depth(c.shape) <= 20 && depth(c.value) <= 20, "SD6: shape and value nest at most 20 levels");
		assert.ok(Buffer.byteLength(canonical(c.shape)) <= 65536, "SD6: the shape is at most 65536 bytes");
		assert.ok(Buffer.byteLength(canonical(document)) <= 131072, "SD6: the case is at most 131072 bytes");
		assert.equal(canonical(judgeShapeValue(c.shape, c.value)), canonical(c.verdict));
	});
}

const shape = (body) => ({ $schema: SHAPE_DIALECT_ID, ...body });

test("beyond the corpus: a const holding an integer outside the safe range is judged", () => {
	assert.deepEqual(judgeShapeValue(shape({ const: 9007199254740992 }), 0), {
		verdict: "misfit",
		misfits: [{ pointer: "", keyword: "const", expected: 9007199254740992, fit: "exactly 9007199254740992" }],
	});
});

test("beyond the corpus: a shape larger than 65536 bytes is judged", () => {
	const large = shape({ enum: [0, "x".repeat(70000)] });
	assert.deepEqual(judgeShapeValue(large, 0), { verdict: "fits" });
	assert.equal(judgeShapeValue(large, 1).verdict, "misfit");
});

test("beyond the corpus: a value nesting deeper than 20 levels is judged", () => {
	let value = 0;
	let items = { type: "integer" };
	for (let i = 0; i < 30; i++) { value = [value]; items = { type: "array", items }; }
	assert.deepEqual(judgeShapeValue(shape(items), value), { verdict: "fits" });
});

test("a prepared shape is checked once and judges many values the same way", () => {
	const prepared = prepareShapeDocument(shape({ type: "string", pattern: "^a" }));
	assert.equal(prepared.accepted, true);
	for (let i = 0; i < 3; i++) {
		assert.deepEqual(prepared.judge("abc"), { verdict: "fits" });
		assert.equal(prepared.judge("xyz").verdict, "misfit");
	}
	const refused = prepareShapeDocument(shape({ pattern: "(" }));
	assert.deepEqual(refused, { accepted: false, problems: [{ pointer: "", keyword: "pattern", problem: "invalid-pattern" }] });
});
