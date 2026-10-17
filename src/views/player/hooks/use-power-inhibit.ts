import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { PlayerSnapshot } from "@/lib/player/bridge";

export function usePowerInhibit(snap: PlayerSnapshot) {
  const playing = snap.status === "playing";
  useEffect(() => {
    void invoke("power_inhibit", { on: playing }).catch(() => {});
    return () => {
      void invoke("power_inhibit", { on: false }).catch(() => {});
    };
  }, [playing]);
}
