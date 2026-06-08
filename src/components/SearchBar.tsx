import { Search, X, Filter, XCircle } from 'lucide-react';
import { useState, useCallback, useEffect, useRef } from 'react';

export interface FilterTag {
  key: string;
  label: string;
  value: string;
}

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  onToggleFilter?: () => void;
  filterOpen?: boolean;
  activeFilters?: FilterTag[];
  onRemoveFilter?: (key: string) => void;
  onClearAllFilters?: () => void;
}

export default function SearchBar({
  onSearch,
  placeholder = '搜索姓名或邮箱...',
  onToggleFilter,
  filterOpen = false,
  activeFilters = [],
  onRemoveFilter,
  onClearAllFilters,
}: SearchBarProps) {
  const [value, setValue] = useState('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedSearch = useCallback(
    (query: string) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        onSearch(query);
      }, 300);
    },
    [onSearch]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    debouncedSearch(newValue);
  };

  const handleClear = () => {
    setValue('');
    onSearch('');
  };

  const hasActiveFilters = activeFilters.length > 0;

  return (
    <div className="w-full">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <div className="relative w-full">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              value={value}
              onChange={handleChange}
              placeholder={placeholder}
              className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         transition-all duration-200 text-sm placeholder-gray-400"
            />
            {value && (
              <button
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400
                           hover:text-gray-600 transition-colors duration-150"
                aria-label="清除搜索"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {onToggleFilter && (
          <button
            onClick={onToggleFilter}
            className={`inline-flex items-center gap-2 px-4 py-2.5 border rounded-lg font-medium text-sm
                       transition-all duration-200 shadow-sm ${
                         filterOpen || hasActiveFilters
                           ? 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
                           : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                       }`}
          >
            <Filter size={16} />
            高级筛选
            {hasActiveFilters && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5
                             bg-blue-600 text-white text-xs font-semibold rounded-full">
                {activeFilters.length}
              </span>
            )}
          </button>
        )}
      </div>

      {hasActiveFilters && (
        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs text-gray-500 flex-shrink-0">已选筛选：</span>
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {activeFilters.map((filter) => (
              <span
                key={filter.key}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700
                           rounded-full text-xs font-medium border border-blue-200"
              >
                {filter.label}
                {onRemoveFilter && (
                  <button
                    onClick={() => onRemoveFilter(filter.key)}
                    className="hover:text-blue-900 transition-colors"
                  >
                    <XCircle size={14} />
                  </button>
                )}
              </span>
            ))}
          </div>
          {onClearAllFilters && (
            <button
              onClick={onClearAllFilters}
              className="text-xs text-gray-500 hover:text-red-600 transition-colors
                         flex-shrink-0 ml-1"
            >
              清空全部
            </button>
          )}
        </div>
      )}
    </div>
  );
}
