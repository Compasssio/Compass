export type CurfewRecord = { date: string; seconds: number; unlocked: boolean };

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function storageKey(id: string): string {
  return `compass.curfew.${id}`;
}

export function loadCurfew(id: string): CurfewRecord {
  const today = todayKey();
  try {
    const raw = localStorage.getItem(storageKey(id));
    if (!raw) return { date: today, seconds: 0, unlocked: false };
    const parsed = JSON.parse(raw) as Partial<CurfewRecord>;
    if (parsed.date !== today) return { date: today, seconds: 0, unlocked: false };
    return { date: today, seconds: parsed.seconds ?? 0, unlocked: !!parsed.unlocked };
  } catch {
    return { date: today, seconds: 0, unlocked: false };
  }
}

export function saveCurfew(id: string, rec: CurfewRecord): void {
  try {
    localStorage.setItem(storageKey(id), JSON.stringify(rec));
  } catch {
    return;
  }
}
