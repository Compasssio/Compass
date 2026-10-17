import type { DebridSlug, ParsedStream } from "../types";

export function isCachedOnActive(s: ParsedStream, active: DebridSlug[]): boolean {
  return active.some((slug) => s.cached[slug] === true);
}
