// @ts-expect-error Node test types are outside the browser tsconfig.
import assert from "node:assert/strict";
// @ts-expect-error Node test types are outside the browser tsconfig.
import test from "node:test";
import {
  desiredSubtitleIsEmbedded,
  pickDesiredSubtitleTrack,
  subtitleAutoSelectionSignature,
} from "../src/lib/subtitles/track-selection.ts";

test("late language discovery invalidates selection and enables embedded selection", () => {
  const track = { id: "1", lang: "", external: false };
  const before = subtitleAutoSelectionSignature([track]);
  assert.equal(pickDesiredSubtitleTrack([track], ["en"], true), null);
  track.lang = "eng";
  assert.notEqual(subtitleAutoSelectionSignature([track]), before);
  assert.equal(pickDesiredSubtitleTrack([track], ["en"], true)?.id, "1");
});

test("aligned external results cannot outrank preferred embedded subtitles", () => {
  const embedded = { id: "1", lang: "en", external: false };
  const external = {
    id: "2",
    lang: "en",
    external: true,
    prepared: true,
    autoSelectionEligible: true,
    timingStatus: "aligned" as const,
    matchScore: 100,
  };
  assert.equal(pickDesiredSubtitleTrack([external, embedded], ["en"], true)?.id, "1");
  assert.equal(pickDesiredSubtitleTrack([external, embedded], ["en"], false)?.id, "2");
  assert.equal(pickDesiredSubtitleTrack([external], ["en"], true)?.id, "2");
});

test("embedded preference still respects language and forced-track exclusions", () => {
  const tracks = [
    { id: "foreign", lang: "ar", external: false },
    { id: "forced", lang: "en", external: false, forced: true },
    { id: "external", lang: "en", external: true, prepared: true, autoSelectionEligible: true },
  ];
  assert.equal(pickDesiredSubtitleTrack(tracks, ["en"], true)?.id, "external");
});

test("desiredSubtitleIsEmbedded mirrors the track pick used by autoload gating", () => {
  const embedded = { id: "1", lang: "en", external: false };
  const alignedExternal = {
    id: "2",
    lang: "en",
    external: true,
    prepared: true,
    autoSelectionEligible: true,
    timingStatus: "aligned" as const,
    matchScore: 100,
  };
  assert.equal(desiredSubtitleIsEmbedded([embedded, alignedExternal], ["en"], true), true);
  assert.equal(desiredSubtitleIsEmbedded([embedded, alignedExternal], ["en"], false), false);
});

test("a better language match keeps external candidates selectable", () => {
  const embedded = { id: "1", lang: "en", external: false };
  const arabicExternal = {
    id: "2",
    lang: "ar",
    external: true,
    prepared: true,
    autoSelectionEligible: true,
  };
  assert.equal(desiredSubtitleIsEmbedded([embedded, arabicExternal], ["ar", "en"], true), false);
  assert.equal(desiredSubtitleIsEmbedded([embedded, arabicExternal], ["ar"], true), false);
});

test("no eligible embedded track leaves external selection open", () => {
  assert.equal(desiredSubtitleIsEmbedded([], ["en"], true), false);
  assert.equal(
    desiredSubtitleIsEmbedded([{ id: "1", lang: "en", external: false, forced: true }], ["en"], true),
    false,
  );
});
