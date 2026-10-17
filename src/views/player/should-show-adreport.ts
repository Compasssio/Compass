export function shouldShowAdReport(opts: {
  enabled: boolean;
  alwaysShow: boolean;
  isDirectStream: boolean;
  recentRelease: boolean;
}): boolean {
  if (opts.isDirectStream) return false;
  if (opts.alwaysShow) return true;
  if (!opts.enabled) return false;
  return opts.recentRelease;
}
