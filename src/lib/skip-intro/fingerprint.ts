import type { PlayerStreamRef } from "@/lib/view";

export function contentKey(metaId: string, imdbId: string | null): string {
  if (imdbId && imdbId.startsWith("tt")) return imdbId;
  return metaId;
}

function urlRip(url: string): string {
  try {
    const u = new URL(url);
    return `${u.host}${u.pathname}`.toLowerCase();
  } catch {
    return url.slice(0, 120).toLowerCase();
  }
}

export function sourceKey(streamRef: PlayerStreamRef | undefined, url: string): string {
  const hash = streamRef?.infoHash?.toLowerCase();
  if (hash) return `ih_${hash}_${streamRef?.fileIdx ?? 0}`;
  const group = streamRef?.releaseGroup?.toLowerCase().trim() ?? "";
  const size = streamRef?.size ?? 0;
  const title = streamRef?.parsedTitle?.toLowerCase().trim() ?? "";
  if (group || size || title) return `rg_${group}_${size}_${title}`;
  return `u_${urlRip(url)}`;
}

export function fingerprint(
  metaId: string,
  imdbId: string | null,
  streamRef: PlayerStreamRef | undefined,
  url: string,
): { content: string; source: string } {
  return { content: contentKey(metaId, imdbId), source: sourceKey(streamRef, url) };
}
