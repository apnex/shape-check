/**
 * Plain JSON values, snapshots and measures (CONTRACT.md, SD8; zorg's D54 and D55).
 *
 * `readPlainJson` reads what application code handed back as plain data, running none of its code: only own
 * data properties are read, through their descriptors, so no getter, setter, conversion or `then` probe ever
 * runs, and only a Proxy's trap can still run code, whose throw is caught here and makes the value not plain.
 * `observePromises` gives every native promise it meets a handler that does nothing, so its rejection is
 * consumed. `snapshotJson` reads a caller's input once (zorg's EM12), each object read once, and lets anything
 * the input throws reach the caller. The measures walk any plain JSON value.
 *
 * Every walk keeps its own stack rather than recursing, so a value of any depth is walked to the end without
 * overflowing the runtime's call stack. Nothing here is particular to one runtime.
 */
import { compareByCodePoint } from "./canonical-json.js";
import type { JsonInput, JsonValue } from "./shape-verdict.js";

/** The largest distance from zero of an integer AGP carries (SD8). */
export const SAFE_INTEGER_LIMIT = 9007199254740991;

/** What reading or snapshotting a value gives: a fresh deeply frozen plain JSON value, or a refusal. */
export type PlainJsonReading = { readonly ok: true; readonly value: JsonValue } | { readonly ok: false };

const REFUSED: { readonly ok: false } = Object.freeze({ ok: false });

/** A handler that does nothing, given to every native promise met. */
const noop = (): void => undefined;

/** A copy being made: its source's members, read once, and the next to copy. */
interface Frame {
	readonly source: object;
	readonly copy: JsonValue[] | { [name: string]: JsonValue };
	readonly keys: readonly string[];
	readonly values: readonly unknown[];
	next: number;
	/** Where the finished copy goes: its parent's key, or the result. */
	readonly key: string | undefined;
}

/** A container's members, read once, or undefined when the container is not one the walk accepts. */
type Members = { readonly array: boolean; readonly keys: readonly string[]; readonly values: readonly unknown[] } | undefined;

/** Defines a member on a copy as an ordinary own enumerable data property, so `__proto__` is kept as data. */
function define(target: object, key: string, value: JsonValue): void {
	Object.defineProperty(target, key, { value, enumerable: true, writable: true, configurable: true });
}

/**
 * Copies a value without the call stack, reading each container's members once through `readMembers`: a
 * scalar is kept (`-0` as `0`), a container reached again on another path is given its first copy, and a
 * container holding itself, or any value that is not JSON, is refused. Every copied container is frozen.
 */
function copyPlain(value: unknown, readMembers: (item: object) => Members): PlainJsonReading {
	let result: JsonValue | undefined;
	const frames: Frame[] = [];
	const open = new Set<object>();
	const done = new Map<object, JsonValue>();
	/** Places a finished value where it belongs. */
	const place = (key: string | undefined, copy: JsonValue): void => {
		const parent = frames.at(-1);
		if (parent === undefined || key === undefined) result = copy;
		else define(parent.copy, key, copy);
	};
	/** Takes one value: places a scalar or a copy already made, opens a container, or refuses. */
	const take = (item: unknown, key: string | undefined): boolean => {
		if (item === null || typeof item === "boolean" || typeof item === "string") {
			place(key, item);
			return true;
		}
		if (typeof item === "number") {
			if (!Number.isFinite(item)) return false;
			place(key, item === 0 ? 0 : item);
			return true;
		}
		if (typeof item !== "object") return false;
		const first = done.get(item);
		if (first !== undefined) {
			place(key, first);
			return true;
		}
		if (open.has(item)) return false;
		const members = readMembers(item);
		if (members === undefined) return false;
		const copy = members.array ? new Array<JsonValue>(members.keys.length) : {};
		open.add(item);
		frames.push({ source: item, copy, keys: members.keys, values: members.values, next: 0, key });
		return true;
	};
	if (!take(value, undefined)) return REFUSED;
	while (frames.length > 0) {
		const frame = frames.at(-1) as Frame;
		if (frame.next < frame.keys.length) {
			const i = frame.next++;
			if (!take(frame.values[i], frame.keys[i] as string)) return REFUSED;
			continue;
		}
		frames.pop();
		Object.freeze(frame.copy);
		open.delete(frame.source);
		done.set(frame.source, frame.copy);
		place(frame.key, frame.copy);
	}
	return Object.freeze({ ok: true, value: result as JsonValue });
}

/** True for a data descriptor that is enumerable. */
function enumerableData(descriptor: PropertyDescriptor | undefined): descriptor is PropertyDescriptor & { value: unknown } {
	return descriptor !== undefined && Object.hasOwn(descriptor, "value") && descriptor.enumerable === true;
}

/** How many values thrown while checking or attaching to one value met are themselves met, at most. */
const THROWN_LIMIT = 1000;

