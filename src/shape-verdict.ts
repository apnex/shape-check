/**
 * The values shape-check judges, and the verdicts it gives (CONTRACT.md, SD4).
 */

/** Any JSON value, as parsed from JSON text. */
export type JsonValue = null | boolean | number | string | JsonValue[] | JsonObject;

/** A JSON object, as parsed from JSON text. */
export type JsonObject = { [name: string]: JsonValue };

/** One step into a JSON value: a property name, or an array index as a number. */
export type JsonPathToken = string | number;

/** A misfit record: where a value breaks its shape, which keyword, what was expected, and what would fit (SD4). */
export interface ShapeMisfit {
	readonly pointer: string;
	readonly keyword: string;
	readonly expected: JsonValue;
	readonly fit: string;
}

/** Why a shape document is refused as a shape (SD3). */
export type ShapeProblemCode =
	| "not-an-object"
	| "missing-dialect"
	| "unknown-dialect"
	| "nested-dialect"
	| "unknown-keyword"
	| "invalid-value"
	| "invalid-pattern";

/** One problem with a shape document: where in the shape, which keyword, and why (SD3). */
export interface ShapeProblem {
	readonly pointer: string;
	readonly keyword: string;
	readonly problem: ShapeProblemCode;
}

/** The verdict of judging a value against a shape document: it fits, it misfits, or the shape is refused (SD4). */
export type ShapeVerdict =
	| { readonly verdict: "fits" }
	| { readonly verdict: "misfit"; readonly misfits: readonly ShapeMisfit[] }
	| { readonly verdict: "shape-refused"; readonly problems: readonly ShapeProblem[] };

/** True for a JSON object, false for null, arrays and scalars. */
export function isJsonObject(value: JsonValue | undefined): value is JsonObject {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}
