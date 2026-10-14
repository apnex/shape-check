// plain-json-value - SD8: values read as plain JSON running none of their code (zorg's D54, D55), a caller's
// input snapshotted once (zorg's EM12), the measures, and canonical JSON, each without the call stack.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
	firstUnsafeInteger,
	nestingDepth,
	observePromises,
	readPlainJson,
	SAFE_INTEGER_LIMIT,
	snapshotJson,
	toCanonicalJson,
	utf8ByteLength,
} from "@apnex/shape-check";

// Deep enough that any recursion on the call stack overflows it.
const DEEP = 200000;

/** An array nested `levels` deep around `inner`, built without recursion. */
function nestedArrays(levels, inner = 0) {
	let value = inner;
	for (let i = 0; i < levels; i++) value = [value];
	return value;
}

/** An object nested `levels` deep around `inner` under the key `a`. */
function nestedObjects(levels, inner = 0) {
	let value = inner;
	for (let i = 0; i < levels; i++) value = { a: value };
	return value;
}

/** True when a value and every container in it are frozen, walked without recursion. */
function deeplyFrozen(value) {
	const stack = [value];
	while (stack.length > 0) {
		const item = stack.pop();
		if (item === null || typeof item !== "object") continue;
		if (!Object.isFrozen(item)) return false;
		for (const member of Object.values(item)) stack.push(member);
	}
	return true;
}

/** Counts unhandled rejections while `run` runs and for some turns of the event loop after. */
async function unhandledDuring(run) {
	let count = 0;
	const listener = () => { count++; };
	process.on("unhandledRejection", listener);
	try {
		await run();
		for (let i = 0; i < 5; i++) await new Promise((resolve) => setTimeout(resolve, 10));
	} finally {
		process.off("unhandledRejection", listener);
	}
	return count;
}

test("SAFE_INTEGER_LIMIT is 9007199254740991", () => {
	assert.equal(SAFE_INTEGER_LIMIT, 9007199254740991);
});

test("readPlainJson accepts plain JSON values into fresh deeply frozen copies, -0 read as 0", () => {
	for (const scalar of [null, true, false, 0, 1.5, -7, "", "text"]) assert.deepEqual(readPlainJson(scalar), { ok: true, value: scalar });
	const negativeZero = readPlainJson(-0);
	assert.ok(negativeZero.ok && Object.is(negativeZero.value, 0));
	const input = { b: [1, { c: -0 }], a: "x", n: null, e: [], o: {} };
	const reading = readPlainJson(input);
	assert.equal(reading.ok, true);
	assert.deepEqual(reading.value, { b: [1, { c: 0 }], a: "x", n: null, e: [], o: {} });
	assert.ok(Object.is(reading.value.b[1].c, 0));
	assert.notEqual(reading.value, input);
	assert.notEqual(reading.value.b, input.b);
	assert.ok(deeplyFrozen(reading.value));
	assert.ok(Object.isFrozen(reading));
	assert.equal(Object.isFrozen(input), false, "the value read is left as it was");
	const bare = Object.create(null);
	bare.k = 1;
	assert.deepEqual(readPlainJson(bare), { ok: true, value: { k: 1 } });
});

test("readPlainJson refuses values that are not JSON", () => {
	for (const value of [undefined, NaN, Infinity, -Infinity, 1n, Symbol("s"), () => 1, new Date(0), new Map(), /x/, new (class Point { x = 1; })(), [undefined], { a: undefined }, { a: NaN }, new Uint8Array(1), new String("s"), new Number(1)]) {
		assert.deepEqual(readPlainJson(value), { ok: false }, String(typeof value));
	}
});

test("readPlainJson reads own data descriptors only: getters and setters are never called, and refuse the value", () => {
	let calls = 0;
	const getter = { get a() { calls++; return 1; } };
	const setterOnly = {};
	Object.defineProperty(setterOnly, "a", { set() { calls++; }, enumerable: true });
	const nested = { inner: [1, getter] };
	const arrayGetter = [1, 2];
	Object.defineProperty(arrayGetter, 1, { get() { calls++; return 2; }, enumerable: true });
	for (const value of [getter, setterOnly, nested, arrayGetter]) assert.deepEqual(readPlainJson(value), { ok: false });
	assert.equal(calls, 0, "no getter or setter ran");
});

