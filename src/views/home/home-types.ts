import type { Meta } from "@/lib/cinemeta";

export type HomeRow = {
  key: string;
  type: "movie" | "series";
  name: string;
  metas: Meta[];
  page: number;
  hasMore: boolean;
  noDedup?: boolean;
  fetcher?: (page: number) => Promise<Meta[]>;
  sourceRow?: import("@/lib/custom-sources").SourceRow;
};

export type RowSpec = {
  key: string;
  type: "movie" | "series";
  name: string;
  noDedup?: boolean;
  fetcher: (page: number) => Promise<Meta[]>;
};
