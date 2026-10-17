import type { BadgeKind } from "@/components/format-badge";
import type {
  CustomFilterAudio,
  CustomFilterCodec,
  CustomFilterResolution,
  CustomFilterSource,
} from "@/lib/streams/custom-filters";

export type BadgeDimension = "resolution" | "source" | "codec" | "audio";

const RESOLUTION_BADGE: Partial<Record<CustomFilterResolution, BadgeKind>> = {
  "4K": "4k-uhd",
  "1080p": "1080p",
  "720p": "720p",
  "480p": "480p",
  SD: "sd",
};

const SOURCE_BADGE: Partial<Record<CustomFilterSource, BadgeKind>> = {
  BluRay: "bluray",
  REMUX: "remux",
  "WEB-DL": "webdl",
  WEBRip: "webrip",
  BDRip: "bluray",
  HDRip: "webrip",
  DVDRip: "dvd",
  HDTV: "hdtv",
  CAM: "cam",
  TS: "telesync",
  HDTS: "hdts",
  TC: "telecine",
  SCR: "scr",
};

const CODEC_BADGE: Partial<Record<CustomFilterCodec, BadgeKind>> = {
  HEVC: "hevc",
  AV1: "av1",
};

const AUDIO_BADGE: Partial<Record<CustomFilterAudio, BadgeKind>> = {
  Atmos: "atmos",
  TrueHD: "truehd",
  "DTS-HD MA": "dts-hd-ma",
  DTS: "dts",
  "DD+": "ddp",
  AC3: "ac3",
  AAC: "aac",
  Opus: "opus",
  FLAC: "flac",
};

const TOOLTIP_KINDS = new Set<BadgeKind>(["cam", "telesync", "telecine", "no-label", "unknown"]);

export function badgeFor(dimension: BadgeDimension, value: string): BadgeKind | null {
  let kind: BadgeKind | null;
  if (dimension === "resolution") kind = RESOLUTION_BADGE[value as CustomFilterResolution] ?? null;
  else if (dimension === "source") kind = SOURCE_BADGE[value as CustomFilterSource] ?? null;
  else if (dimension === "codec") kind = CODEC_BADGE[value as CustomFilterCodec] ?? null;
  else kind = AUDIO_BADGE[value as CustomFilterAudio] ?? null;
  if (kind && TOOLTIP_KINDS.has(kind)) return null;
  return kind;
}

export function facetBadge(dimKey: string, value: string): BadgeKind | null {
  if (dimKey === "resolution") return badgeFor("resolution", value);
  if (dimKey === "source") return badgeFor("source", value === "Remux" ? "REMUX" : value);
  if (dimKey === "codec") return badgeFor("codec", value);
  if (dimKey === "audio") return badgeFor("audio", value === "DTS-HD" ? "DTS-HD MA" : value);
  if (dimKey === "hdr") return value === "HDR" ? "hdr" : null;
  return null;
}
