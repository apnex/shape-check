// bounded-shape-validation - the contract test for dialect 2 (CONTRACT.md, SD9).
//
// The corpus's dialect 2 cases, written from SD9 by an agent other than the one that implemented it, run with
// every other case in declared-shape-validation.test.js, through the public data path; this file holds that
// they cover what SD9 asks of the corpus, that a dialect 1 shape marked dialect 2 is judged the same, record
// for record, and the judgements beyond the corpus's limits that SD6 places in shape-check's own tests.
import assert from "node:assert/strict";
import { test } from "node:test";
import corpus from "@apnex/shape-check/corpus" with { type: "json" };
import { judgeShapeValue, prepareShapeDocument, SHAPE_DIALECT_ID } from "@apnex/shape-check";

const DIALECT_2 = "urn:apnex:shape-check:dialect:2";
const NEW_KEYWORDS = ["minimum", "maximum", "uniqueItems"];

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
const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
/** True when some object anywhere in the value holds a property named `name`. */
const holdsName = (v, name) => Array.isArray(v) ? v.some((item) => holdsName(item, name))
	: isObject(v) ? Object.hasOwn(v, name) || Object.values(v).some((item) => holdsName(item, name)) : false;
const dialect2 = (body) => ({ $schema: DIALECT_2, ...body });

test("SD9: dialect 2 is a second identifier beside dialect 1's, which stays the one SHAPE_DIALECT_ID names", () => {
	assert.equal(SHAPE_DIALECT_ID, "urn:apnex:shape-check:dialect:1");
	assert.deepEqual(judgeShapeValue({ $schema: DIALECT_2 }, 0), { verdict: "fits" });
	assert.deepEqual(judgeShapeValue({ $schema: "urn:apnex:shape-check:dialect:3" }, 0), { verdict: "shape-refused", problems: [{ pointer: "", keyword: "$schema", problem: "unknown-dialect" }] });
});

test("SD9, SD6: the corpus holds, for each new keyword, a value that fits and one that does not, a dialect 1 document refused for using it, and a dialect 2 document refused for an invalid value of it", () => {
	for (const keyword of NEW_KEYWORDS) {
		const uses = corpus.cases.filter((c) => holdsName(c.shape, keyword));
		const inDialect = (c, id) => isObject(c.shape) && c.shape.$schema === id;
		assert.ok(uses.some((c) => inDialect(c, DIALECT_2) && c.verdict.verdict === "fits"), `${keyword}: a value that fits`);
		assert.ok(uses.some((c) => inDialect(c, DIALECT_2) && c.verdict.verdict === "misfit" && c.verdict.misfits.some((m) => m.keyword === keyword)), `${keyword}: a value that does not`);
		assert.ok(uses.some((c) => inDialect(c, SHAPE_DIALECT_ID) && c.verdict.verdict === "shape-refused" && c.verdict.problems.some((p) => p.keyword === keyword && p.problem === "unknown-keyword")), `${keyword}: a dialect 1 document refused for using it`);
		assert.ok(uses.some((c) => inDialect(c, DIALECT_2) && c.verdict.verdict === "shape-refused" && c.verdict.problems.some((p) => p.keyword === keyword && p.problem === "invalid-value")), `${keyword}: a dialect 2 document refused for an invalid value of it`);
	}
});

test("SD9: a value judged against a dialect 1 shape and against the same shape marked dialect 2 gets the same verdict and reason, over every dialect 1 case of the corpus", () => {
	let compared = 0;
	for (const c of corpus.cases) {
		if (!isObject(c.shape) || c.shape.$schema !== SHAPE_DIALECT_ID) continue;
		// a dialect 1 document holding a keyword of dialect 2 is refused in dialect 1 alone, as SD9 says
		if (NEW_KEYWORDS.some((keyword) => holdsName(c.shape, keyword))) continue;
		const asDialect1 = canonical(judgeShapeValue(c.shape, c.value));
		assert.equal(canonical(judgeShapeValue({ ...c.shape, $schema: DIALECT_2 }, c.value)), asDialect1, c.name);
		assert.equal(asDialect1, canonical(c.verdict), c.name);
		compared++;
	}
	assert.ok(compared > 200, `${compared} dialect 1 cases compared`);
});

