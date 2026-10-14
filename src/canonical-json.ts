/**
 * Canonical JSON (CONTRACT.md, SD4): no whitespace, an object's properties ordered by the Unicode code
 * points of their names, and strings and numbers written as ECMAScript's JSON.stringify writes them.
 */
import type { JsonInput, JsonValue } from "./shape-verdict.js";

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

/**
 * Writes a JSON value as canonical JSON text (SD4, SD8), keeping its own stack rather than recursing, so a
 * value of any depth is written; `-0` is written `0`, as JSON.stringify writes it.
 */
export function toCanonicalJson(value: JsonInput): string {
	const out: string[] = [];
	// Each entry is text to write as it stands, or a value to write; entries are popped in writing order.
	const stack: ({ readonly text: string } | { readonly value: JsonInput })[] = [{ value }];
	while (stack.length > 0) {
		const entry = stack.pop() as { readonly text: string } | { readonly value: JsonInput };
		if ("text" in entry) {
			out.push(entry.text);
			continue;
		}
		const item = entry.value;
		if (Array.isArray(item)) {
			const list = item as readonly JsonInput[];
			out.push("[");
			stack.push({ text: "]" });
			for (let i = list.length - 1; i >= 0; i--) {
				stack.push({ value: list[i] as JsonInput });
				if (i > 0) stack.push({ text: "," });
			}
		} else if (item !== null && typeof item === "object") {
			const record = item as { readonly [name: string]: JsonInput };
			const names = Object.keys(record).sort(compareByCodePoint);
			out.push("{");
			stack.push({ text: "}" });
			for (let i = names.length - 1; i >= 0; i--) {
				const name = names[i] as string;
				stack.push({ value: record[name] as JsonInput });
				stack.push({ text: `${i > 0 ? "," : ""}${JSON.stringify(name)}:` });
			}
		} else out.push(JSON.stringify(item));
	}
	return out.join("");
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
