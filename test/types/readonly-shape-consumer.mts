// A TypeScript consumer of shape-check's public entry point, compiled by public-types.test.js: a shape held
// as a frozen, read-only constant is passed to both judging functions without a cast.
import { judgeShapeValue, prepareShapeDocument, type ShapeVerdict } from "@apnex/shape-check";

const shape = Object.freeze({
	$schema: "urn:apnex:shape-check:dialect:1",
	type: "object",
	properties: { name: { type: "string", enum: ["a", "b"] } },
	required: ["name"],
	additionalProperties: false,
} as const);

const verdict: ShapeVerdict = judgeShapeValue(shape, Object.freeze({ name: "a" } as const));
const prepared = prepareShapeDocument(shape);
if (prepared.accepted) {
	const again: ShapeVerdict = prepared.judge(["x"] as const);
	void again;
}
void verdict;
