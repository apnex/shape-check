/**
 * Dialects 1 and 2 of shape-check's shape language (CONTRACT.md, SD1, SD2 and SD9).
 */

/** The identifier a shape document's root carries in "$schema" to declare dialect 1. */
export const SHAPE_DIALECT_ID = "urn:apnex:shape-check:dialect:1";

/** The identifier a shape document's root carries in "$schema" to declare dialect 2 (SD9). */
export const SHAPE_DIALECT_2_ID = "urn:apnex:shape-check:dialect:2";

/** The type names a shape's "type" keyword may hold. */
export const SHAPE_TYPE_NAMES: ReadonlySet<string> = new Set(["object", "array", "string", "number", "integer", "boolean", "null"]);

/** The keywords of dialect 1; "$schema" is the dialect marker, not one of them. */
export const SHAPE_KEYWORDS: ReadonlySet<string> = new Set([
	"type", "properties", "required", "additionalProperties", "items", "enum", "const",
	"pattern", "minLength", "maxLength", "minItems", "maxItems", "format",
]);

/** The keywords of dialect 2: every keyword of dialect 1, with its meaning, and minimum, maximum and uniqueItems (SD9). */
export const SHAPE_KEYWORDS_2: ReadonlySet<string> = new Set([...SHAPE_KEYWORDS, "minimum", "maximum", "uniqueItems"]);

/** The keywords a document may use, by the dialect its root's "$schema" names; undefined when it names neither dialect. */
export function shapeKeywordsOf(dialect: unknown): ReadonlySet<string> | undefined {
	if (dialect === SHAPE_DIALECT_ID) return SHAPE_KEYWORDS;
	if (dialect === SHAPE_DIALECT_2_ID) return SHAPE_KEYWORDS_2;
	return undefined;
}

/** Compiles a shape's "pattern" as dialect 1 does: an ECMAScript regular expression with the "u" flag. */
export function compileShapePattern(pattern: string): RegExp {
	return new RegExp(pattern, "u");
}
