import { useState, useEffect, useRef } from 'react';
import { Download, ChevronDown, FileSpreadsheet, ListChecks, Search, Loader2, Filter } from 'lucide-react';
import { userApi, UserExportParams } from '@/services/api';

interface ExportDropdownProps {
  selectedIds: number[];
  searchQuery: string;
  totalCount: number;
  filteredCount: number;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
  onExport: () => void;
  filterParams?: Omit<UserExportParams, 'search' | 'ids'>;
  hasActiveFilters?: boolean;
}

export default function ExportDropdown({
  selectedIds,
  searchQuery,
  totalCount,
  filteredCount,
  showToast,
  onExport,
  filterParams,
  hasActiveFilters = false,
}: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState<'all' | 'selected' | 'filtered' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleExportAll = async () => {
    try {
      setExporting('all');
      setIsOpen(false);
      const response = await userApi.exportUsers();
      if (response.success && response.data) {
        const link = document.createElement('a');
        link.href = response.data.downloadUrl;
        link.download = response.data.fileName;
        link.click();
        showToast('success', `导出成功，共 ${response.data.count} 条数据`);
        onExport();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '导出失败';
      showToast('error', message);
    } finally {
      setExporting(null);
    }
  };

  const handleExportFiltered = async (params: UserExportParams) => {
    try {
      setExporting('filtered');
      setIsOpen(false);
      const response = await userApi.exportUsers(params);
      if (response.success && response.data) {
        const link = document.createElement('a');
        link.href = response.data.downloadUrl;
        link.download = response.data.fileName;
        link.click();
        showToast('success', `导出成功，共 ${response.data.count} 条数据`);
        onExport();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '导出失败';
      showToast('error', message);
    } finally {
      setExporting(null);
    }
  };

  const handleExportSelected = async (ids: number[]) => {
    try {
      setExporting('selected');
      setIsOpen(false);
      const response = await userApi.exportUsers({ ids });
      if (response.success && response.data) {
        const link = document.createElement('a');
        link.href = response.data.downloadUrl;
        link.download = response.data.fileName;
        link.click();
        showToast('success', `导出成功，共 ${response.data.count} 条数据`);
        onExport();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '导出失败';
      showToast('error', message);
    } finally {
      setExporting(null);
    }
  };

  const isLoading = exporting !== null;
  const hasFilterCondition = (searchQuery && searchQuery.trim()) || hasActiveFilters;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading || (totalCount === 0 && selectedIds.length === 0 && !hasFilterCondition)}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 text-gray-700
                   rounded-lg font-medium text-sm hover:bg-gray-50 hover:border-gray-400
                   transition-all duration-200
                   disabled:opacity-50 disabled:cursor-not-allowed
                   shadow-sm"
      >
        {isLoading ? (
          <Loader2 className="animate-spin" size={18} />
        ) : (
          <Download size={18} />
        )}
        导出
        <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200
                        py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <button
            onClick={handleExportAll}
            disabled={totalCount === 0}
            className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-gray-700
                       hover:bg-gray-50 transition-colors duration-150
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet size={16} className="text-gray-500" />
            <div className="flex-1 text-left">
              <p className="font-medium">导出全部用户</p>
              <p className="text-xs text-gray-500">数据库共 {totalCount} 条数据</p>
            </div>
          </button>

          <div className="my-1 border-t border-gray-100" />

          <button
            onClick={() => {
              if (hasFilterCondition) {
                const params: UserExportParams = {};
                if (searchQuery && searchQuery.trim()) {
                  params.search = searchQuery.trim();
                }
                if (filterParams) {
                  Object.assign(params, filterParams);
                }
                handleExportFiltered(params);
              } else {
                showToast('info', '请先设置搜索或筛选条件');
              }
            }}
            disabled={!hasFilterCondition}
            className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-gray-700
                       hover:bg-gray-50 transition-colors duration-150
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {hasActiveFilters && !searchQuery ? (
              <Filter size={16} className="text-gray-500" />
            ) : (
              <Search size={16} className="text-gray-500" />
            )}
            <div className="flex-1 text-left">
              <p className="font-medium">
                {hasActiveFilters && !searchQuery ? '导出筛选结果' : '导出搜索/筛选结果'}
              </p>
              <p className="text-xs text-gray-500">当前匹配 {filteredCount} 条数据</p>
            </div>
          </button>

          <div className="my-1 border-t border-gray-100" />

          <button
            onClick={() => {
              if (selectedIds.length > 0) {
                handleExportSelected(selectedIds);
              } else {
                showToast('info', '请先勾选要导出的用户');
              }
            }}
            disabled={selectedIds.length === 0}
            className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-gray-700
                       hover:bg-gray-50 transition-colors duration-150
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ListChecks size={16} className="text-gray-500" />
            <div className="flex-1 text-left">
              <p className="font-medium">导出勾选用户</p>
              <p className="text-xs text-gray-500">已选择 {selectedIds.length} 条数据</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