test("readPlainJson runs no conversion: toJSON, toString, valueOf and Symbol.toPrimitive stay unread", () => {
	let calls = 0;
	const count = () => { calls++; return 1; };
	assert.deepEqual(readPlainJson({ toJSON: count }), { ok: false });
	const inherited = Object.create({ toJSON: count, toString: count, valueOf: count });
	assert.deepEqual(readPlainJson(inherited), { ok: false }, "an inherited field makes a custom prototype");
	const plain = { a: 1 };
	Object.defineProperty(plain, Symbol.toPrimitive, { value: count, enumerable: false });
	assert.deepEqual(readPlainJson(plain), { ok: false });
	assert.equal(calls, 0);
});

test("readPlainJson refuses custom prototypes, inherited fields and arrays not of Array.prototype", () => {
	assert.deepEqual(readPlainJson(Object.create({ a: 1 })), { ok: false });
	const array = [1];
	Object.setPrototypeOf(array, null);
	assert.deepEqual(readPlainJson(array), { ok: false });
	class List extends Array {}
	assert.deepEqual(readPlainJson(List.from([1])), { ok: false });
	assert.deepEqual(readPlainJson(Object.create(Array.prototype)), { ok: false });
});

test("readPlainJson refuses symbol keys and non-enumerable properties, on objects and arrays", () => {
	assert.deepEqual(readPlainJson({ [Symbol("s")]: 1 }), { ok: false });
	const array = [1];
	array[Symbol("s")] = 2;
	assert.deepEqual(readPlainJson(array), { ok: false });
	const hidden = { a: 1 };
	Object.defineProperty(hidden, "b", { value: 2, enumerable: false });
	assert.deepEqual(readPlainJson(hidden), { ok: false });
	const hiddenIndex = [1, 2];
	Object.defineProperty(hiddenIndex, 1, { value: 2, enumerable: false });
	assert.deepEqual(readPlainJson(hiddenIndex), { ok: false });
	const extra = [1, 2];
	extra.name = "x";
	assert.deepEqual(readPlainJson(extra), { ok: false }, "an extra own property on an array");
});

test("readPlainJson refuses sparse arrays, a hole anywhere, and a huge empty length without walking it", () => {
	assert.deepEqual(readPlainJson([1, , 3]), { ok: false });
	assert.deepEqual(readPlainJson(new Array(3)), { ok: false });
	const tail = [1, 2];
	tail.length = 3;
	assert.deepEqual(readPlainJson(tail), { ok: false });
	assert.deepEqual(readPlainJson(new Array(4294967295)), { ok: false });
	assert.deepEqual(readPlainJson([, 1]), { ok: false });
});

test("readPlainJson keeps own data properties named then and __proto__ as data, and never probes then", () => {
	const value = {};
	Object.defineProperty(value, "__proto__", { value: { x: 1 }, enumerable: true, writable: true, configurable: true });
	Object.defineProperty(value, "then", { value: "data", enumerable: true, writable: true, configurable: true });
	const reading = readPlainJson(value);
	assert.equal(reading.ok, true);
	assert.deepEqual(Object.keys(reading.value), ["__proto__", "then"]);
	assert.deepEqual(Object.getOwnPropertyDescriptor(reading.value, "__proto__").value, { x: 1 });
	assert.equal(Object.getPrototypeOf(reading.value), Object.prototype, "the copy's prototype is not changed by its __proto__ key");
	assert.equal(reading.value.then, "data");
	assert.equal(toCanonicalJson(reading.value), '{"__proto__":{"x":1},"then":"data"}');
	const parsed = JSON.parse('{"__proto__":[1],"then":2}');
	assert.deepEqual(Object.keys(readPlainJson(parsed).value), ["__proto__", "then"]);
	let probed = 0;
	const thenGetter = { get then() { probed++; return undefined; } };
	assert.deepEqual(readPlainJson(thenGetter), { ok: false });
	assert.deepEqual(readPlainJson({ then: () => undefined }), { ok: false }, "a then function is not JSON");
	assert.equal(probed, 0);
});

