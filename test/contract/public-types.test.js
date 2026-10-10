// public-types - shape-check's published types accept what consumers hold: a read-only shape and value,
// such as a frozen constant, pass to judgeShapeValue and prepareShapeDocument without a cast.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

test("a read-only shape and value type-check against the public entry point", () => {
	const tsc = path.join(root, "node_modules", ".bin", "tsc");
	const fixture = path.join(root, "test", "types", "readonly-shape-consumer.mts");
	const run = () => execFileSync(tsc, ["--noEmit", "--strict", "--module", "NodeNext", "--moduleResolution", "NodeNext", "--target", "ES2022", "--types", "node", fixture], { cwd: root, stdio: "inherit" });
	assert.doesNotThrow(run, "the consumer does not compile");
});
