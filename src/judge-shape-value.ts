/**
 * The public judgement: a value against a whole shape document (CONTRACT.md, SD1 to SD5).
 */
import { findShapeProblems } from "./shape-document-check.js";
import type { JsonInput, JsonObject, JsonValue, ShapeProblem, ShapeVerdict } from "./shape-verdict.js";
import { findValueMisfits } from "./value-judgement.js";

/** A shape document checked once: refused with its problems, or ready to judge any number of values. */
export type PreparedShape =
	| { readonly accepted: false; readonly problems: readonly ShapeProblem[] }
	| { readonly accepted: true; judge(value: JsonInput): ShapeVerdict };

/**
 * Checks a shape document once (SD3), so a part that judges many values against one shape - a store
 * against a kind, a host against an operation's input - checks it at opening and refuses it there.
 */
export function prepareShapeDocument(shape: JsonInput): PreparedShape {
	// The judgement never changes what it is given, so a read-only shape or value is judged as it stands.
	const problems = findShapeProblems(shape as JsonValue);
	if (problems.length > 0) return { accepted: false, problems };
	const patterns = new Map<string, RegExp>();
	return {
		accepted: true,
		judge(value: JsonInput): ShapeVerdict {
			const misfits = findValueMisfits(shape as JsonObject, value as JsonValue, patterns);
			return misfits.length === 0 ? { verdict: "fits" } : { verdict: "misfit", misfits };
		},
	};
}

/** Judges whether a value fits a shape document: it fits, it misfits with every misfit explained, or the shape is refused. */
export function judgeShapeValue(shape: JsonInput, value: JsonInput): ShapeVerdict {
	const prepared = prepareShapeDocument(shape);
	return prepared.accepted ? prepared.judge(value) : { verdict: "shape-refused", problems: prepared.problems };
}
