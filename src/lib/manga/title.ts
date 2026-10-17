/* Strips colored-release qualifiers from a manga title.
 *
 * A colored or "official colored" release is the same work on AniList and MAL,
 * which list only the base title, so a marker like "(Color)" breaks title
 * matching for sync and Discord poster lookups. Examples removed:
 *   (color) (official colored) [Full Color] (Color Version) (Color, Volume)
 *   （Color） 【Full Color】 (Colored) (Colourised)
 *
 * Only bracketed markers are removed, and only when the bracket contains
 * nothing but color words plus edition words/numbers. A title that uses
 * "color" as a real word - with or without brackets, e.g. "Color" or
 * "My Color Life" - is left untouched, since the bare word is never stripped.
 */

const OPENERS = "\\(\\[\\{｛【（";
const CLOSERS = "\\)\\]\\}｝】）";
const BRACKETED = new RegExp(`[${OPENERS}]\\s*([^${CLOSERS}]*?)\\s*[${CLOSERS}]`, "g");

const COLOR_WORDS = new Set([
  "color",
  "colour",
  "colored",
  "coloured",
  "colorized",
  "colorised",
]);

// Words that can accompany a color marker inside the same bracket without
// changing its meaning.
const EDITION_WORDS = new Set([
  "official",
  "full",
  "complete",
  "digital",
  "webtoon",
  "version",
  "ver",
  "volume",
  "vol",
  "edition",
]);

function isColorQualifier(inner: string): boolean {
  const tokens = inner.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  if (tokens.length === 0) return false;
  let hasColor = false;
  for (const token of tokens) {
    if (COLOR_WORDS.has(token)) {
      hasColor = true;
      continue;
    }
    if (EDITION_WORDS.has(token)) continue;
    if (/^\d+$/.test(token)) continue;
    return false;
  }
  return hasColor;
}

/** Removes bracketed color/edition markers from a title, or returns it as-is. */
export function stripColorTag(title: string): string {
  if (!title) return title;
  const stripped = title
    .replace(BRACKETED, (whole, inner: string) => (isColorQualifier(inner) ? "" : whole))
    .replace(/\s+/g, " ")
    .replace(/\s+([,;:.!?])/g, "$1")
    .replace(/[\s\-–—]+$/, "")
    .trim();
  return stripped || title;
}
