import { type Meta } from "@/lib/cinemeta";
import { TV_GENRES } from "@/lib/feed/tags";
import { tmdbDiscover, tmdbSeriesRow, tmdbTrending } from "@/lib/providers/tmdb";

export type RowSpec = {
  key: string;
  title: string;
  fetcher: (page: number) => Promise<Meta[]>;
  noPaginate?: boolean;
};

export function showSpecs(key: string): RowSpec[] {
  return [
    {
      key: "trending",
      title: "Trending This Week",
      fetcher: (p) => tmdbTrending(key, "tv", "week", p),
    },
    {
      key: "on-the-air",
      title: "On Tonight",
      fetcher: (p) => tmdbSeriesRow(key, "on_the_air", p),
    },
    {
      key: "fresh",
      title: "Premiered This Month",
      fetcher: (p) =>
        tmdbDiscover(key, "tv", {
          "first_air_date.gte": isoDaysAgo(45),
          "first_air_date.lte": isoDaysAgo(0),
          "vote_count.gte": "20",
          sort_by: "popularity.desc",
          page: String(p),
        }),
    },
    {
      key: "net-hbo",
      title: "From HBO",
      fetcher: (p) =>
        tmdbDiscover(key, "tv", {
          with_networks: "49",
          "vote_count.gte": "200",
          sort_by: "popularity.desc",
          page: String(p),
        }),
    },
    {
      key: "net-netflix",
      title: "Netflix Originals",
      fetcher: (p) =>
        tmdbDiscover(key, "tv", {
          with_networks: "213",
          "vote_count.gte": "300",
          sort_by: "popularity.desc",
          page: String(p),
        }),
    },
    {
      key: "net-apple",
      title: "Apple TV+",
      fetcher: (p) =>
        tmdbDiscover(key, "tv", {
          with_networks: "2552",
          "vote_count.gte": "100",
          sort_by: "popularity.desc",
          page: String(p),
        }),
    },
    {
      key: "net-amc",
      title: "AMC",
      fetcher: (p) =>
        tmdbDiscover(key, "tv", {
          with_networks: "174",
          "vote_count.gte": "200",
          sort_by: "popularity.desc",
          page: String(p),
        }),
    },
    {
      key: "net-fx",
      title: "FX",
      fetcher: (p) =>
        tmdbDiscover(key, "tv", {
          with_networks: "88",
          "vote_count.gte": "200",
          sort_by: "popularity.desc",
          page: String(p),
        }),
    },
    {
      key: "net-disney",
      title: "Disney+ Originals",
      fetcher: (p) =>
        tmdbDiscover(key, "tv", {
          with_networks: "2739",
          "vote_count.gte": "100",
          sort_by: "popularity.desc",
          page: String(p),
        }),
    },
    {
      key: "net-amazon",
      title: "Prime Video",
      fetcher: (p) =>
        tmdbDiscover(key, "tv", {
          with_networks: "1024",
          "vote_count.gte": "200",
          sort_by: "popularity.desc",
          page: String(p),
        }),
    },
    {
      key: "limited",
      title: "Limited Series & Miniseries",
      fetcher: (p) =>
        tmdbDiscover(key, "tv", {
          with_type: "2",
          "vote_average.gte": "7.5",
          "vote_count.gte": "300",
          sort_by: "vote_count.desc",
          page: String(p),
        }),
    },
    {
      key: "prestige-drama",
      title: "Prestige Drama",
      fetcher: (p) =>
        tmdbDiscover(key, "tv", {
          with_genres: String(TV_GENRES.Drama),
          "vote_average.gte": "8.0",
          "vote_count.gte": "1000",
          sort_by: "vote_average.desc",
          page: String(p),
        }),
    },
    {
      key: "comedy",
      title: "Comedy Series",
      fetcher: (p) =>
        tmdbDiscover(key, "tv", {
          with_genres: String(TV_GENRES.Comedy),
          "vote_average.gte": "7.6",
          "vote_count.gte": "500",
          sort_by: "popularity.desc",
          page: String(p),
        }),
    },
    {
      key: "crime",
      title: "Crime & Mystery",
      fetcher: (p) =>
        tmdbDiscover(key, "tv", {
          with_genres: String(TV_GENRES.Crime),
          "vote_average.gte": "7.5",
          "vote_count.gte": "500",
          sort_by: "vote_average.desc",
          page: String(p),
        }),
    },
    {
      key: "scifi",
      title: "Sci-Fi & Fantasy",
      fetcher: (p) =>
        tmdbDiscover(key, "tv", {
          with_genres: String(TV_GENRES["Sci-Fi & Fantasy"]),
          "vote_average.gte": "7.5",
          "vote_count.gte": "500",
          sort_by: "popularity.desc",
          page: String(p),
        }),
    },
    {
      key: "doc-series",
      title: "Documentary Series",
      fetcher: (p) =>
        tmdbDiscover(key, "tv", {
          with_genres: String(TV_GENRES.Documentary),
          "vote_average.gte": "7.5",
          "vote_count.gte": "100",
          sort_by: "vote_average.desc",
          page: String(p),
        }),
    },
    {
      key: "all-time",
      title: "All-Time Great Series",
      fetcher: (p) => tmdbSeriesRow(key, "top_rated", p),
    },
    {
      key: "long-runners",
      title: "Iconic Long-Runners",
      fetcher: (p) =>
        tmdbDiscover(key, "tv", {
          "vote_average.gte": "7.8",
          "vote_count.gte": "500",
          "first_air_date.lte": "2010-12-31",
          sort_by: "vote_count.desc",
          page: String(p),
        }),
    },
    {
      key: "kdrama",
      title: "K-Drama",
      fetcher: (p) =>
        tmdbDiscover(key, "tv", {
          with_origin_country: "KR",
          "vote_average.gte": "7.5",
          "vote_count.gte": "100",
          sort_by: "popularity.desc",
          page: String(p),
        }),
    },
    {
      key: "british",
      title: "British Television",
      fetcher: (p) =>
        tmdbDiscover(key, "tv", {
          with_origin_country: "GB",
          "vote_average.gte": "7.5",
          "vote_count.gte": "300",
          sort_by: "vote_average.desc",
          page: String(p),
        }),
    },
  ];
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
