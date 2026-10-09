/**
 * Whether a shape document is a shape at all, and every problem when it is not (CONTRACT.md, SD1 and SD3).
 */
import { compareByCodePoint, jsonValuesEqual } from "./canonical-json.js";
import { compareJsonPaths, formatJsonPointer } from "./json-pointer-order.js";
import { compileShapePattern, SHAPE_DIALECT_ID, SHAPE_KEYWORDS, SHAPE_TYPE_NAMES } from "./shape-dialect.js";
import { isJsonObject, type JsonObject, type JsonPathToken, type JsonValue, type ShapeProblem, type ShapeProblemCode } from "./shape-verdict.js";

interface LocatedProblem {
	readonly path: readonly JsonPathToken[];
	readonly keyword: string;
	readonly problem: ShapeProblemCode;
}

function isNonNegativeInteger(value: JsonValue | undefined): boolean {
	return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER;
}

function isValidTypeValue(value: JsonValue | undefined): boolean {
	if (typeof value === "string") return SHAPE_TYPE_NAMES.has(value);
	if (!Array.isArray(value) || value.length === 0) return false;
	return value.every((name) => typeof name === "string" && SHAPE_TYPE_NAMES.has(name)) && new Set(value).size === value.length;
}

function isValidEnumValue(value: JsonValue | undefined): boolean {
	if (!Array.isArray(value) || value.length === 0) return false;
	return value.every((member, i) => value.slice(0, i).every((earlier) => !jsonValuesEqual(earlier, member)));
}

/** Examines one subschema and everything under it, collecting its problems. */
function examineSubschema(node: JsonObject, path: readonly JsonPathToken[], isRoot: boolean, found: LocatedProblem[]): void {
	const report = (keyword: string, problem: ShapeProblemCode, at: readonly JsonPathToken[] = path) => found.push({ path: at, keyword, problem });
	// A value in a subschema position that is not an object is "not-an-object" there, never "invalid-value" at its parent.
	const examinePosition = (value: JsonValue | undefined, at: readonly JsonPathToken[]) => {
		if (isJsonObject(value)) examineSubschema(value, at, false, found);
		else found.push({ path: at, keyword: "", problem: "not-an-object" });
	};
	for (const keyword of Object.keys(node)) {
		const value = node[keyword];
		if (keyword === "$schema") {
			if (!isRoot) report("$schema", "nested-dialect");
			continue;
		}
		if (!SHAPE_KEYWORDS.has(keyword)) { report(keyword, "unknown-keyword"); continue; }
		switch (keyword) {
			case "type":
				if (!isValidTypeValue(value)) report(keyword, "invalid-value");
				break;
			case "properties":
				if (!isJsonObject(value)) { report(keyword, "invalid-value"); break; }
				for (const name of Object.keys(value)) examinePosition(value[name], [...path, "properties", name]);
				break;
			case "required":
				if (!Array.isArray(value) || !value.every((name) => typeof name === "string") || new Set(value).size !== value.length) report(keyword, "invalid-value");
				break;
			case "additionalProperties":
				if (value !== false) examinePosition(value, [...path, "additionalProperties"]);
				break;
			case "items":
				examinePosition(value, [...path, "items"]);
				break;
			case "enum":
				if (!isValidEnumValue(value)) report(keyword, "invalid-value");
				break;
			case "const":
				break;
			case "pattern":
				if (typeof value !== "string") { report(keyword, "invalid-value"); break; }
				try { compileShapePattern(value); } catch { report(keyword, "invalid-pattern"); }
				break;
			case "format":
				if (value !== "uri") report(keyword, "invalid-value");
				break;
			default:
				// minLength, maxLength, minItems, maxItems
				if (!isNonNegativeInteger(value)) report(keyword, "invalid-value");
		}
	}
}

/**
 * Finds every problem that makes a shape document unusable as a shape, in SD3's order; an empty list
 * means the document is a shape. A missing or unknown dialect, or a document that is not an object, is
 * the whole list.
 */
export function findShapeProblems(shape: JsonValue): ShapeProblem[] {
	if (!isJsonObject(shape)) return [{ pointer: "", keyword: "", problem: "not-an-object" }];
	if (!Object.hasOwn(shape, "$schema")) return [{ pointer: "", keyword: "$schema", problem: "missing-dialect" }];
	if (shape.$schema !== SHAPE_DIALECT_ID) return [{ pointer: "", keyword: "$schema", problem: "unknown-dialect" }];
	const found: LocatedProblem[] = [];
	examineSubschema(shape, [], true, found);
	found.sort((a, b) => compareJsonPaths(a.path, b.path) || compareByCodePoint(a.keyword, b.keyword) || compareByCodePoint(a.problem, b.problem));
	return found.map((p) => ({ pointer: formatJsonPointer(p.path), keyword: p.keyword, problem: p.problem }));
}