test("beyond the corpus: bounds outside the safe integers, written in canonical JSON", () => {
	assert.deepEqual(judgeShapeValue(dialect2({ minimum: 1e300 }), 1e308), { verdict: "fits" });
	assert.deepEqual(judgeShapeValue(dialect2({ minimum: 1e300 }), -1e308), {
		verdict: "misfit",
		misfits: [{ pointer: "", keyword: "minimum", expected: 1e300, fit: "a number at least 1e+300" }],
	});
	assert.deepEqual(judgeShapeValue(dialect2({ maximum: 9007199254740993 }), 9007199254740994), {
		verdict: "misfit",
		misfits: [{ pointer: "", keyword: "maximum", expected: 9007199254740992, fit: "a number at most 9007199254740992" }],
	});
});

test("beyond the corpus: -0, which the corpus's public bundle writes as 0, judged as 0 and written 0 in a fit", () => {
	assert.deepEqual(judgeShapeValue(dialect2({ minimum: 0, maximum: 0 }), -0), { verdict: "fits" });
	assert.deepEqual(judgeShapeValue(dialect2({ minimum: -0, maximum: -0 }), 0), { verdict: "fits" });
	assert.deepEqual(judgeShapeValue(dialect2({ minimum: -0 }), -1).misfits.map((m) => m.fit), ["a number at least 0"]);
	assert.deepEqual(judgeShapeValue(dialect2({ maximum: -0 }), 1).misfits.map((m) => m.fit), ["a number at most 0"]);
	assert.deepEqual(judgeShapeValue(dialect2({ uniqueItems: true }), [0, -0]).misfits.map((m) => m.keyword), ["uniqueItems"]);
});

test("beyond the corpus: a bound that is no JSON number, as a JavaScript caller can hand in, is refused invalid-value", () => {
	for (const bound of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
		for (const keyword of ["minimum", "maximum"]) {
			assert.deepEqual(judgeShapeValue(dialect2({ [keyword]: bound }), 0), { verdict: "shape-refused", problems: [{ pointer: "", keyword, problem: "invalid-value" }] }, `${keyword} ${bound}`);
		}
	}
});

test("beyond the corpus: uniqueItems over 100000 items is judged in one pass, a repeat at the end found", () => {
	const items = Array.from({ length: 100000 }, (_, i) => ({ i, tag: `t${i % 7}` }));
	const started = Date.now();
	assert.deepEqual(judgeShapeValue(dialect2({ uniqueItems: true }), items), { verdict: "fits" });
	assert.deepEqual(judgeShapeValue(dialect2({ uniqueItems: true }), [...items, { tag: "t3", i: 3 }]), {
		verdict: "misfit",
		misfits: [{ pointer: "", keyword: "uniqueItems", expected: true, fit: "an array whose items are all different" }],
	});
	assert.ok(Date.now() - started < 10000, "judged without comparing every pair");
});

test("a prepared dialect 2 shape is checked once and judges many values the same way", () => {
	const prepared = prepareShapeDocument(dialect2({ type: "array", items: { type: "number", minimum: 0, maximum: 10 }, uniqueItems: true }));
	assert.equal(prepared.accepted, true);
	for (let i = 0; i < 3; i++) {
		assert.deepEqual(prepared.judge([0, 10, 5.5]), { verdict: "fits" });
		assert.deepEqual(prepared.judge([11, 11]), {
			verdict: "misfit",
			misfits: [
				{ pointer: "", keyword: "uniqueItems", expected: true, fit: "an array whose items are all different" },
				{ pointer: "/0", keyword: "maximum", expected: 10, fit: "a number at most 10" },
				{ pointer: "/1", keyword: "maximum", expected: 10, fit: "a number at most 10" },
			],
		});
	}
	assert.deepEqual(prepareShapeDocument({ $schema: SHAPE_DIALECT_ID, minimum: 0 }), { accepted: false, problems: [{ pointer: "", keyword: "minimum", problem: "unknown-keyword" }] });
});
