/**
 * Canonical JSON (CONTRACT.md, SD4): no whitespace, an object's properties ordered by the Unicode code
 * points of their names, and strings and numbers written as ECMAScript's JSON.stringify writes them.
 */
import type { JsonValue } from "./shape-verdict.js";

/** Compares two strings by Unicode code point, not by UTF-16 code unit; a prefix sorts first. */
export function compareByCodePoint(a: string, b: string): number {
	const left = Array.from(a, (c) => c.codePointAt(0) ?? 0);
	const right = Array.from(b, (c) => c.codePointAt(0) ?? 0);
	const shared = Math.min(left.length, right.length);
	for (let i = 0; i < shared; i++) {
		const difference = (left[i] ?? 0) - (right[i] ?? 0);
		if (difference !== 0) return difference;
	}
	return left.length - right.length;
}

/** Writes a JSON value as canonical JSON text. */
export function toCanonicalJson(value: JsonValue): string {
	if (Array.isArray(value)) return `[${value.map(toCanonicalJson).join(",")}]`;
	if (value !== null && typeof value === "object") {
		const names = Object.keys(value).sort(compareByCodePoint);
		return `{${names.map((name) => `${JSON.stringify(name)}:${toCanonicalJson(value[name] as JsonValue)}`).join(",")}}`;
	}
	return JSON.stringify(value);
}

/** True when two JSON values are equal as JSON: numbers by value, objects whatever their property order (SD2). */
export function jsonValuesEqual(a: JsonValue, b: JsonValue): boolean {
	if (a === b) return true;
	if (Array.isArray(a) || Array.isArray(b)) {
		if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
		return a.every((item, i) => jsonValuesEqual(item, b[i] as JsonValue));
	}
	if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
	const names = Object.keys(a);
	if (names.length !== Object.keys(b).length) return false;
	return names.every((name) => Object.hasOwn(b, name) && jsonValuesEqual(a[name] as JsonValue, b[name] as JsonValue));
}
