import { CommunityBrowseList, type BrowseMode } from "./community-browse-list";

export function BrowsePane({
  mode,
  category,
  search,
  allowAdult,
  installedIds,
  onOpen,
  onRefetch,
}: {
  mode: BrowseMode;
  category: string | null;
  search?: string | null;
  allowAdult?: boolean;
  installedIds: Set<string>;
  onOpen: (id: string) => void;
  onRefetch?: () => void;
}) {
  return (
    <CommunityBrowseList
      mode={mode}
      category={category}
      search={search}
      allowAdult={allowAdult}
      installedIds={installedIds}
      onOpen={onOpen}
      onChange={onRefetch}
    />
  );
}
