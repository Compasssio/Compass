import type { IptvPlaylistSource } from "../types";
import type { XtreamCreds } from "../xtream";
import { credsFromSource } from "./xtream-creds";

export type ProviderShape =
  | { kind: "xtream"; creds: XtreamCreds }
  | { kind: "m3u"; url: string; middleware: boolean }
  | { kind: "epg"; url: string }
  | { kind: "invalid"; reason: string };

const MIDDLEWARE_PATH_RE = /\/(iptv|m3u|playlist|xmltv|threadfin|xteve)\b/i;
const RAW_M3U_RE = /\.m3u8?(\?|$)/i;

export function detectProviderShape(src: IptvPlaylistSource): ProviderShape {
  if ((src.kind ?? "m3u") === "epg") {
    const url = (src.epgUrl || src.url || "").trim();
    if (!url) return { kind: "invalid", reason: "EPG source has no URL." };
    return { kind: "epg", url };
  }

  const creds = credsFromSource(src);
  if (creds || src.kind === "xtream") {
    if (creds) return { kind: "xtream", creds };
    return {
      kind: "invalid",
      reason: "Xtream credentials are incomplete. Check the server URL, username, and password.",
    };
  }

  const url = (src.url || "").trim();
  if (!url) return { kind: "invalid", reason: "Playlist source has no URL." };
  if (!/^https?:\/\//i.test(url)) {
    return {
      kind: "invalid",
      reason: "That does not look like a playlist URL. Use an http(s) M3U link or Xtream server.",
    };
  }

  const middleware = isMiddlewareUrl(url);
  return { kind: "m3u", url, middleware };
}

function isMiddlewareUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (RAW_M3U_RE.test(u.pathname)) return false;
    if (MIDDLEWARE_PATH_RE.test(u.pathname)) return true;
    const isBareHost = u.pathname === "/" || u.pathname === "";
    return isBareHost && !u.search;
  } catch {
    return false;
  }
}
