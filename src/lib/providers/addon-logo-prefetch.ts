import { BOAT_ADDON_LOGOS } from "@/components/addon-logo";

function shuffled(): string[] {
  const a = BOAT_ADDON_LOGOS.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function prefetchedTopAddonLogos(): string[] {
  return shuffled();
}

export function prefetchTopAddonLogos(): Promise<string[]> {
  return Promise.resolve(shuffled());
}
