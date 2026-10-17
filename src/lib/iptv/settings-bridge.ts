import type { XtreamContainer } from "./xtream";

const STORAGE_KEY = "compass.settings";

function readSettings(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function liveContainerPref(): XtreamContainer {
  const v = readSettings().iptvLiveContainer;
  return v === "m3u8" ? "m3u8" : "ts";
}

export function epgOffsetHoursPref(): number {
  const v = readSettings().iptvEpgOffsetHours;
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}
