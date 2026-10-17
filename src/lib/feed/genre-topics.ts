export type Topic = {
  id: string;
  title: string;
  kicker: string;
  keywords: string[];
  genreIds?: number[];
  voteCount?: number;
  mediaType?: "movie" | "tv";
};

export const GENRE_TOPICS: Record<string, Topic[]> = {
  Western: [
    {
      id: "spaghetti-westerns",
      title: "Spaghetti Westerns",
      kicker: "Leone, Corbucci, dust and dynamite",
      keywords: ["spaghetti western", "italian western"],
      voteCount: 5,
    },
    {
      id: "revisionist-westerns",
      title: "Revisionist Westerns",
      kicker: "The myth, reconsidered",
      keywords: ["revisionist western", "anti-western", "neo-western"],
      voteCount: 5,
    },
    {
      id: "outlaw-westerns",
      title: "Outlaws & Bounty Hunters",
      kicker: "Wanted dead or alive",
      keywords: ["outlaw", "bounty hunter", "gunslinger", "wild west"],
      voteCount: 10,
    },
  ],
  "Sci-Fi": [
    {
      id: "ufo-disclosure",
      title: "UFOs & Disclosure",
      kicker: "Sightings, contact, the unknown",
      keywords: ["ufo", "alien encounter", "extraterrestrial", "alien abduction"],
      genreIds: [99],
      voteCount: 3,
    },
    {
      id: "space-exploration",
      title: "Space Exploration",
      kicker: "Real journeys beyond Earth",
      keywords: ["space program", "nasa", "astronaut", "moon landing", "mars"],
      genreIds: [99],
      voteCount: 5,
    },
    {
      id: "ai-future",
      title: "AI & The Future",
      kicker: "Where machines are taking us",
      keywords: ["artificial intelligence", "robot", "cybernetic", "future"],
      genreIds: [99],
      voteCount: 5,
    },
  ],
  Horror: [
    {
      id: "true-paranormal",
      title: "Paranormal Cases",
      kicker: "Reportedly real",
      keywords: ["haunted house", "paranormal", "supernatural", "exorcism"],
      genreIds: [99],
      voteCount: 3,
    },
  ],
  Crime: [
    {
      id: "true-crime",
      title: "True Crime",
      kicker: "Real cases, real consequences",
      keywords: ["true crime", "serial killer", "investigation", "murder"],
      genreIds: [99],
      voteCount: 10,
    },
  ],
  Music: [
    {
      id: "concert-films",
      title: "Concert Films",
      kicker: "Front row seat",
      keywords: ["concert", "live performance", "music tour"],
      voteCount: 10,
    },
    {
      id: "music-docs",
      title: "Music Documentaries",
      kicker: "Behind the sound",
      keywords: ["musician", "band", "music industry"],
      genreIds: [99],
      voteCount: 8,
    },
  ],
  War: [
    {
      id: "wwii-docs",
      title: "WWII on Film",
      kicker: "The real footage",
      keywords: ["world war ii", "nazi", "holocaust"],
      genreIds: [99],
      voteCount: 8,
    },
    {
      id: "modern-war-docs",
      title: "Modern Warfare",
      kicker: "Wars of our time",
      keywords: ["iraq war", "afghanistan war", "vietnam war"],
      genreIds: [99],
      voteCount: 8,
    },
  ],
  History: [
    {
      id: "ancient-civ",
      title: "Ancient Civilizations",
      kicker: "Lost worlds rediscovered",
      keywords: ["ancient rome", "ancient egypt", "ancient greece", "archaeology"],
      genreIds: [99],
      voteCount: 5,
    },
  ],
};
