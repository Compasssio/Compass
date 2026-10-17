import { Transport } from "@/components/player/transport";
import { MinimalShell } from "@/components/player/shells/minimal-shell";
import type { PlayerShellMeta } from "./types";

export const PLAYER_SHELLS: PlayerShellMeta[] = [
  {
    id: "default",
    name: "Compass default",
    description: "The full transport bar Compass ships with.",
    Component: Transport,
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Title, play / pause, and a thin seek bar. Everything else hidden.",
    Component: MinimalShell,
  },
];

export function getPlayerShell(id: string): PlayerShellMeta {
  return PLAYER_SHELLS.find((s) => s.id === id) ?? PLAYER_SHELLS[0];
}

export type { PlayerShellMeta, PlayerShellProps } from "./types";
