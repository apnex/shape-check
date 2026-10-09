// public-surface - the package exposes exactly what export-map.json names (zorg's target, EM14).
//
// Every path in package.json's exports is named in the map; a module path is imported by its public name
// and its runtime exports compared with the map, a data path is read; and every capability row of
// CONTRACT.md is served by some export or deferred with a ruling.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const map = JSON.parse(fs.readFileSync(path.join(root, "export-map.json"), "utf8"));
const publicName = (p) => p === "." ? pkg.name : `${pkg.name}/${p.slice(2)}`;

test("the export map names the package and exactly its exported paths", () => {
	assert.equal(map.package, pkg.name);
	assert.deepEqual(Object.keys(map.paths).sort(), Object.keys(pkg.exports).sort());
});

for (const [p, entry] of Object.entries(map.paths)) {
	test(`${publicName(p)} exposes what the map names`, async () => {
		if (entry.exports) {
			const mod = await import(publicName(p));
			assert.deepEqual(Object.keys(mod).sort(), Object.keys(entry.exports).sort());
		} else {
			assert.ok(entry.data, `${p} names neither exports nor data`);
			const mod = await import(publicName(p), { with: { type: "json" } });
			assert.ok(mod.default && typeof mod.default === "object", `${p} holds no data`);
		}
	});
}

test("every contract row is served by an export or deferred with a ruling", () => {
	const lines = fs.readFileSync(path.join(root, "CONTRACT.md"), "utf8").split("\n");
	const start = lines.findIndex((l) => /^\|\s*Capability\s*\|\s*Relation\s*\|/.test(l));
	const rows = [];
	for (let i = start + 2; start >= 0 && lines[i]?.startsWith("|"); i++) rows.push(lines[i].split("|")[1].trim().replaceAll("`", ""));
	const served = new Set(Object.values(map.paths).flatMap((e) => [...Object.values(e.exports ?? {}), ...(e.data ? [e.data] : [])]).flatMap((x) => x.serves));
	for (const row of rows) assert.ok(served.has(row) || map.deferred[row], `${row} is neither served nor deferred`);
	for (const [row, ruling] of Object.entries(map.deferred)) assert.match(ruling, /^D\d+$/, `${row} is deferred without a ruling`);
});