test("readPlainJson refuses native promises and observes them, so none goes unhandled", async () => {
	const unhandled = await unhandledDuring(async () => {
		assert.deepEqual(readPlainJson(Promise.reject(new Error("top"))), { ok: false });
		assert.deepEqual(readPlainJson({ a: [1, { p: Promise.reject(new Error("nested")) }] }), { ok: false });
		assert.deepEqual(readPlainJson([Promise.reject(new Error("one")), Promise.reject(new Error("two"))]), { ok: false });
		let calls = 0;
		const withGetter = { get g() { calls++; return 1; }, p: Promise.reject(new Error("beside a getter")) };
		assert.deepEqual(readPlainJson(withGetter), { ok: false });
		assert.equal(calls, 0);
	});
	assert.equal(unhandled, 0);
});

test("a promise whose own constructor getter throws is caught, and the value refused", async () => {
	let calls = 0;
	const promise = Promise.resolve(1);
	Object.defineProperty(promise, "constructor", { get() { calls++; throw new Error("constructor getter"); } });
	assert.deepEqual(readPlainJson({ p: promise }), { ok: false });
	assert.doesNotThrow(() => observePromises(promise));
	assert.ok(calls >= 1, "attaching the handler met the getter, and its throw was caught");
});

test("readPlainJson catches a Proxy trap's throw and refuses; a Proxy of plain data whose traps run is read", async () => {
	const boom = () => { throw new Error("trap"); };
	for (const handler of [{ ownKeys: boom }, { getOwnPropertyDescriptor: boom }, { getPrototypeOf: boom }]) {
		assert.deepEqual(readPlainJson(new Proxy({ a: 1 }, handler)), { ok: false });
		assert.deepEqual(readPlainJson({ nested: new Proxy([1], handler) }), { ok: false });
	}
	const { proxy, revoke } = Proxy.revocable({}, {});
	revoke();
	assert.deepEqual(readPlainJson(proxy), { ok: false });
	let gets = 0;
	const reading = readPlainJson(new Proxy({ a: 1 }, { get(target, key) { gets++; return target[key]; } }));
	assert.deepEqual(reading, { ok: true, value: { a: 1 } });
	assert.equal(gets, 0, "no get trap ran: only descriptors were read");
	const unhandled = await unhandledDuring(async () => {
		assert.deepEqual(readPlainJson({ p: Promise.reject(new Error("x")), q: new Proxy({}, { ownKeys: boom }) }), { ok: false });
	});
	assert.equal(unhandled, 0);
});

/** A Proxy over `target` whose descriptor for `name` holds a rejected promise on its first read only. */
function firstReadPromise(target, name, reads = { count: 0 }) {
	return new Proxy(target, {
		getOwnPropertyDescriptor(inner, key) {
			const descriptor = Reflect.getOwnPropertyDescriptor(inner, key);
			if (key === name && ++reads.count === 1) return { ...descriptor, value: Promise.reject(new Error(`first read of ${name}`)) };
			return descriptor;
		},
	});
}

/** A Proxy over `target` whose `trap` throws a fresh rejected promise each time it runs. */
function throwsPromise(target, trap, runs = { count: 0 }) {
	return new Proxy(target, {
		[trap]() {
			runs.count++;
			throw Promise.reject(new Error(`${trap} threw a promise`));
		},
	});
}

test("readPlainJson observes a descriptor's promise handed back on the first read only, never relying on a second read", async () => {
	const reads = { count: 0 };
	const unhandled = await unhandledDuring(async () => {
		assert.deepEqual(readPlainJson(firstReadPromise({ ending: "not-delivered", agpCode: "TIMEOUT" }, "agpCode", reads)), { ok: false });
		assert.deepEqual(readPlainJson({ nested: firstReadPromise({ a: 1, b: 2 }, "b") }), { ok: false });
		assert.deepEqual(readPlainJson(firstReadPromise(["x", "y"], "1")), { ok: false });
		// A non-enumerable member refused at once still has its first-read promise observed.
		const hidden = {};
		Object.defineProperty(hidden, "h", { value: 1, enumerable: false, configurable: true });
		assert.deepEqual(readPlainJson(firstReadPromise(hidden, "h")), { ok: false });
	});
	assert.ok(reads.count >= 1);
	assert.equal(unhandled, 0);
});

