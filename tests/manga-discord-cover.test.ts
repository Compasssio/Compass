// @ts-expect-error Node test types are outside the browser tsconfig.
import assert from "node:assert/strict";
// @ts-expect-error Node test types are outside the browser tsconfig.
import { readFileSync } from "node:fs";
// @ts-expect-error Node test types are outside the browser tsconfig.
import test from "node:test";
import ts from "typescript";

type AniMedia = {
  title: { romaji: string | null; english: string | null; native: string | null } | null;
  synonyms: string[] | null;
  startDate: { year: number | null } | null;
  staff: { edges: { node: { name: { full: string | null } | null } | null }[] | null } | null;
  coverImage: { extraLarge: string | null } | null;
};

type Mocks = {
  requestCalls: number;
  results: AniMedia[];
  disk: Map<string, string>;
  detail: { author?: string; year?: number } | null;
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
  return transpile("discord/manga-cover.ts", (id) => {
    if (id === "@/lib/anilist/client") {
      return {
        anilistRequest: async () => {
          mocks.requestCalls += 1;
          return { m: { media: mocks.results } };
        },
      };
    }
    if (id === "@/lib/manga/art-cache") {
      return {
        readArt: (_ns: string, key: string) => mocks.disk.get(key) ?? null,
        writeArt: (ns: string, key: string, url: string) => {
          mocks.disk.set(key, url);
          void ns;
        },
      };
    }
    if (id === "@/lib/manga/title") return titleModule;
    if (id === "@/lib/manga/api") return { mangaDetail: async () => mocks.detail };
    throw new Error(`Unexpected dependency: ${id}`);
  });
}

function media(over: Partial<AniMedia> = {}): AniMedia {
  return {
    title: { romaji: null, english: null, native: null },
    synonyms: null,
    startDate: null,
    staff: null,
    coverImage: null,
    ...over,
  };
}

