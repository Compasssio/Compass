import type { Codec } from "../types";

export function mapCodec(c: string): Codec {
  const lower = c.toLowerCase();
  if (lower.includes("265") || lower === "hevc") return "HEVC";
  if (lower.includes("264") || lower === "avc") return "AVC";
  if (lower.includes("av1")) return "AV1";
  if (lower.includes("vp9")) return "VP9";
  if (lower.includes("mpeg")) return "MPEG2";
  return "Other";
}
