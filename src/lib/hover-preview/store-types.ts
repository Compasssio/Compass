import type { Meta } from "../cinemeta";
import type { PreviewAssembly, PreviewData } from "./preview-data";

export type HoverGates = {
  enabled: boolean;
  finePointer: boolean;
  viewClear: boolean;
  searchClosed: boolean;
  menuClosed: boolean;
};

export type AnchorRect = { left: number; top: number; width: number; height: number };

export type PreviewPayload = {
  meta: Meta;
  data: PreviewData;
  rect: AnchorRect;
};

export type HoverPreviewSnapshot = {
  status: "idle" | "open";
  closeMode: "soft" | "hard";
  openSeq: number;
  morphSeq: number;
  artSeq: number;
  payload: PreviewPayload | null;
};

export type Pending = {
  meta: Meta;
  el: HTMLElement;
  assembly: PreviewAssembly | null;
  intentTimer: number;
  dwellTimer: number;
  deadlineTimer: number;
};

export type Morph = {
  meta: Meta;
  el: HTMLElement;
  assembly: PreviewAssembly | null;
  settleTimer: number;
  deadlineTimer: number;
};
