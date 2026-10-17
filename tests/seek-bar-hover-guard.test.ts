// Stuck hover preview contract for the player seek bars.
//
// WebKitGTK on Linux can drop the pointerleave of the thin seek strip when the
// pointer exits quickly; the preview (thumbnail / time label) then stays on
// screen until the strip is hovered and left again. Both bars therefore watch
// window pointermove and clear hover once the pointer is outside the strip.
//
// Source-contract style: readFileSync + regex, node:test + node:assert/strict.

// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import assert from "node:assert/strict";
// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import { readFileSync } from "node:fs";
// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import test from "node:test";

const guard = readFileSync(
  new URL("../src/components/player/transport/use-hover-exit-guard.ts", import.meta.url),
  "utf8",
);
const seekBar = readFileSync(
  new URL("../src/components/player/transport/seek-bar.tsx", import.meta.url),
  "utf8",
);
const liveControls = readFileSync(
  new URL("../src/components/player/transport/live-controls.tsx", import.meta.url),
  "utf8",
);

test("hover clears when the pointer moves off the seek strip even without pointerleave", () => {
  assert.match(guard, /window\.addEventListener\("pointermove", onPointerMove, true\)/);
  assert.match(guard, /getBoundingClientRect\(\)/);
  assert.match(guard, /event\.clientX >= rect\.left/);
  assert.match(guard, /event\.clientY >= rect\.top/);
  assert.match(guard, /if \(!inside\) onExit\(\)/);
});

test("the guard also clears hover when the pointer leaves the window", () => {
  assert.match(guard, /document\.addEventListener\("mouseout", onMouseOut, true\)/);
  assert.match(guard, /if \(activeRef\.current && !event\.relatedTarget\) onExit\(\)/);
});

test("the guard leaves touch pointers and active scrub drags alone", () => {
  assert.match(guard, /event\.pointerType === "touch"/);
  assert.match(seekBar, /hoverGuardRef\.current = hover != null && scrub == null/);
  assert.match(liveControls, /hoverGuardRef\.current = hover != null && scrub == null/);
});

test("both player seek bars wire the exit guard", () => {
  assert.match(seekBar, /useHoverExitGuard\(ref, hoverGuardRef, onLeave\)/);
  assert.match(liveControls, /useHoverExitGuard\(ref, hoverGuardRef, onLeave\)/);
});
