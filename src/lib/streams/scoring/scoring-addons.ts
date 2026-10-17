import type { ParsedStream, ScoreReason } from "../types";

const TRUSTED_ADDON_RX = /mediafusion|comet|easynews|torrentio/i;
const STRONG_ADDON_RX = /mediafusion|comet/i;

export function trustedAddonPoints(s: ParsedStream): ScoreReason {
  const name = s.addonName ?? "";
  if (STRONG_ADDON_RX.test(name)) return { signal: "strong-addon", delta: 8 };
  if (TRUSTED_ADDON_RX.test(name)) return { signal: "trusted-addon", delta: 4 };
  return { signal: "addon-neutral", delta: 0 };
}

const ADDON_PRIORITY_MAX = 12;
const ADDON_PRIORITY_STEP = 4;

export function addonPriorityPoints(s: ParsedStream): ScoreReason {
  const p = s.addonPriority;
  if (p == null) return { signal: "addon-priority-none", delta: 0 };
  const delta = Math.max(0, ADDON_PRIORITY_MAX - p * ADDON_PRIORITY_STEP);
  return { signal: `addon-priority-${p}`, delta };
}
