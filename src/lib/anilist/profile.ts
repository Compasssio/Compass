import { fetchViewer } from "./queries";
import { getSession, setSession } from "./session";

export async function fetchAnilistAvatar(): Promise<string | null> {
  const session = getSession();
  if (!session) return null;
  try {
    const viewer = await fetchViewer(session.accessToken);
    if (viewer.avatar && viewer.avatar !== session.avatar) {
      setSession({ ...session, avatar: viewer.avatar });
    }
    return viewer.avatar;
  } catch {
    return session.avatar ?? null;
  }
}
