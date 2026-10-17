const KEY = "compass.profiles.v1";

type MinimalProfile = { id: string; isPrimary?: boolean };
type MinimalState = { profiles?: MinimalProfile[]; activeId?: string | null };

function readState(): MinimalState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MinimalState;
  } catch {
    return null;
  }
}

export function activeProfileId(): string {
  const s = readState();
  return s?.activeId || "default";
}

export function activeProfileIsPrimary(): boolean {
  const s = readState();
  if (!s || !Array.isArray(s.profiles) || s.profiles.length === 0) return true;
  const active = s.profiles.find((p) => p.id === s.activeId);
  return active?.isPrimary === true;
}
