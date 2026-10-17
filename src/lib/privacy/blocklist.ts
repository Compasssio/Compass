const BLOCKED_HOSTS = new Set<string>([
  "google-analytics.com",
  "www.google-analytics.com",
  "ssl.google-analytics.com",
  "analytics.google.com",
  "googletagmanager.com",
  "www.googletagmanager.com",
  "googletagservices.com",
  "www.googletagservices.com",
  "doubleclick.net",
  "stats.g.doubleclick.net",
  "ad.doubleclick.net",
  "adservice.google.com",
  "pagead2.googlesyndication.com",
  "googleads.g.doubleclick.net",
  "tpc.googlesyndication.com",
  "adsystem.google.com",
  "mc.yandex.com",
  "mc.yandex.ru",
  "metrika.yandex.ru",
  "an.yandex.ru",
  "connect.facebook.net",
  "pixel.facebook.com",
  "graph.facebook.com",
  "analytics.tiktok.com",
  "static.ads-twitter.com",
  "analytics.twitter.com",
  "scorecardresearch.com",
  "sb.scorecardresearch.com",
  "quantserve.com",
  "secure.quantserve.com",
  "histats.com",
  "s10.histats.com",
  "s4.histats.com",
  "hotjar.com",
  "static.hotjar.com",
  "script.hotjar.com",
  "mixpanel.com",
  "api.mixpanel.com",
  "cdn.mxpnl.com",
  "amplitude.com",
  "api.amplitude.com",
  "cdn.amplitude.com",
  "segment.com",
  "api.segment.io",
  "cdn.segment.com",
  "fullstory.com",
  "rs.fullstory.com",
  "matomo.org",
  "stats.wp.com",
  "pixel.wp.com",
  "bat.bing.com",
  "clarity.ms",
  "www.clarity.ms",
  "branch.io",
  "app.link",
  "adsrvr.org",
  "ib.adnxs.com",
  "rubiconproject.com",
  "pubmatic.com",
  "casalemedia.com",
  "criteo.com",
  "criteo.net",
  "taboola.com",
  "outbrain.com",
  "popads.net",
  "popcash.net",
  "propellerads.com",
  "onclickads.net",
  "onclkds.com",
  "adcash.com",
  "exoclick.com",
  "exosrv.com",
  "juicyads.com",
  "trafficjunky.com",
  "trafficjunky.net",
  "adsterra.com",
  "adskeeper.com",
  "mgid.com",
  "revcontent.com",
  "hilltopads.net",
  "clickadu.com",
  "ad-maven.com",
  "vidoomy.com",
  "kettledroopingcontinuation.com",
]);

const BLOCKED_SUFFIXES = [
  ".doubleclick.net",
  ".google-analytics.com",
  ".googlesyndication.com",
  ".googletagmanager.com",
  ".googletagservices.com",
  ".scorecardresearch.com",
  ".quantserve.com",
  ".moatads.com",
  ".adsafeprotected.com",
  ".serving-sys.com",
  ".adnxs.com",
  ".rubiconproject.com",
  ".pubmatic.com",
  ".casalemedia.com",
  ".criteo.com",
  ".criteo.net",
  ".taboola.com",
  ".outbrain.com",
  ".adsrvr.org",
  ".popads.net",
  ".propellerads.com",
  ".adsterra.com",
  ".exoclick.com",
  ".exosrv.com",
  ".juicyads.com",
  ".trafficjunky.net",
  ".mgid.com",
  ".hotjar.com",
  ".mixpanel.com",
  ".amplitude.com",
  ".segment.io",
  ".segment.com",
  ".fullstory.com",
  ".branch.io",
  ".clarity.ms",
  ".yandex.ru",
];

let enabled = true;
let blockedCount = 0;
const listeners = new Set<() => void>();

export function setTrackerBlocking(on: boolean): void {
  enabled = on;
}

export function isBlockedHost(host: string): boolean {
  if (!enabled) return false;
  const h = host.toLowerCase();
  if (BLOCKED_HOSTS.has(h)) return true;
  return BLOCKED_SUFFIXES.some((s) => h.endsWith(s));
}

export function isBlockedUrl(url: string): boolean {
  if (!enabled) return false;
  try {
    return isBlockedHost(new URL(url).hostname);
  } catch {
    return false;
  }
}

export function noteBlocked(): void {
  blockedCount += 1;
  listeners.forEach((l) => l());
}

export function blockedTrackerCount(): number {
  return blockedCount;
}

export function subscribeBlockedTrackers(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export class TrackerBlockedError extends Error {
  constructor(host: string) {
    super(`Blocked tracker request: ${host}`);
    this.name = "TrackerBlockedError";
  }
}
