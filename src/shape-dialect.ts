/**
 * Dialect 1 of shape-check's shape language (CONTRACT.md, SD1 and SD2).
 */

/** The identifier a shape document's root carries in "$schema" to declare dialect 1. */
export const SHAPE_DIALECT_ID = "urn:apnex:shape-check:dialect:1";

/** The type names a shape's "type" keyword may hold. */
export const SHAPE_TYPE_NAMES: ReadonlySet<string> = new Set(["object", "array", "string", "number", "integer", "boolean", "null"]);

/** The keywords of dialect 1; "$schema" is the dialect marker, not one of them. */
export const SHAPE_KEYWORDS: ReadonlySet<string> = new Set([
	"type", "properties", "required", "additionalProperties", "items", "enum", "const",
	"pattern", "minLength", "maxLength", "minItems", "maxItems", "format",
]);

/** Compiles a shape's "pattern" as dialect 1 does: an ECMAScript regular expression with the "u" flag. */
export function compileShapePattern(pattern: string): RegExp {
	return new RegExp(pattern, "u");
}
