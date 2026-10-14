/**
 * Public surface of shape-check: exactly the capabilities CONTRACT.md lists, and nothing else.
 * declared-shape-validation - judge a value against a shape declared as data, explaining every misfit.
 * plain-json-value - read a value as plain JSON running none of its code, snapshot a caller's input, measure
 *   a value, and write it in canonical form (SD8).
 */
export { judgeShapeValue, prepareShapeDocument, type PreparedShape } from "./judge-shape-value.js";
export { SHAPE_DIALECT_ID } from "./shape-dialect.js";
export type { JsonInput, JsonObject, JsonValue, ShapeMisfit, ShapeProblem, ShapeProblemCode, ShapeVerdict } from "./shape-verdict.js";
export { toCanonicalJson } from "./canonical-json.js";
export { firstUnsafeInteger, nestingDepth, observePromises, readPlainJson, SAFE_INTEGER_LIMIT, snapshotJson, utf8ByteLength } from "./plain-json-value.js";
