import { useState } from 'react';
import { X } from 'lucide-react';
import MultiSelect, { MultiSelectOption } from './MultiSelect';
import DateRangePicker, { DateRangeValue } from './DateRangePicker';

export interface AdvancedFilterValue {
  statuses: string[];
  dateRange: DateRangeValue;
  phonePrefix: string;
}

interface AdvancedFilterProps {
  isOpen: boolean;
  onClose: () => void;
  value: AdvancedFilterValue;
  onChange: (value: AdvancedFilterValue) => void;
  onApply: () => void;
  onReset: () => void;
}

const statusOptions: MultiSelectOption[] = [
  { value: 'active', label: '启用' },
  { value: 'inactive', label: '禁用' },
];

export default function AdvancedFilter({
  isOpen,
  onClose,
  value,
  onChange,
  onApply,
  onReset,
}: AdvancedFilterProps) {
  const [localValue, setLocalValue] = useState<AdvancedFilterValue>(value);

  const handleStatusesChange = (statuses: string[]) => {
    setLocalValue((prev) => ({ ...prev, statuses }));
  };

  const handleDateRangeChange = (dateRange: DateRangeValue) => {
    setLocalValue((prev) => ({ ...prev, dateRange }));
  };

  const handlePhonePrefixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue((prev) => ({ ...prev, phonePrefix: e.target.value }));
  };

  const handleApply = () => {
    onChange(localValue);
    onApply();
  };

  const handleReset = () => {
    const resetValue: AdvancedFilterValue = {
      statuses: [],
      dateRange: { start: '', end: '' },
      phonePrefix: '',
    };
    setLocalValue(resetValue);
    onChange(resetValue);
    onReset();
  };

  if (!isOpen) return null;

  return (
    <div className="bg-gray-50 border-b border-gray-200 px-6 py-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">高级筛选</h3>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">
            用户状态
          </label>
          <MultiSelect
            options={statusOptions}
            value={localValue.statuses}
            onChange={handleStatusesChange}
            placeholder="全部状态"
          />
        </div>

        <div className="md:col-span-2 lg:col-span-1">
          <label className="block text-sm font-medium text-gray-600 mb-2">
            创建时间
          </label>
          <DateRangePicker
            value={localValue.dateRange}
            onChange={handleDateRangeChange}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">
            手机号前缀
          </label>
          <div className="relative">
            <input
              type="text"
              value={localValue.phonePrefix}
              onChange={handlePhonePrefixChange}
              placeholder="例如：138"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         transition-all duration-200 placeholder-gray-400"
            />
            {localValue.phonePrefix && (
              <button
                onClick={() => handlePhonePrefixChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400
                           hover:text-gray-600 transition-colors p-0.5"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-gray-200">
        <button
          onClick={handleReset}
          className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300
                     rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
        >
          重置
        </button>
        <button
          onClick={handleApply}
          className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg
                     hover:bg-blue-700 transition-colors duration-200 shadow-sm"
        >
          应用筛选
        </button>
      </div>
    </div>
  );
}
