import assert from "node:assert/strict";
import test from "node:test";
import {
  IPTV_CACHE_TTL_MS,
  iptvSourceSignature,
  isPersistentCacheFresh,
} from "../src/lib/iptv/persistent-cache.ts";
import { createCatalogPublicationGate } from "../src/lib/iptv/catalog-publication-gate.ts";
import type { IptvPlaylistSource } from "../src/lib/iptv/types.ts";

test("treats a six-hour cache as fresh only before the TTL boundary", () => {
  const now = 10 * IPTV_CACHE_TTL_MS;

  assert.equal(isPersistentCacheFresh(now - IPTV_CACHE_TTL_MS + 1, now), true);
  assert.equal(isPersistentCacheFresh(now - IPTV_CACHE_TTL_MS, now), false);
  assert.equal(isPersistentCacheFresh(null, now), false);
});

test("source signatures invalidate changed credentials without storing them", () => {
  const source: IptvPlaylistSource = {
    id: "provider",
    name: "Provider",
    url: "https://example.com/get.php?username=alice&password=secret",
    kind: "xtream",
    xtream: {
      server: "https://example.com",
      username: "alice",
      password: "secret",
    },
  };

  const signature = iptvSourceSignature(source);
  const changed = iptvSourceSignature({
    ...source,
    xtream: { ...source.xtream!, password: "new-secret" },
  });

  assert.notEqual(signature, changed);
  assert.equal(signature.includes("secret"), false);
  assert.match(signature, /^v1:[a-f0-9]{8}$/);
});

test("buffers shows until the movie catalog has painted once", () => {
  const scheduled: Array<() => void> = [];
  const published: number[][] = [];
  const gate = createCatalogPublicationGate<number>(
    (items) => published.push([...items]),
    (task) => scheduled.push(task),
  );

  gate.update([1, 2]);
  assert.deepEqual(published, []);

  gate.release();
  gate.update([1, 2, 3]);
  assert.deepEqual(published, []);
  assert.equal(scheduled.length, 1);

  scheduled.shift()?.();
  assert.deepEqual(published, [[1, 2, 3]]);

  gate.update([1, 2, 3, 4]);
  assert.deepEqual(published, [
    [1, 2, 3],
    [1, 2, 3, 4],
  ]);
});

test("lets persistence wait until the buffered catalog is published", async () => {
  const scheduled: Array<() => void> = [];
  const published: number[][] = [];
  const gate = createCatalogPublicationGate<number>(
    (items) => published.push([...items]),
    (task) => scheduled.push(task),
  );

  gate.update([1, 2, 3]);
  gate.release();

  let settled = false;
  void gate.whenReleased().then(() => {
    settled = true;
  });
  await Promise.resolve();
  assert.equal(settled, false);

  scheduled.shift()?.();
  await gate.whenReleased();
  assert.equal(settled, true);
  assert.deepEqual(published, [[1, 2, 3]]);
});
