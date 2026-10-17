import type { Addon } from "@/lib/addons";

export type AddonFamily = "aiostreams" | "aiostatus" | "mediafusion" | "torrentio" | "comet" | "other";

export function detectAddonFamily(addon: Pick<Addon, "manifest" | "transportUrl">): AddonFamily {
  const id = (addon.manifest.id ?? "").toLowerCase();
  const name = (addon.manifest.name ?? "").toLowerCase();
  const url = (addon.transportUrl ?? "").toLowerCase();
  const haystack = `${id} ${name} ${url}`;
  if (/aiostatus|aio[\s\-]?status|--status--|stremio[\s\-]?status/.test(haystack)) return "aiostatus";
  if (/aiostreams|aio[\s\-]?streams/.test(haystack)) return "aiostreams";
  if (/mediafusion/.test(haystack)) return "mediafusion";
  if (/comet/.test(haystack)) return "comet";
  if (/torrentio/.test(haystack)) return "torrentio";
  return "other";
}

export function isAddonRanked(addon: Pick<Addon, "manifest" | "transportUrl">): boolean {
  const fam = detectAddonFamily(addon);
  return fam === "aiostreams";
}

export function isStatusOnlyAddon(addon: Pick<Addon, "manifest" | "transportUrl">): boolean {
  return detectAddonFamily(addon) === "aiostatus";
}

/**
 * Stremio's Local Files addon: the Stremio app hosts it on loopback (/local-addon). Compass
 * serves local files from its own library, so the addon can never answer here and querying
 * it only surfaces a spurious failure.
 */
export function isStremioLocalAddon(addon: Pick<Addon, "manifest" | "transportUrl">): boolean {
  const id = (addon.manifest.id ?? "").toLowerCase();
  const url = (addon.transportUrl ?? "").toLowerCase();
  return id === "org.stremio.local" || url.includes("/local-addon/");
}

/**
 * TorBox disabled its hosted Stremio addon (changelog v8.4.4) and removed the hostname from
 * DNS. TorBox playback and cache checks go through the debrid API instead, so the addon is
 * dead weight that would otherwise report "couldn't be reached" on every search.
 */
export function isRetiredTorboxAddon(addon: Pick<Addon, "manifest" | "transportUrl">): boolean {
  const id = (addon.manifest.id ?? "").toLowerCase();
  const url = (addon.transportUrl ?? "").toLowerCase();
  return id === "app.torbox.stremio" || url.includes("stremio.torbox.app");
}
