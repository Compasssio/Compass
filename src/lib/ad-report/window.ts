import type { Meta } from "@/lib/cinemeta";

const AD_WINDOW_DAYS = 150;
const DAY_MS = 24 * 60 * 60 * 1000;

export function withinAdWindow(meta: Meta): boolean {
  if (meta.releaseDate) {
    const t = Date.parse(meta.releaseDate);
    if (Number.isFinite(t)) return Date.now() - t <= AD_WINDOW_DAYS * DAY_MS;
  }
  const m = /\d{4}/.exec(meta.releaseInfo ?? "");
  if (!m) return false;
  return parseInt(m[0], 10) >= new Date().getFullYear() - 1;
}