test("readPlainJson observes a rejected promise a Proxy trap throws", async () => {
	const unhandled = await unhandledDuring(async () => {
		for (const trap of ["getOwnPropertyDescriptor", "ownKeys", "getPrototypeOf"]) {
			const runs = { count: 0 };
			assert.deepEqual(readPlainJson(throwsPromise({ a: 1 }, trap, runs)), { ok: false });
			assert.deepEqual(readPlainJson({ nested: throwsPromise([1], trap, runs) }), { ok: false });
			assert.ok(runs.count >= 2, `the ${trap} trap ran and threw`);
		}
	});
	assert.equal(unhandled, 0);
});

test("observePromises observes a descriptor's first-read promise and a rejected promise a Proxy trap throws", async () => {
	const unhandled = await unhandledDuring(async () => {
		observePromises(firstReadPromise({ message: "m" }, "message"));
		observePromises({ nested: [firstReadPromise({ a: 1 }, "a")] });
		for (const trap of ["getOwnPropertyDescriptor", "ownKeys", "getPrototypeOf"]) {
			observePromises(throwsPromise({ a: 1 }, trap));
			observePromises({ nested: throwsPromise({ a: 1 }, trap) });
		}
	});
	assert.equal(unhandled, 0);
});

test("readPlainJson copies a shared alias once on distinct paths and refuses a cycle on the active path", () => {
	const shared = { s: [1] };
	const reading = readPlainJson({ a: shared, b: shared, c: [shared, shared] });
	assert.equal(reading.ok, true);
	assert.deepEqual(reading.value, { a: { s: [1] }, b: { s: [1] }, c: [{ s: [1] }, { s: [1] }] });
	assert.equal(reading.value.a, reading.value.b, "copied once");
	assert.notEqual(reading.value.a, shared);
	const cycle = { a: {} };
	cycle.a.back = cycle;
	assert.deepEqual(readPlainJson(cycle), { ok: false });
	const self = [];
	self.push(self);
	assert.deepEqual(readPlainJson(self), { ok: false });
	// Shared aliases fanning out: 2^40 paths, read in linear time.
	let fan = 0;
	for (let i = 0; i < 40; i++) fan = [fan, fan];
	assert.equal(readPlainJson(fan).ok, true);
});

test("readPlainJson reads values nested beyond the call stack", () => {
	for (const value of [nestedArrays(DEEP), nestedObjects(DEEP)]) {
		const reading = readPlainJson(value);
		assert.equal(reading.ok, true);
		assert.equal(nestingDepth(reading.value), DEEP);
	}
	const deepCycle = { a: null };
	let tip = deepCycle;
	for (let i = 0; i < DEEP; i++) { tip.a = { a: null }; tip = tip.a; }
	tip.a = deepCycle;
	assert.deepEqual(readPlainJson(deepCycle), { ok: false });
	assert.deepEqual(readPlainJson(nestedArrays(DEEP, () => 1)), { ok: false });
});

test("observePromises observes native promises within maxNodes, never invoking getters, and catches traps", async () => {
	let calls = 0;
	const unhandled = await unhandledDuring(async () => {
		observePromises(Promise.reject(new Error("root")));
		observePromises({ a: { b: [Promise.reject(new Error("deep"))] }, get g() { calls++; return Promise.reject(new Error("never")); } });
		observePromises(new Proxy({}, { ownKeys() { throw new Error("trap"); } }));
		observePromises(nestedObjects(DEEP, Promise.reject(new Error("beyond bound but caught at the end"))), DEEP + 1);
		const promiseWithData = Promise.reject(new Error("outer"));
		promiseWithData.inner = Promise.reject(new Error("inner"));
		observePromises(promiseWithData);
		observePromises(42);
		observePromises(null);
	});
	assert.equal(calls, 0);
	assert.equal(unhandled, 0);
});

