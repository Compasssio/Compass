import type { IptvChannel } from "./types";

export function headersFromChannel(ch: IptvChannel): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  const ua = ch.attrs["vlcopt-user-agent"] || ch.attrs["http-user-agent"];
  const ref = ch.attrs["vlcopt-referrer"] || ch.attrs["http-referrer"];
  const cookie = ch.attrs["vlcopt-cookie"];
  if (ua) out["User-Agent"] = ua;
  if (ref) out["Referer"] = ref;
  if (cookie) out["Cookie"] = cookie;
  return Object.keys(out).length > 0 ? out : undefined;
}
