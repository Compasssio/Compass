export const DERIVED_ANILIST_FORMATS = new Set(["SPECIAL", "OVA", "ONA", "MUSIC"]);

export function isDerivedAnimeFormat(format?: string): boolean {
  return format != null && DERIVED_ANILIST_FORMATS.has(format.toUpperCase());
}