test("observePromises stops at maxNodes objects", async () => {
	// Promise.prototype.then reads `constructor`, so an own counting getter shows each attachment.
	const attachments = [];
	const tracked = (label) => {
		const promise = Promise.resolve(label);
		Object.defineProperty(promise, "constructor", { get() { attachments.push(label); return Promise; } });
		return promise;
	};
	const value = { near: tracked("near"), a: { a: { a: { a: { a: { far: tracked("far") } } } } } };
	observePromises(value, 3);
	assert.deepEqual(attachments, ["near"], "the promise in the sixth object is past a bound of three");
	attachments.length = 0;
	observePromises(value);
	assert.deepEqual(attachments.sort(), ["far", "near"]);
	const thenable = { then: () => { throw new Error("never called"); } };
	assert.doesNotThrow(() => observePromises(thenable));
});

test("snapshotJson reads each member once into a deeply frozen copy, propagating throws", () => {
	let reads = 0;
	const input = { get a() { reads++; return [1, 2]; }, b: -0 };
	const snapshot = snapshotJson(input);
	assert.equal(snapshot.ok, true);
	assert.deepEqual(snapshot.value, { a: [1, 2], b: 0 });
	assert.ok(Object.is(snapshot.value.b, 0));
	assert.equal(reads, 1);
	assert.ok(deeplyFrozen(snapshot.value));
	assert.throws(() => snapshotJson({ get a() { throw new RangeError("getter"); } }), RangeError);
	assert.throws(() => snapshotJson(new Proxy({}, { ownKeys() { throw new SyntaxError("trap"); } })), SyntaxError);
	let lengthReads = 0;
	const list = new Proxy([7, 8], { get(target, key) { if (key === "length") lengthReads++; return target[key]; } });
	assert.deepEqual(snapshotJson(list), { ok: true, value: [7, 8] });
	assert.equal(lengthReads, 1);
});

test("snapshotJson keeps __proto__ as data, ignores non-enumerable, symbol and non-index keys, and accepts null prototypes", () => {
	const parsed = JSON.parse('{"__proto__":{"x":1}}');
	const snapshot = snapshotJson(parsed);
	assert.deepEqual(Object.keys(snapshot.value), ["__proto__"]);
	assert.equal(Object.getPrototypeOf(snapshot.value), Object.prototype);
	const hidden = { a: 1, [Symbol("s")]: 2 };
	Object.defineProperty(hidden, "b", { value: 3, enumerable: false });
	assert.deepEqual(snapshotJson(hidden), { ok: true, value: { a: 1 } });
	const array = [1, 2];
	array.extra = 3;
	assert.deepEqual(snapshotJson(array), { ok: true, value: [1, 2] });
	const bare = Object.create(null);
	bare.k = "v";
	assert.deepEqual(snapshotJson(bare), { ok: true, value: { k: "v" } });
});

test("snapshotJson refuses cycles, holes, non-finite numbers and non-JSON types", () => {
	const cycle = {};
	cycle.self = cycle;
	const reportsHole = new Proxy([1, 2, 3], { has: (target, key) => key !== "1" && key in target });
	assert.deepEqual(snapshotJson(reportsHole), { ok: false }, "an index reported absent is a hole, whatever reading it gives");
	for (const value of [cycle, [1, , 2], new Array(2), NaN, Infinity, { a: -Infinity }, undefined, { a: undefined }, 1n, Symbol("s"), () => 0, new Date(0), Object.create({}), new (class X {})()]) {
		assert.deepEqual(snapshotJson(value), { ok: false });
	}
});

test("snapshotJson reads a shared object once, and values beyond the call stack", () => {
	let reads = 0;
	const shared = { get v() { reads++; return 1; } };
	const snapshot = snapshotJson([shared, { s: shared }, shared]);
	assert.equal(snapshot.ok, true);
	assert.equal(reads, 1);
	assert.equal(snapshot.value[0], snapshot.value[2]);
	assert.equal(snapshotJson(nestedArrays(DEEP)).ok, true);
	assert.equal(snapshotJson(nestedObjects(DEEP)).ok, true);
});

