import { useEffect, useState } from "react";
import {
  fetchRankList,
  fetchRankManifest,
  peekRankSnapshot,
  type CompassRankExplanation,
  type PeopleDept,
} from "./compass-rank";
import type { BrandPerson } from "./providers/tmdb/tmdb-brands";

export type CountryFace = BrandPerson & { local: number };

export type CountryPeople = { faces: CountryFace[]; directors: CountryFace[] };

const EMPTY: CountryPeople = { faces: [], directors: [] };

const DEPT_FLOOR = 10;
const HEAD = 20;
const SHOWN = 16;
const MIN_FACES = 8;

function adapt(list: CompassRankExplanation[]): CountryFace[] {
  const faces = list
    .slice(0, HEAD)
    .filter((p) => !!p.profilePath)
    .slice(0, SHOWN)
    .map((p) => ({
      id: p.id,
      name: p.name,
      character: "",
      profilePath: p.profilePath,
      order: p.rank,
      titles: p.ratedTitles,
      local: p.localTitles ?? 0,
    }));
  return faces.length >= MIN_FACES ? faces : [];
}

async function department(iso: string, dept: PeopleDept, declared: number): Promise<CountryFace[]> {
  if (declared < DEPT_FLOOR) return [];
  const result = await fetchRankList("compass", dept, iso.toLowerCase());
  return result && result.source === "compass" ? adapt(result.list) : [];
}

function peek(iso: string, dept: PeopleDept): CountryFace[] {
  const snap = peekRankSnapshot("compass", dept, iso.toLowerCase());
  return snap && snap.source === "compass" ? adapt(snap.list) : [];
}

export function useCountryPeople(iso: string): CountryPeople {
  const [people, setPeople] = useState<CountryPeople>(EMPTY);
  useEffect(() => {
    let alive = true;
    setPeople({ faces: peek(iso, "Acting"), directors: peek(iso, "Directing") });
    void (async () => {
      const manifest = await fetchRankManifest();
      const entry = manifest?.countries?.find((c) => c.code?.toUpperCase() === iso.toUpperCase());
      if (!alive || !entry?.code) return;
      const code = entry.code;
      const [faces, directors] = await Promise.all([
        department(code, "Acting", entry.depts?.Acting ?? 0),
        department(code, "Directing", entry.depts?.Directing ?? 0),
      ]);
      if (alive) setPeople({ faces, directors });
    })();
    return () => {
      alive = false;
    };
  }, [iso]);
  return people;
}
