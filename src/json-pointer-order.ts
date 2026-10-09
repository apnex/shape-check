/**
 * JSON pointers (RFC 6901) and the order misfits and shape problems are reported in (CONTRACT.md, SD5).
 */
import { compareByCodePoint } from "./canonical-json.js";
import type { JsonPathToken } from "./shape-verdict.js";

/** Writes a path as an RFC 6901 JSON pointer, escaping "~" as "~0" and "/" as "~1". */
export function formatJsonPointer(path: readonly JsonPathToken[]): string {
	return path.map((token) => `/${String(token).replaceAll("~", "~0").replaceAll("/", "~1")}`).join("");
}

/**
 * Compares two paths token by token: array indices of one array as numbers, property names by code
 * point, and a path sorts before every longer path it begins.
 */
export function compareJsonPaths(a: readonly JsonPathToken[], b: readonly JsonPathToken[]): number {
	const shared = Math.min(a.length, b.length);
	for (let i = 0; i < shared; i++) {
		const left = a[i] as JsonPathToken;
		const right = b[i] as JsonPathToken;
		if (left === right) continue;
		if (typeof left === "number" && typeof right === "number") return left - right;
		return compareByCodePoint(String(left), String(right));
	}
	return a.length - b.length;
}
