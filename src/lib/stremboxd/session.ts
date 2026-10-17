import type { LetterboxdSession } from "./types";

const STORAGE_KEY = "compass.letterboxd.session.v1";

const subscribers = new Set<() => void>();
let cached: LetterboxdSession | null = null;
let loaded = false;

function read(): LetterboxdSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LetterboxdSession;
    if (
      typeof parsed?.userToken === "string" &&
      typeof parsed?.userId === "string" &&
      typeof parsed?.username === "string" &&
      typeof parsed?.loginAt === "number"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function write(session: LetterboxdSession | null): void {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
}

function ensureLoaded(): void {
  if (loaded) return;
  loaded = true;
  cached = read();
}

export function getLetterboxdSession(): LetterboxdSession | null {
  ensureLoaded();
  return cached;
}

export function setLetterboxdSession(session: LetterboxdSession | null): void {
  ensureLoaded();
  cached = session;
  write(session);
  for (const fn of subscribers) fn();
}

export function subscribeLetterboxdSession(fn: () => void): () => void {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}
