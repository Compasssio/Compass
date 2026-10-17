import { dispatchTvNav } from "@/lib/keyboard-navigation";
import type { RemoteNavKey } from "./protocol";

/** Phone touchpad → host library focus (select/back are imperative; arrows reuse key nav). */
export function injectHostNav(key: RemoteNavKey): void {
  if (typeof window === "undefined") return;
  dispatchTvNav(key);
}
