import { ChevronUp, ChevronDown } from 'lucide-react';

export type SortFieldType = 'name' | 'email' | 'created_at';
export type SortOrderType = 'asc' | 'desc';

interface SortHeaderIconProps {
  field: SortFieldType;
  currentSortBy: SortFieldType;
  currentSortOrder: SortOrderType;
}

export default function SortHeaderIcon({
  field,
  currentSortBy,
  currentSortOrder,
}: SortHeaderIconProps) {
  const isActive = currentSortBy === field;

  if (!isActive) {
    return (
      <span
        className="inline-flex flex-col ml-1 opacity-40 group-hover:opacity-70 transition-opacity"
        aria-hidden="true"
      >
        <ChevronUp size={12} className="-mb-1" />
        <ChevronDown size={12} className="-mt-1" />
      </span>
    );
  }

  const sortLabel = currentSortOrder === 'asc' ? '升序' : '降序';

  return (
    <>
      {currentSortOrder === 'asc' ? (
        <ChevronUp
          size={14}
          className="ml-1 text-blue-600"
          aria-hidden="true"
        />
      ) : (
        <ChevronDown
          size={14}
          className="ml-1 text-blue-600"
          aria-hidden="true"
        />
      )}
      <span className="sr-only">（当前{sortLabel}）</span>
    </>
  );
}
