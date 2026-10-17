// @ts-expect-error Node test types are outside the browser tsconfig.
import assert from "node:assert/strict";
// @ts-expect-error Node test types are outside the browser tsconfig.
import { readFileSync } from "node:fs";
// @ts-expect-error Node test types are outside the browser tsconfig.
import test from "node:test";
import ts from "typescript";

type Summary = { id: string; title: string; cover?: string; altTitle?: string };

type Mocks = {
  detail: Summary | null;
  library: Summary[];
  everywhere: Summary[];
  streamCalls: number;
  everywhereCalls: number;
};

function transpile(relPath: string, requireFn: (id: string) => unknown) {
  const source = readFileSync(new URL(`../src/lib/${relPath}`, import.meta.url), "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports: Record<string, any> = {};
  new Function("require", "exports", js)(requireFn, exports);
  return exports;
}

const titleModule = transpile("manga/title.ts", () => {
  throw new Error("title.ts should have no runtime dependencies");
});

function load(mocks: Mocks) {
  return transpile("manga/open-resolve.ts", (id) => {
    if (id === "@/lib/manga/api") {
      return {
        mangaDetail: async () => mocks.detail,
        searchMangaEverywhere: async () => {
          mocks.everywhereCalls += 1;
          return mocks.everywhere;
        },
      };
    }
    if (id === "@/lib/manga/sources/aggregate") {
      return {
        streamAll: async () => {
          mocks.streamCalls += 1;
          return mocks.library;
        },
      };
    }
    if (id === "@/lib/manga/title") return titleModule;
    if (id === "@/lib/manga/types") return {};
    throw new Error(`Unexpected dependency: ${id}`);
  });
}

function freshMocks(overrides: Partial<Mocks> = {}): Mocks {
  return {
    detail: null,
    library: [],
    everywhere: [],
    streamCalls: 0,
    everywhereCalls: 0,
    ...overrides,
  };
}

test("title matching is Unicode-aware and color-tag aware", () => {
  const mod = load(freshMocks());
  const match = mod.mangaTitlesMatch as (q: string, c: string, alt?: string) => boolean;
  assert.equal(match("アクマ", "アクマ"), true, "Japanese titles compare");
  assert.equal(match("アクマ", "アクマちゃん"), false);
  assert.equal(match("Solo Leveling (Color)", "Solo Leveling"), true);
  assert.equal(match("Solo Leveling", "Solo Leveling: Ragnarok"), false);
  assert.equal(match("呪術廻戦", "呪術廻戦", "Jujutsu Kaisen"), true);
});

test("a stored id whose title still matches is trusted, with no search", async () => {
  const mocks = freshMocks({ detail: { id: "suwayomi~1~42", title: "Akuma" } });
  const mod = load(mocks);
  const resolved = await mod.resolveMangaOpen({ id: "suwayomi~1~42", title: "Akuma" });
  assert.deepEqual(resolved, { id: "suwayomi~1~42", title: "Akuma", cover: undefined });
  assert.equal(mocks.streamCalls, 0);
  assert.equal(mocks.everywhereCalls, 0);
});

test("an id reused by a different manga is rejected and re-resolved via the library", async () => {
  const mocks = freshMocks({
    detail: { id: "suwayomi~1~42", title: "Some Other Manga" },
    library: [{ id: "suwayomi~1~99", title: "アクマ" }],
  });
  const mod = load(mocks);
  const resolved = await mod.resolveMangaOpen({ id: "suwayomi~1~42", title: "アクマ" });
  assert.deepEqual(resolved, { id: "suwayomi~1~99", title: "アクマ", cover: undefined });
  assert.equal(mocks.streamCalls, 1, "library-backed search is used");
  assert.equal(mocks.everywhereCalls, 0);
});

test("the library search resolves a Japanese title the extension search would miss", async () => {
  const mocks = freshMocks({
    library: [{ id: "suwayomi~7~5", title: "アクマ", cover: "cover.jpg" }],
  });
  const mod = load(mocks);
  const resolved = await mod.resolveMangaOpen({ id: "suwayomi~1~1", title: "アクマ" });
  assert.deepEqual(resolved, { id: "suwayomi~7~5", title: "アクマ", cover: "cover.jpg" });
  assert.equal(mocks.everywhereCalls, 0);
});

test("the everywhere search is the last resort", async () => {
  const mocks = freshMocks({ everywhere: [{ id: "other~1", title: "Akuma" }] });
  const mod = load(mocks);
  const resolved = await mod.resolveMangaOpen({ id: "stale", title: "Akuma" });
  assert.deepEqual(resolved, { id: "other~1", title: "Akuma", cover: undefined });
  assert.equal(mocks.streamCalls, 1);
  assert.equal(mocks.everywhereCalls, 1);
});

test("no confident match resolves to null rather than a wrong entry", async () => {
  const mocks = freshMocks({
    library: [{ id: "a~1", title: "Something Else" }],
    everywhere: [{ id: "b~1", title: "Another Thing" }],
  });
  const mod = load(mocks);
  assert.equal(await mod.resolveMangaOpen({ id: "stale", title: "Akuma" }), null);
});

test("the alt title is tried when the primary title does not match", async () => {
  const mocks = freshMocks({ library: [{ id: "a~1", title: "Jujutsu Kaisen" }] });
  const mod = load(mocks);
  const resolved = await mod.resolveMangaOpen({
    id: "stale",
    title: "呪術廻戦",
    altTitle: "Jujutsu Kaisen",
  });
  assert.deepEqual(resolved, { id: "a~1", title: "Jujutsu Kaisen", cover: undefined });
});
