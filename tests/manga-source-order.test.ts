// @ts-expect-error Node test types are outside the browser tsconfig.
import assert from "node:assert/strict";
// @ts-expect-error Node test types are outside the browser tsconfig.
import { readFileSync } from "node:fs";
// @ts-expect-error Node test types are outside the browser tsconfig.
import test from "node:test";
import ts from "typescript";

function load() {
  const source = readFileSync(
    new URL("../src/lib/manga/sources/suwayomi/source-order.ts", import.meta.url),
    "utf8",
  );
  const js = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports: Record<string, any> = {};
  new Function("require", "exports", js)(() => {
    throw new Error("source-order.ts should have no runtime dependencies");
  }, exports);
  return exports;
}

const mod = load();
const byOrder = mod.bySuwayomiSourceOrder as <T>(
  order: string[],
  idOf: (i: T) => string,
  nameOf: (i: T) => string,
) => (a: T, b: T) => number;

type G = { sourceId: string; name: string };
const id = (g: G) => g.sourceId;
const name = (g: G) => g.name;
const groups: G[] = [
  { sourceId: "a", name: "Asura" },
  { sourceId: "b", name: "Batoto" },
  { sourceId: "c", name: "Comick" },
];
const ids = (list: G[]) => list.map((g) => g.sourceId);

test("no custom order keeps the alphabetical fallback", () => {
  assert.deepEqual(ids([...groups].sort(byOrder([], id, name))), ["a", "b", "c"]);
});

test("search groups follow the arranged source order", () => {
  assert.deepEqual(ids([...groups].sort(byOrder(["c", "a"], id, name))), ["c", "a", "b"]);
});

test("sources without a position fall in alphabetically after the ordered ones", () => {
  assert.deepEqual(ids([...groups].sort(byOrder(["b"], id, name))), ["b", "a", "c"]);
});

test("order entries that are absent from the results are ignored", () => {
  assert.deepEqual(ids([...groups].sort(byOrder(["z", "c"], id, name))), ["c", "a", "b"]);
});