/**
 * Gives `first`, if it is a native promise, a handler that does nothing, inside a guard. A value thrown while
 * checking it or attaching the handler - by a Proxy's `getPrototypeOf` trap, say - is met the same way, up to
 * `limit` such values, without the call stack. `found` is called with each object met, first `first`; when it
 * returns false that object is not checked. Never throws.
 */
function consume(first: unknown, limit: number, found?: (item: object) => boolean): void {
	const queue: unknown[] = [first];
	let thrown = 0;
	const caught = (err: unknown): void => {
		if (thrown++ < limit) queue.push(err);
	};
	while (queue.length > 0) {
		const item = queue.pop();
		if (item === null || typeof item !== "object") continue;
		if (found !== undefined && !found(item)) continue;
		let promise = false;
		try {
			promise = item instanceof Promise;
		} catch (err) {
			caught(err);
		}
		if (!promise) continue;
		try {
			Promise.prototype.then.call(item, noop, noop);
		} catch (err) {
			// A throwing `constructor` or `Symbol.species` getter: caught, and met; the value is malformed.
			caught(err);
		}
	}
}

/**
 * Reads an own property descriptor, and observes its value at once if it has one (zorg's D54): a Proxy can
 * hand back a promise on its first read only, so the value obtained is observed, not one read again later.
 */
function readDescriptor(item: object, name: string): PropertyDescriptor | undefined {
	const descriptor = Object.getOwnPropertyDescriptor(item, name);
	if (descriptor !== undefined && Object.hasOwn(descriptor, "value")) consume(descriptor.value, THROWN_LIMIT);
	return descriptor;
}

/**
 * The members of a plain array or plain object, read through their own data descriptors only, or undefined
 * when the container is anything else. Never invokes a getter, setter or conversion; a Proxy's trap may run
 * and throw, which the caller catches. Every descriptor value obtained is observed as it is obtained.
 */
function readDescriptors(item: object): Members {
	if (Object.getOwnPropertySymbols(item).length > 0) return undefined;
	const proto = Object.getPrototypeOf(item);
	const names = Object.getOwnPropertyNames(item);
	if (Array.isArray(item)) {
		if (proto !== Array.prototype) return undefined;
		const lengthDescriptor = readDescriptor(item, "length");
		if (lengthDescriptor === undefined || !Object.hasOwn(lengthDescriptor, "value")) return undefined;
		const length: unknown = lengthDescriptor.value;
		if (typeof length !== "number" || !Number.isInteger(length) || length < 0) return undefined;
		// Exactly the indices 0 to length - 1 and `length`: no hole and no extra own property.
		if (names.length !== length + 1) return undefined;
		const keys: string[] = [];
		const values: unknown[] = [];
		for (let i = 0; i < length; i++) {
			const key = String(i);
			const descriptor = readDescriptor(item, key);
			if (!enumerableData(descriptor)) return undefined;
			keys.push(key);
			values.push(descriptor.value);
		}
		return { array: true, keys, values };
	}
	if (proto !== Object.prototype && proto !== null) return undefined;
	const values: unknown[] = [];
	for (const name of names) {
		const descriptor = readDescriptor(item, name);
		if (!enumerableData(descriptor)) return undefined;
		values.push(descriptor.value);
	}
	return { array: false, keys: names, values };
}

/**
 * Gives every native promise met a handler that does nothing, so its rejection is consumed: `value` itself,
 * and every value read from an own data descriptor of the first `maxNodes` objects and arrays the walk visits
 * by identity, without the call stack. Never invokes a getter, setter or conversion; any throw - from a
 * Proxy's trap, or from attaching the handler - is caught, and the value thrown is met in turn, so a trap
 * that throws a rejected promise has that promise observed.
 */
export function observePromises(value: unknown, maxNodes = 1000): void {
	const observed = new Set<object>();
	const visited = new Set<object>();
	const pending: object[] = [];
	/** Each object met for the first time is checked and queued to be walked. */
	const found = (item: object): boolean => {
		if (observed.has(item)) return false;
		observed.add(item);
		pending.push(item);
		return true;
	};
	/** Observes one value met, and anything thrown while observing it, queuing each object to be walked. */
	const meet = (item: unknown): void => consume(item, maxNodes, found);
	meet(value);
	while (pending.length > 0 && visited.size < maxNodes) {
		const item = pending.pop() as object;
		if (visited.has(item)) continue;
		visited.add(item);
		let names: string[];
		try {
			names = Object.getOwnPropertyNames(item);
		} catch (err) {
			meet(err);
			continue;
		}
		for (const name of names) {
			let descriptor: PropertyDescriptor | undefined;
			try {
				descriptor = Object.getOwnPropertyDescriptor(item, name);
			} catch (err) {
				meet(err);
				continue;
			}
			if (descriptor !== undefined && Object.hasOwn(descriptor, "value")) meet(descriptor.value);
		}
	}
}

