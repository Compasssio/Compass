import assert from "node:assert/strict";
import test from "node:test";
import { nativePlaybackAdoption } from "../src/lib/music/deck-primary";
import type { MusicEngineState } from "../src/lib/music/decks";
import type { MusicPlayerState, MusicTrack } from "../src/lib/music/types";

const track = (id: string, extra: Partial<MusicTrack> = {}): MusicTrack =>
  ({
    id,
    connectorId: "youtube",
    title: id,
    artist: "Artist",
    artwork: "",
    durationSeconds: 200,
    durationLabel: "3:20",
    ...extra,
  }) as unknown as MusicTrack;

const A = track("a");
const B = track("b", { connectorId: "soundcloud" });

const engine = (extra: Partial<MusicEngineState> = {}): MusicEngineState => ({
  engine: "stream",
  live: true,
  paused: false,
  deck: 0,
  trackId: A.id,
  connectorId: A.connectorId ?? null,
  positionSeconds: 47,
  durationSeconds: 200,
  ...extra,
});

const IDLE_ENGINE: MusicEngineState = {
  engine: "none",
  live: false,
  paused: true,
  deck: null,
  trackId: null,
  connectorId: null,
  positionSeconds: null,
  durationSeconds: null,
};

const restored = (extra: Partial<MusicPlayerState> = {}): MusicPlayerState =>
  ({
    phase: "paused",
    current: A,
    queue: [A],
    queueIndex: 0,
    currentTime: 42,
    duration: 200,
    volume: 0.82,
    error: null,
    scrobbleError: null,
    likedIds: [],
    likedTracks: [],
    recents: [],
    ...extra,
  }) as MusicPlayerState;

test("a live playing engine outranks the checkpoint after a reload", () => {
  const adopted = nativePlaybackAdoption(engine(), restored());
  assert.ok(adopted);
  assert.equal(adopted.phase, "playing");
  assert.equal(adopted.track.id, "a");
  assert.equal(adopted.currentTime, 47);
  assert.equal(adopted.duration, 200);
  assert.equal(adopted.queueIndex, 0);
});

test("a live paused engine adopts as paused at the engine's position", () => {
  const adopted = nativePlaybackAdoption(
    engine({ paused: true, positionSeconds: 90 }),
    restored(),
  );
  assert.ok(adopted);
  assert.equal(adopted.phase, "paused");
  assert.equal(adopted.currentTime, 90);
});

test("an idle engine leaves the checkpoint restore alone", () => {
  assert.equal(nativePlaybackAdoption(IDLE_ENGINE, restored()), null);
  assert.equal(nativePlaybackAdoption(engine({ live: false }), restored()), null);
});

test("a track the queue knows but the checkpoint does not is seated by the queue", () => {
  const adopted = nativePlaybackAdoption(
    engine({ trackId: B.id, connectorId: "soundcloud", positionSeconds: 12 }),
    restored({ current: A, queue: [A, B], queueIndex: 0 }),
  );
  assert.ok(adopted);
  assert.equal(adopted.track.id, "b");
  assert.equal(adopted.queueIndex, 1);
  assert.equal(adopted.queue.length, 2);
});

test("a track only recents know is seated at the head of the queue", () => {
  const adopted = nativePlaybackAdoption(
    engine({ trackId: B.id, connectorId: "soundcloud" }),
    restored({ current: A, queue: [A], recents: [B] }),
  );
  assert.ok(adopted);
  assert.equal(adopted.track.id, "b");
  assert.equal(adopted.queueIndex, 0);
  assert.deepEqual(
    adopted.queue.map((item) => item.id),
    ["b", "a"],
  );
});

test("an engine playing something the window cannot name is left alone", () => {
  assert.equal(
    nativePlaybackAdoption(engine({ trackId: "ghost", connectorId: "tidal" }), restored()),
    null,
  );
});

test("a missing position or duration falls back to the restored values", () => {
  const adopted = nativePlaybackAdoption(
    engine({ positionSeconds: null, durationSeconds: null }),
    restored({ currentTime: 42, duration: 200 }),
  );
  assert.ok(adopted);
  assert.equal(adopted.currentTime, 42);
  assert.equal(adopted.duration, 200);
});

test("an engine reporting no duration falls back to the track's own length", () => {
  const adopted = nativePlaybackAdoption(
    engine({ durationSeconds: null }),
    restored({ duration: 0 }),
  );
  assert.ok(adopted);
  assert.equal(adopted.duration, 200);
});

test("deck B is reported with its deck number so its polling watch can take over", () => {
  const adopted = nativePlaybackAdoption(engine({ deck: 1 }), restored());
  assert.ok(adopted);
  assert.equal(adopted.deck, 1);
  assert.equal(adopted.track.id, "a");
});

test("a live Spotify engine adopts without a deck so the state publishes directly", () => {
  const spotify = track("spotify:track:one", { connectorId: "spotify" });
  const adopted = nativePlaybackAdoption(
    engine({
      engine: "spotify",
      deck: null,
      trackId: spotify.id,
      connectorId: "spotify",
      positionSeconds: 61,
    }),
    restored({ current: spotify }),
  );
  assert.ok(adopted);
  assert.equal(adopted.deck, null);
  assert.equal(adopted.track.connectorId, "spotify");
  assert.equal(adopted.currentTime, 61);
  assert.equal(adopted.phase, "playing");
});
