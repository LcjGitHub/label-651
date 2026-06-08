import { Calendar, X } from 'lucide-react';

export interface DateRangeValue {
  start: string;
  end: string;
}

interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  className?: string;
}

export default function DateRangePicker({
  value,
  onChange,
  className = '',
}: DateRangePickerProps) {
  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = e.target.value;
    if (value.end && newStart && newStart > value.end) {
      onChange({ start: newStart, end: newStart });
    } else {
      onChange({ ...value, start: newStart });
    }
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEnd = e.target.value;
    if (value.start && newEnd && newEnd < value.start) {
      onChange({ start: newEnd, end: newEnd });
    } else {
      onChange({ ...value, end: newEnd });
    }
  };

  const handleClearStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange({ ...value, start: '' });
  };

  const handleClearEnd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange({ ...value, end: '' });
  };

  const formatDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    return dateStr;
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative flex-1">
        <Calendar
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          size={16}
        />
        <input
          type="date"
          value={value.start}
          onChange={handleStartChange}
          placeholder="开始日期"
          className="w-full pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     transition-all duration-200 placeholder-gray-400"
        />
        {value.start && (
          <button
            onClick={handleClearStart}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400
                       hover:text-gray-600 transition-colors p-0.5"
          >
            <X size={14} />
          </button>
        )}
        {!value.start && formatDisplay(value.start) && (
          <span className="absolute left-10 top-1/2 -translate-y-1/2 text-sm text-gray-700 pointer-events-none">
            {formatDisplay(value.start)}
          </span>
        )}
      </div>
      <span className="text-gray-400 text-sm">至</span>
      <div className="relative flex-1">
        <Calendar
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          size={16}
        />
        <input
          type="date"
          value={value.end}
          onChange={handleEndChange}
          placeholder="结束日期"
          min={value.start || undefined}
          className="w-full pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     transition-all duration-200 placeholder-gray-400"
        />
        {value.end && (
          <button
            onClick={handleClearEnd}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400
                       hover:text-gray-600 transition-colors p-0.5"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
