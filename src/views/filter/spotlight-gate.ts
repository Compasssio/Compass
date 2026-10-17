import { createContext } from "react";

export const MAX_PAGES = 30;
export const MIN_INITIAL_FILL = 12;
export const SPOTLIGHT_TIMEOUT_MS = 12000;
export const SPOTLIGHT_SELF_TIMEOUT_MS = 9000;

export type SpotlightGate = {
  ready: boolean;
  markDone: () => void;
};

export const SpotlightGateContext = createContext<SpotlightGate>({
  ready: true,
  markDone: () => {},
});