function freshMocks(overrides: Partial<Mocks> = {}): Mocks {
  return {
    requestCalls: 0,
    results: [],
    disk: new Map(),
    detail: null,
    ...overrides,
  };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

test("only public, short HTTPS covers pass through untouched", () => {
  const mod = load(freshMocks());
  const fetchable = mod.discordFetchableCover as (c?: string | null) => string | undefined;
  assert.equal(fetchable(undefined), undefined);
  assert.equal(fetchable(""), undefined);
  assert.equal(fetchable("http://example.com/c.jpg"), undefined);
  assert.equal(fetchable("blob:http://localhost/x"), undefined);
  assert.equal(fetchable("https://localhost/c.jpg"), undefined);
  assert.equal(fetchable("https://asset.localhost/c.jpg"), undefined);
  assert.equal(fetchable("https://192.168.1.10/thumb.jpg"), undefined);
  assert.equal(fetchable("https://10.0.0.5/thumb.jpg"), undefined);
  assert.equal(fetchable("https://172.20.4.4/thumb.jpg"), undefined);
  assert.equal(fetchable("https://example.com/c.jpg"), "https://example.com/c.jpg");
  assert.equal(
    fetchable(`https://example.com/${"a".repeat(300)}.jpg`),
    undefined,
    "over Discord's length limit",
  );
});

test("a fetchable source cover wins without any AniList lookup", () => {
  const mocks = freshMocks();
  const mod = load(mocks);
  const cover = mod.mangaDiscordCover as (c?: string, t?: string, id?: string) => string | undefined;
  assert.equal(cover("https://cdn.example.com/jojo.jpg", "JoJo"), "https://cdn.example.com/jojo.jpg");
  assert.equal(mocks.requestCalls, 0);
});

test("a local cover falls back to the cached AniList cover", () => {
  const mocks = freshMocks();
  const mod = load(mocks);
  mocks.disk.set("jojo part 7", "https://s4.anilist.co/file/manga/cover/large/1.jpg");
  const cover = mod.mangaDiscordCover as (c?: string, t?: string, id?: string) => string | undefined;
  assert.equal(
    cover("http://192.168.1.4/api/v1/manga/9/thumbnail", "JoJo Part 7"),
    "https://s4.anilist.co/file/manga/cover/large/1.jpg",
  );
  assert.equal(mocks.requestCalls, 0, "cache hit must not re-query AniList");
});

test("the color tag is dropped from the AniList lookup key", () => {
  const mocks = freshMocks();
  const mod = load(mocks);
  mocks.disk.set("solo leveling", "https://s4.anilist.co/file/manga/cover/large/3.jpg");
  const cover = mod.mangaDiscordCover as (c?: string, t?: string, id?: string) => string | undefined;
  assert.equal(
    cover("http://192.168.1.4/thumb.jpg", "Solo Leveling (Color)"),
    "https://s4.anilist.co/file/manga/cover/large/3.jpg",
  );
  assert.equal(mocks.requestCalls, 0);
});

test("an exact AniList match resolves and flushes", async () => {
  const url = "https://s4.anilist.co/file/manga/cover/large/2.jpg";
  const mocks = freshMocks({
    results: [media({ title: { romaji: "Some Manga", english: null, native: null }, coverImage: { extraLarge: url } })],
  });
  const mod = load(mocks);
  const cover = mod.mangaDiscordCover as (c?: string, t?: string, id?: string) => string | undefined;
  let flushed = 0;
  (mod.onMangaCoverResolved as (cb: () => void) => void)(() => {
    flushed += 1;
  });

  assert.equal(cover("http://10.0.0.9/thumb.jpg", "Some Manga"), undefined);
  assert.equal(mocks.requestCalls, 1);
  await tick();
  assert.equal(flushed, 1, "resolved cover must notify the presence layer");
  assert.equal(cover("http://10.0.0.9/thumb.jpg", "Some Manga"), url);
});

test("a common name with no exact match shows no cover", async () => {
  const mocks = freshMocks({
    results: [
      media({ title: { romaji: "Something Else", english: null, native: null }, coverImage: { extraLarge: "https://s4.anilist.co/x.jpg" } }),
    ],
  });
  const mod = load(mocks);
  const cover = mod.mangaDiscordCover as (c?: string, t?: string, id?: string) => string | undefined;
  assert.equal(cover("http://10.0.0.9/thumb.jpg", "Again"), undefined);
  await tick();
  assert.equal(cover("http://10.0.0.9/thumb.jpg", "Again"), undefined, "no wrong poster");
});

test("the manga author breaks ties between same-named entries", async () => {
  const a = media({
    title: { romaji: "Again", english: null, native: null },
    staff: { edges: [{ node: { name: { full: "Jane Doe" } } }] },
    coverImage: { extraLarge: "https://s4.anilist.co/a.jpg" },
  });
  const b = media({
    title: { romaji: "Again", english: null, native: null },
    staff: { edges: [{ node: { name: { full: "John Smith" } } }] },
    coverImage: { extraLarge: "https://s4.anilist.co/b.jpg" },
  });
  const mocks = freshMocks({ results: [a, b], detail: { author: "John Smith" } });
  const mod = load(mocks);
  const cover = mod.mangaDiscordCover as (c?: string, t?: string, id?: string) => string | undefined;
  assert.equal(cover("http://192.168.1.4/thumb.jpg", "Again", "manga-1"), undefined);
  await tick();
  assert.equal(cover("http://192.168.1.4/thumb.jpg", "Again", "manga-1"), "https://s4.anilist.co/b.jpg");
});

test("a known author matching no same-named entry shows no cover", async () => {
  const a = media({
    title: { romaji: "Again", english: null, native: null },
    staff: { edges: [{ node: { name: { full: "Jane Doe" } } }] },
    coverImage: { extraLarge: "https://s4.anilist.co/a.jpg" },
  });
  const b = media({
    title: { romaji: "Again", english: null, native: null },
    staff: { edges: [{ node: { name: { full: "Bob Brown" } } }] },
    coverImage: { extraLarge: "https://s4.anilist.co/b.jpg" },
  });
  const mocks = freshMocks({ results: [a, b], detail: { author: "John Smith" } });
  const mod = load(mocks);
  const cover = mod.mangaDiscordCover as (c?: string, t?: string, id?: string) => string | undefined;
  assert.equal(cover("http://192.168.1.4/thumb.jpg", "Again", "manga-2"), undefined);
  await tick();
  assert.equal(cover("http://192.168.1.4/thumb.jpg", "Again", "manga-2"), undefined, "no guess");
});

test("no title and no cover resolves to nothing", () => {
  const mocks = freshMocks();
  const mod = load(mocks);
  const cover = mod.mangaDiscordCover as (c?: string, t?: string, id?: string) => string | undefined;
  assert.equal(cover("http://10.0.0.9/thumb.jpg", undefined), undefined);
  assert.equal(cover(undefined, ""), undefined);
  assert.equal(mocks.requestCalls, 0);
});
