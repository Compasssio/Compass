const KEY = "compass.lastseason.v1";

type SeasonMap = Record<string, number>;

function load(): SeasonMap {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as SeasonMap;
  } catch {
    return {};
  }
}

export function getLastSeason(metaId: string): number | null {
  const value = load()[metaId];
  return typeof value === "number" ? value : null;
}

export function setLastSeason(metaId: string, season: number): void {
  try {
    const map = load();
    map[metaId] = season;
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    return;
  }
}
