/**
 * The one format dialect 1 checks, `uri` (CONTRACT.md, SD2): an absolute URI.
 */

const URI_SCHEME_THEN_COLON = /^[A-Za-z][A-Za-z0-9+.-]*:/;
const URI_WHITESPACE = /\s/u;

/** True when a code point is a control character: U+0000 to U+001F or U+007F to U+009F. */
function isControlCodePoint(codePoint: number): boolean {
	return codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f);
}

/**
 * True when a string is an absolute URI in dialect 1's sense: an ASCII letter, then ASCII letters,
 * digits, "+", "-" or ".", then ":", and no whitespace or control character anywhere.
 */
export function isAbsoluteUri(text: string): boolean {
	if (!URI_SCHEME_THEN_COLON.test(text)) return false;
	for (const character of text) {
		if (URI_WHITESPACE.test(character) || isControlCodePoint(character.codePointAt(0) ?? 0)) return false;
	}
	return true;
}
