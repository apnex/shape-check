/**
 * Public surface of shape-check: exactly the capabilities CONTRACT.md lists, and nothing else.
 * declared-shape-validation - judge a value against a shape declared as data, explaining every misfit.
 */
export { judgeShapeValue, prepareShapeDocument, type PreparedShape } from "./judge-shape-value.js";
export { SHAPE_DIALECT_ID } from "./shape-dialect.js";
export type { JsonObject, JsonValue, ShapeMisfit, ShapeProblem, ShapeProblemCode, ShapeVerdict } from "./shape-verdict.js";
