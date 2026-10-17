// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import assert from "node:assert/strict";
// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import { readFileSync } from "node:fs";
// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import test from "node:test";

const downloadsPopoverSource = readFileSync(
  new URL("../src/components/downloads-popover.tsx", import.meta.url),
  "utf8",
);
const compassLoaderSource = readFileSync(
  new URL("../src/components/compass-loader.tsx", import.meta.url),
  "utf8",
);

test("active downloads reuse the shared Compass loader at compact size", () => {
  assert.match(downloadsPopoverSource, /import \{ CompassLoader \}/);
  assert.match(downloadsPopoverSource, /downloadingCount > 0[\s\S]*?<CompassLoader size="xs"/);
  assert.match(compassLoaderSource, /xs: "h-7 w-7"/);
  assert.doesNotMatch(downloadsPopoverSource, /DownloadActivityIcon|download-compass-/);
});
