import { useSyncExternalStore } from "react";

export type ActiveAddon = { id: string; name: string };

let current: ActiveAddon | null = null;
const listeners = new Set<() => void>();

export function setActiveAddon(addon: ActiveAddon | null) {
  if (current === addon) return;
  if (current && addon && current.id === addon.id && current.name === addon.name) return;
  current = addon;
  for (const l of listeners) l();
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useActiveAddon(): ActiveAddon | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => current,
  );
}
