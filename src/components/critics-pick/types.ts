import type { CriticData } from "@/lib/providers/tmdb";

export type CastMember = CriticData["cast"][number];
export type PersonRef = { id: number; name: string };

export type LightboxState = {
  images: string[];
  startIndex: number;
  title: string;
};