/**
 * Reads a value handed back by application code as plain data (SD8; zorg's D54), running none of its code:
 * `{ok: true, value}` with a fresh deeply frozen plain JSON value, or `{ok: false}` after its native promises
 * are observed. Plain data is null, booleans, finite numbers (`-0` read as `0`), strings, plain arrays and
 * plain objects of them, read through own enumerable data descriptors only; a cycle, anything else, or a
 * throw from a Proxy's trap is refused. A container reached on more than one path is copied once. Each
 * descriptor value is observed as it is obtained, and a value a trap throws is observed when caught.
 */
export function readPlainJson(value: unknown): PlainJsonReading {
	let reading: PlainJsonReading;
	try {
		reading = copyPlain(value, readDescriptors);
	} catch (err) {
		// A Proxy's trap threw: what it threw is observed too, in case it is a rejected promise.
		observePromises(err);
		reading = REFUSED;
	}
	if (!reading.ok) observePromises(value);
	return reading;
}

/**
 * Snapshots a caller's input (SD8; zorg's EM12) without the call stack: `{ok: true, value}` deeply frozen, or
 * `{ok: false}` for a cycle, an array hole, a number that is not finite, or a value that is not JSON. An
 * array's `length` and each index are read once; a plain object's enumerable string keys are read once each;
 * an object reached on more than one path is read once. Anything an input getter or Proxy trap throws reaches
 * the caller.
 */
export function snapshotJson(value: unknown): PlainJsonReading {
	return copyPlain(value, (item) => {
		const record = item as { readonly [key: string]: unknown };
		if (Array.isArray(item)) {
			const length = (item as readonly unknown[]).length;
			const keys: string[] = [];
			const values: unknown[] = [];
			for (let i = 0; i < length; i++) {
				if (!(i in item)) return undefined;
				keys.push(String(i));
				values.push((item as readonly unknown[])[i]);
			}
			return { array: true, keys, values };
		}
		const proto = Object.getPrototypeOf(item);
		if (proto !== Object.prototype && proto !== null) return undefined;
		const keys = Object.keys(item);
		const values = keys.map((key) => record[key]);
		return { array: false, keys, values };
	});
}

/** The size in UTF-8 bytes of a string, a lone surrogate counted as the three bytes of U+FFFD. */
export function utf8ByteLength(text: string): number {
	let n = 0;
	for (let i = 0; i < text.length; i++) {
		const c = text.charCodeAt(i);
		if (c < 0x80) n += 1;
		else if (c < 0x800) n += 2;
		else if (c >= 0xd800 && c <= 0xdbff && i + 1 < text.length && text.charCodeAt(i + 1) >= 0xdc00 && text.charCodeAt(i + 1) <= 0xdfff) {
			n += 4;
			i++;
		} else n += 3;
	}
	return n;
}

/** Levels of nesting: 0 for a scalar or an empty array or object, and 1 more than the deepest member otherwise. */
export function nestingDepth(value: JsonInput): number {
	let deepest = 0;
	// Each entry is a value and the depth it has if it is a non-empty array or object.
	const stack: { readonly value: JsonInput; readonly level: number }[] = [{ value, level: 1 }];
	while (stack.length > 0) {
		const { value: item, level } = stack.pop() as { readonly value: JsonInput; readonly level: number };
		if (item === null || typeof item !== "object") continue;
		const members = Object.values(item) as JsonInput[];
		if (members.length === 0) continue;
		if (level > deepest) deepest = level;
		for (const member of members) stack.push({ value: member, level: level + 1 });
	}
	return deepest;
}

/** Escapes one JSON pointer token (RFC 6901). */
function pointerToken(token: string): string {
	return token.replaceAll("~", "~0").replaceAll("/", "~1");
}

/**
 * The first integer more than SAFE_INTEGER_LIMIT from zero, in SD5's pointer order - array indices as numbers,
 * names by code point, a pointer before its descendants - with its pointer (`""` at the root), or null.
 */
export function firstUnsafeInteger(value: JsonInput): { readonly pointer: string; readonly value: number } | null {
	interface Place { readonly value: JsonInput; readonly pointer: string }
	const stack: Place[] = [{ value, pointer: "" }];
	while (stack.length > 0) {
		const { value: item, pointer } = stack.pop() as Place;
		if (typeof item === "number") {
			if (Number.isInteger(item) && Math.abs(item) > SAFE_INTEGER_LIMIT) return Object.freeze({ pointer, value: item });
			continue;
		}
		if (Array.isArray(item)) {
			const list = item as readonly JsonInput[];
			for (let i = list.length - 1; i >= 0; i--) stack.push({ value: list[i] as JsonInput, pointer: `${pointer}/${i}` });
		} else if (item !== null && typeof item === "object") {
			const record = item as { readonly [name: string]: JsonInput };
			const names = Object.keys(record).sort(compareByCodePoint);
			for (let i = names.length - 1; i >= 0; i--) {
				const name = names[i] as string;
				stack.push({ value: record[name] as JsonInput, pointer: `${pointer}/${pointerToken(name)}` });
			}
		}
	}
	return null;
}
