import { malRequest } from "./client";

type MalProfile = {
  name: string;
  picture: string | null;
};

export async function fetchMalAvatar(): Promise<string | null> {
  try {
    const profile = await malRequest<MalProfile>("/users/@me");
    return profile.picture ?? null;
  } catch {
    return null;
  }
}
