import { Search, X, Filter, XCircle, Clock, Trash2 } from 'lucide-react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { SearchHistory } from '@/types';

export interface FilterTag {
  key: string;
  label: string;
  value: string;
}

export interface HistoryFilters {
  statuses?: string[];
  created_at_start?: string;
  created_at_end?: string;
  phone_prefix?: string;
}

const formatHistoryLabel = (item: SearchHistory): string => {
  const parts: string[] = [];
  if (item.keyword && item.keyword.trim()) {
    parts.push(item.keyword.trim());
  }
  const filters = item.filters as HistoryFilters;
  if (filters) {
    if (filters.statuses && filters.statuses.length > 0) {
      const labels = filters.statuses.map((s) => (s === 'active' ? '启用' : '禁用'));
      parts.push(`状态:${labels.join('/')}`);
    }
    if (filters.created_at_start || filters.created_at_end) {
      const start = filters.created_at_start || '不限';
      const end = filters.created_at_end || '不限';
      parts.push(`${start}至${end}`);
    }
    if (filters.phone_prefix && filters.phone_prefix.trim()) {
      parts.push(`前缀:${filters.phone_prefix}`);
    }
  }
  return parts.length > 0 ? parts.join(' · ') : '(空搜索)';
};

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  onToggleFilter?: () => void;
  filterOpen?: boolean;
  activeFilters?: FilterTag[];
  onRemoveFilter?: (key: string) => void;
  onClearAllFilters?: () => void;
  searchHistory?: SearchHistory[];
  onApplyHistory?: (item: SearchHistory) => void;
  onDeleteHistory?: (id: number) => void;
  onClearHistory?: () => void;
}

export default function SearchBar({
  onSearch,
  placeholder = '搜索姓名或邮箱...',
  onToggleFilter,
  filterOpen = false,
  activeFilters = [],
  onRemoveFilter,
  onClearAllFilters,
  searchHistory = [],
  onApplyHistory,
  onDeleteHistory,
  onClearHistory,
}: SearchBarProps) {
  const [value, setValue] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowHistory(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  const handleFocus = () => {
    if (searchHistory.length > 0) {
      setShowHistory(true);
    }
  };

  const handleApplyHistory = (item: SearchHistory) => {
    setValue(item.keyword || '');
    setShowHistory(false);
    if (onApplyHistory) {
      onApplyHistory(item);
    }
  };

  const handleDeleteHistory = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (onDeleteHistory) {
      onDeleteHistory(id);
    }
  };

  const handleClearAllHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClearHistory) {
      onClearHistory();
    }
  };

  const hasActiveFilters = activeFilters.length > 0;
  const hasHistory = searchHistory.length > 0;

  return (
    <div className="w-full" ref={containerRef}>
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
              onFocus={handleFocus}
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

          {showHistory && hasHistory && (
            <div className="absolute z-20 top-full mt-2 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600">
                  <Clock size={12} />
                  搜索历史
                </span>
                {onClearHistory && (
                  <button
                    onClick={handleClearAllHistory}
                    className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={12} />
                    清空全部
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto py-1">
                {searchHistory.map((item) => (
                  <div
                    key={item.id}
                    className="group flex items-center justify-between px-3 py-2 hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => handleApplyHistory(item)}
                  >
                    <span className="flex-1 text-sm text-gray-700 truncate pr-2">
                      {formatHistoryLabel(item)}
                    </span>
                    {onDeleteHistory && (
                      <button
                        onClick={(e) => handleDeleteHistory(e, item.id)}
                        className="flex-shrink-0 p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all rounded hover:bg-red-50"
                        aria-label="删除历史记录"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
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
