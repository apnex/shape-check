/**
 * Judging a value against a shape that has passed SD3, collecting every misfit (CONTRACT.md, SD2, SD4, SD5).
 */
import { compareByCodePoint, jsonValuesEqual, toCanonicalJson } from "./canonical-json.js";
import { compareJsonPaths, formatJsonPointer } from "./json-pointer-order.js";
import { compileShapePattern } from "./shape-dialect.js";
import { isJsonObject, type JsonObject, type JsonPathToken, type JsonValue, type ShapeMisfit } from "./shape-verdict.js";
import { isAbsoluteUri } from "./uri-format.js";

interface LocatedMisfit {
	readonly path: readonly JsonPathToken[];
	readonly keyword: string;
	readonly expected: JsonValue;
	readonly fit: string;
}

/** The dialect's type name a value belongs to; an integer also belongs to "number". */
function valueIsOfType(value: JsonValue, typeName: string): boolean {
	switch (typeName) {
		case "null": return value === null;
		case "boolean": return typeof value === "boolean";
		case "string": return typeof value === "string";
		case "array": return Array.isArray(value);
		case "object": return isJsonObject(value);
		case "number": return typeof value === "number";
		case "integer": return typeof value === "number" && Number.isInteger(value);
		default: return false;
	}
}

/** Counts a string's length in Unicode code points, as dialect 1 does. */
function codePointLength(text: string): number {
	return Array.from(text).length;
}

/** Judges a value against one subschema, adding each misfit it finds. */
function judgeAgainstSubschema(node: JsonObject, value: JsonValue, path: readonly JsonPathToken[], patterns: Map<string, RegExp>, found: LocatedMisfit[]): void {
	const report = (keyword: string, expected: JsonValue, fit: string, at: readonly JsonPathToken[] = path) => found.push({ path: at, keyword, expected, fit });
	const type = node.type;
	if (type !== undefined) {
		const names = (Array.isArray(type) ? type : [type]) as string[];
		if (!names.some((name) => valueIsOfType(value, name))) report("type", type, `a value of type ${names.join(" or ")}`);
	}
	if (node.enum !== undefined) {
		const members = node.enum as JsonValue[];
		if (!members.some((member) => jsonValuesEqual(member, value))) report("enum", node.enum, `one of ${members.map(toCanonicalJson).join(", ")}`);
	}
	if (Object.hasOwn(node, "const")) {
		const expected = node.const as JsonValue;
		if (!jsonValuesEqual(expected, value)) report("const", expected, `exactly ${toCanonicalJson(expected)}`);
	}
	if (typeof value === "string") {
		const length = codePointLength(value);
		if (typeof node.pattern === "string") {
			let pattern = patterns.get(node.pattern);
			if (pattern === undefined) { pattern = compileShapePattern(node.pattern); patterns.set(node.pattern, pattern); }
			if (!pattern.test(value)) report("pattern", node.pattern, `a string matching ${toCanonicalJson(node.pattern)}`);
		}
		if (typeof node.minLength === "number" && length < node.minLength) report("minLength", node.minLength, `a string of length at least ${node.minLength}`);
		if (typeof node.maxLength === "number" && length > node.maxLength) report("maxLength", node.maxLength, `a string of length at most ${node.maxLength}`);
		if (node.format === "uri" && !isAbsoluteUri(value)) report("format", "uri", "an absolute URI, such as https://example.com/page");
	}
	if (Array.isArray(value)) {
		if (typeof node.minItems === "number" && value.length < node.minItems) report("minItems", node.minItems, `an array of length at least ${node.minItems}`);
		if (typeof node.maxItems === "number" && value.length > node.maxItems) report("maxItems", node.maxItems, `an array of length at most ${node.maxItems}`);
		if (isJsonObject(node.items)) value.forEach((item, i) => judgeAgainstSubschema(node.items as JsonObject, item, [...path, i], patterns, found));
	}
	if (isJsonObject(value)) {
		const properties = isJsonObject(node.properties) ? node.properties : {};
		for (const name of Object.keys(properties)) {
			if (Object.hasOwn(value, name)) judgeAgainstSubschema(properties[name] as JsonObject, value[name] as JsonValue, [...path, name], patterns, found);
		}
		if (Array.isArray(node.required)) {
			for (const name of node.required as string[]) {
				if (!Object.hasOwn(value, name)) report("required", name, `a property named ${toCanonicalJson(name)}`, [...path, name]);
			}
		}
		const additional = node.additionalProperties;
		if (additional !== undefined) {
			for (const name of Object.keys(value)) {
				if (Object.hasOwn(properties, name)) continue;
				if (additional === false) report("additionalProperties", false, `no property named ${toCanonicalJson(name)}`, [...path, name]);
				else judgeAgainstSubschema(additional as JsonObject, value[name] as JsonValue, [...path, name], patterns, found);
			}
		}
	}
}

/** Judges a value against a shape that has passed SD3, returning every misfit in SD5's order. */
export function findValueMisfits(shape: JsonObject, value: JsonValue, patterns: Map<string, RegExp> = new Map()): ShapeMisfit[] {
	const found: LocatedMisfit[] = [];
	judgeAgainstSubschema(shape, value, [], patterns, found);
	found.sort((a, b) => compareJsonPaths(a.path, b.path) || compareByCodePoint(a.keyword, b.keyword));
	return found.map((m) => ({ pointer: formatJsonPointer(m.path), keyword: m.keyword, expected: m.expected, fit: m.fit }));
}
