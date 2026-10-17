export function EpisodeGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid gap-x-4 gap-y-6 [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2.5">
          <div className="aspect-video animate-pulse rounded-xl bg-elevated/40" />
          <div className="h-3 w-3/4 animate-pulse rounded bg-elevated/40" />
          <div className="h-2.5 w-2/5 animate-pulse rounded bg-elevated/30" />
        </div>
      ))}
    </div>
  );
}
