import type { Resolution } from "../types";

export function mapResolution(r?: string): Resolution {
  if (!r) return "SD";
  const lower = r.toLowerCase();
  if (lower.includes("2160") || lower === "4k" || lower === "uhd") return "4K";
  if (lower.includes("1080")) return "1080p";
  if (lower.includes("720")) return "720p";
  if (lower.includes("480")) return "480p";
  return "SD";
}