test("toCanonicalJson writes SD4's canonical form, by code point, -0 as 0, beyond the call stack", () => {
	assert.equal(toCanonicalJson({ b: 1, a: [true, null, "x"], "\u{1F600}": 1, "\uFFFF": 2 }), '{"a":[true,null,"x"],"b":1,"\uFFFF":2,"\u{1F600}":1}');
	assert.equal(toCanonicalJson(-0), "0");
	assert.equal(toCanonicalJson([-0, { z: -0 }]), '[0,{"z":0}]');
	assert.equal(toCanonicalJson({}), "{}");
	assert.equal(toCanonicalJson([]), "[]");
	assert.equal(toCanonicalJson("a\"\n"), JSON.stringify("a\"\n"));
	assert.equal(toCanonicalJson(1e21), "1e+21");
	assert.equal(toCanonicalJson(Object.freeze({ k: Object.freeze([1]) })), '{"k":[1]}');
	const deep = nestedArrays(5000);
	assert.equal(toCanonicalJson(deep), `${"[".repeat(5000)}0${"]".repeat(5000)}`);
	assert.equal(toCanonicalJson(nestedArrays(DEEP)).length, DEEP * 2 + 1);
	assert.equal(toCanonicalJson(nestedObjects(DEEP)).length, DEEP * 6 + 1);
});

test("utf8ByteLength counts UTF-8 bytes, a lone surrogate as three", () => {
	assert.equal(utf8ByteLength(""), 0);
	assert.equal(utf8ByteLength("a"), 1);
	assert.equal(utf8ByteLength("\u00e9"), 2);
	assert.equal(utf8ByteLength("\u20ac"), 3);
	assert.equal(utf8ByteLength("\u{1F600}"), 4);
	assert.equal(utf8ByteLength("\ud800"), 3);
	assert.equal(utf8ByteLength("\udc00x"), 4);
	const mixed = "a\u00e9\u20ac\u{1F600}\ud800";
	assert.equal(utf8ByteLength(mixed), new TextEncoder().encode(mixed).length);
});

test("nestingDepth is 0 for scalars and empty containers and 1 more than the deepest member otherwise", () => {
	for (const value of [null, 1, "s", true, [], {}]) assert.equal(nestingDepth(value), 0);
	assert.equal(nestingDepth([1]), 1);
	assert.equal(nestingDepth({ a: [] }), 1);
	assert.equal(nestingDepth({ a: [[]] }), 2);
	assert.equal(nestingDepth([[1], [[2]], {}]), 3);
	assert.equal(nestingDepth(nestedObjects(DEEP)), DEEP);
	assert.equal(nestingDepth(nestedArrays(DEEP, [])), DEEP);
});

test("firstUnsafeInteger names the first unsafe integer in SD5 order, or null", () => {
	assert.equal(firstUnsafeInteger(9007199254740991), null);
	assert.equal(firstUnsafeInteger(-9007199254740991), null);
	assert.equal(firstUnsafeInteger({ a: [1.5, 1e300 / 1e300, "9007199254740993"] }), null);
	assert.deepEqual(firstUnsafeInteger(9007199254740992), { pointer: "", value: 9007199254740992 });
	assert.deepEqual(firstUnsafeInteger(-9007199254740992), { pointer: "", value: -9007199254740992 });
	const value = { b: [0, 1, 2e20], a: { "x/y~": 2 ** 60 }, c: 2 ** 61 };
	assert.deepEqual(firstUnsafeInteger(value), { pointer: "/a/x~1y~0", value: 2 ** 60 });
	const indices = [];
	indices[10] = 2 ** 54;
	indices[2] = -(2 ** 55);
	for (let i = 0; i < 11; i++) if (!(i in indices)) indices[i] = 0;
	assert.deepEqual(firstUnsafeInteger(indices), { pointer: "/2", value: -(2 ** 55) });
	assert.deepEqual(firstUnsafeInteger({ "\u{1F600}": 2 ** 54, "\uFFFF": 2 ** 55 }), { pointer: "/\uFFFF", value: 2 ** 55 });
	assert.deepEqual(firstUnsafeInteger({ a: 2 ** 54, a0: [] }), { pointer: "/a", value: 2 ** 54 });
	assert.deepEqual(firstUnsafeInteger(nestedArrays(DEEP, 2 ** 54)), { pointer: "/0".repeat(DEEP), value: 2 ** 54 });
	assert.equal(firstUnsafeInteger(nestedArrays(DEEP, 1)), null);
});
