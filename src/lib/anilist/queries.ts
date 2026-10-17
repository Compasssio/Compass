import { anilistRequest } from "./client";
import type { AnilistViewer } from "./types";

const VIEWER_QUERY = `query { Viewer { id name avatar { large medium } siteUrl } }`;

type ViewerResponse = {
  Viewer: {
    id: number;
    name: string;
    avatar: { large: string | null; medium: string | null } | null;
    siteUrl: string | null;
  };
};

export async function fetchViewer(accessToken: string): Promise<AnilistViewer> {
  const data = await anilistRequest<ViewerResponse>(VIEWER_QUERY, {}, accessToken);
  const v = data.Viewer;
  return {
    id: v.id,
    name: v.name,
    avatar: v.avatar?.large ?? v.avatar?.medium ?? null,
    siteUrl: v.siteUrl,
  };
}
