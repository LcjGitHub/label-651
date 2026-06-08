import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
}

export default function MultiSelect({
  options,
  value,
  onChange,
  placeholder = '请选择',
  className = '',
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  const handleRemove = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== optionValue));
  };

  const selectedLabels = options
    .filter((o) => value.includes(o.value))
    .map((o) => o.label);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full min-h-[42px] px-3 py-2 bg-white border border-gray-300 rounded-lg
                   cursor-pointer flex items-center justify-between gap-2
                   hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500
                   focus:border-transparent transition-all duration-200"
      >
        <div className="flex flex-wrap gap-1 flex-1">
          {selectedLabels.length > 0 ? (
            selectedLabels.map((label, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700
                           rounded text-xs font-medium"
              >
                {label}
                <button
                  onClick={(e) => handleRemove(value[index], e)}
                  className="hover:text-blue-900 transition-colors"
                >
                  <X size={12} />
                </button>
              </span>
            ))
          ) : (
            <span className="text-gray-400 text-sm">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          size={18}
        />
      </div>

      {isOpen && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200
                        rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto">
          {options.map((option) => {
            const isSelected = value.includes(option.value);
            return (
              <div
                key={option.value}
                onClick={() => handleToggle(option.value)}
                className={`px-3 py-2.5 cursor-pointer flex items-center gap-3 text-sm
                           hover:bg-gray-50 transition-colors ${
                             isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                           }`}
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center
                             transition-colors ${
                               isSelected
                                 ? 'bg-blue-600 border-blue-600 text-white'
                                 : 'border-gray-300'
                             }`}
                >
                  {isSelected && <Check size={12} />}
                </div>
                <span>{option.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
