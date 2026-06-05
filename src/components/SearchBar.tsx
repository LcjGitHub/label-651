import { Search, X } from 'lucide-react';
import { useState, useCallback, useEffect, useRef } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export default function SearchBar({ onSearch, placeholder = '搜索姓名或邮箱...' }: SearchBarProps) {
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

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
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
  );
}
