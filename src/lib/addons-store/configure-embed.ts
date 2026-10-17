import { safeFetch } from "@/lib/safe-fetch";

/**
 * Addon configure pages are embedded in the installer viewport. A page that forbids
 * framing (X-Frame-Options, or CSP frame-ancestors) renders Chromium's "refused to
 * connect" error inside the iframe, and that error page still fires the iframe's load
 * event — so the slow-load fallback never appears and the user is stuck looking at the
 * error. Preflight the response headers and send those addons down the browser path.
 */

const PROBE_TIMEOUT_MS = 6_000;

export type FramePolicyHeaders = {
  xFrameOptions?: string | null;
  contentSecurityPolicy?: string | null;
};

export function framesAllowedByHeaders(headers: FramePolicyHeaders): boolean {
  // DENY and SAMEORIGIN both refuse Compass's packaged origin (tauri://localhost).
  if (headers.xFrameOptions?.trim()) return false;
  const ancestors = frameAncestorsOf(headers.contentSecurityPolicy ?? "");
  return ancestors === null || ancestors.includes("*");
}

function frameAncestorsOf(csp: string): string | null {
  for (const directive of csp.split(";")) {
    const [name, ...sources] = directive.trim().split(/\s+/);
    if (name?.toLowerCase() === "frame-ancestors") return sources.join(" ").toLowerCase();
  }
  return null;
}

async function probe(url: string, method: "HEAD" | "GET"): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    return await safeFetch(url, { method, signal: controller.signal, redirect: "follow" });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * True when the page can be embedded. Unknown outcomes stay embeddable so a probe that
 * cannot answer (offline, blocked, non-Tauri web build without header access) never
 * hides a page that would have loaded.
 */
export async function canEmbedConfigurePage(url: string): Promise<boolean> {
  const head = await probe(url, "HEAD");
  const usable = !head ? null : head.ok ? head : await probe(url, "GET");
  if (!usable) return true;
  return framesAllowedByHeaders({
    xFrameOptions: usable.headers.get("x-frame-options"),
    contentSecurityPolicy: usable.headers.get("content-security-policy"),
  });
}
