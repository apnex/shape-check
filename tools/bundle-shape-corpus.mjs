#!/usr/bin/env node
// bundle-shape-corpus - write dist/corpus.json from the case files under corpus/.
//
// Duty: give every component carrying declared-shape-validation one public data path,
// @apnex/shape-check/corpus, holding every case of the corpus (CONTRACT.md, SD6). The case files under
// corpus/ are the master; the bundle is generated from them and never edited.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const names = fs.readdirSync(path.join(root, "corpus")).filter((f) => f.endsWith(".json")).sort();
const cases = names.map((file) => ({ name: path.basename(file, ".json"), ...JSON.parse(fs.readFileSync(path.join(root, "corpus", file), "utf8")) }));
fs.mkdirSync(path.join(root, "dist"), { recursive: true });
fs.writeFileSync(path.join(root, "dist", "corpus.json"), JSON.stringify({ dialect: "urn:apnex:shape-check:dialect:1", cases }) + "\n");
