// @ts-expect-error Node test types are outside the browser tsconfig.
import assert from "node:assert/strict";
// @ts-expect-error Node test types are outside the browser tsconfig.
import { readFileSync } from "node:fs";
// @ts-expect-error Node test types are outside the browser tsconfig.
import test from "node:test";
import ts from "typescript";

function transpile(relPath: string, requireFn: (id: string) => unknown) {
  const source = readFileSync(new URL(`../src/lib/${relPath}`, import.meta.url), "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports: Record<string, any> = {};
  new Function("require", "exports", js)(requireFn, exports);
  return exports;
}

const title = transpile("manga/title.ts", () => {
  throw new Error("title.ts should have no runtime dependencies");
});

const match = transpile("manga-match.ts", (id) => {
  if (id === "@/lib/manga/title") return title;
  if (id === "@/lib/active-profile-id") return { activeProfileId: () => "default" };
  if (id === "@/lib/manga/sync") return {};
  throw new Error(`Unexpected dependency: ${id}`);
});

const stripColorTag = title.stripColorTag as (t: string) => string;
const normalizeTitle = match.normalizeTitle as (t: string) => string;
const isConfidentTitleMatch = match.isConfidentTitleMatch as (
  q: string,
  c: string,
  alts?: string[],
) => boolean;

test("bracketed color markers are stripped", () => {
  assert.equal(stripColorTag("Surviving the Game as a Barbarian (Color)"), "Surviving the Game as a Barbarian");
  assert.equal(stripColorTag("Solo Leveling (Official Colored)"), "Solo Leveling");
  assert.equal(stripColorTag("Solo Leveling [Full Color]"), "Solo Leveling");
  assert.equal(stripColorTag("Solo Leveling (Color Version)"), "Solo Leveling");
  assert.equal(stripColorTag("Solo Leveling (Color, Volume)"), "Solo Leveling");
  assert.equal(stripColorTag("Solo Leveling （Color）"), "Solo Leveling");
  assert.equal(stripColorTag("Solo Leveling (Coloured)"), "Solo Leveling");
  assert.equal(stripColorTag("Solo Leveling (Color) Vol. 1"), "Solo Leveling Vol. 1");
});

test("real uses of the word color are left alone", () => {
  assert.equal(stripColorTag("Color"), "Color");
  assert.equal(stripColorTag("My Color Life"), "My Color Life");
  assert.equal(stripColorTag("The Color of Magic (Novel)"), "The Color of Magic (Novel)");
  assert.equal(stripColorTag("A Colorful Life (Colorful)"), "A Colorful Life (Colorful)");
});

test("normalizeTitle folds the color variant onto the base title", () => {
  assert.equal(normalizeTitle("Solo Leveling (Color)"), normalizeTitle("Solo Leveling"));
  assert.notEqual(normalizeTitle("Solo Leveling"), normalizeTitle("Solo Leveling: Ragnarok"));
});

test("title matching ignores the color tag on either side", () => {
  assert.equal(isConfidentTitleMatch("Solo Leveling (Color)", "Solo Leveling"), true);
  assert.equal(isConfidentTitleMatch("Solo Leveling", "Solo Leveling (Color)"), true);
  assert.equal(isConfidentTitleMatch("Solo Leveling", "Solo Leveling: Ragnarok"), false);
});
