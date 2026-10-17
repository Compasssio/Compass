import type { Meta } from "@/lib/cinemeta";

export function listPager(items: Meta[], pageSize = 40): (page: number) => Promise<Meta[]> {
  return (page) => Promise.resolve(items.slice((page - 1) * pageSize, page * pageSize));
}
