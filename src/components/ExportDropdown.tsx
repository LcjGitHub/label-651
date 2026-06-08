import { useState, useEffect, useRef } from 'react';
import {
  Download,
  ChevronDown,
  FileSpreadsheet,
  ListChecks,
  Search,
  Loader2,
  Filter,
  X,
  Save,
  Trash2,
  Check,
  ChevronUp,
  Settings,
} from 'lucide-react';
import { userApi, UserExportParams } from '@/services/api';
import { ExportTemplate, ExportField } from '@/types';

interface ExportDropdownProps {
  selectedIds: number[];
  searchQuery: string;
  totalCount: number;
  filteredCount: number;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
  onExport: () => void;
  filterParams?: Omit<UserExportParams, 'search' | 'ids' | 'fields'>;
  hasActiveFilters?: boolean;
}

type ExportScope = 'all' | 'filtered' | 'selected';

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
  const [modalOpen, setModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportScope, setExportScope] = useState<ExportScope>('all');

  const [allFields, setAllFields] = useState<ExportField[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [defaultFields, setDefaultFields] = useState<string[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);

  const [templates, setTemplates] = useState<ExportTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const templateDropdownRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
      if (
        templateDropdownRef.current &&
        !templateDropdownRef.current.contains(e.target as Node)
      ) {
        setShowTemplateDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (modalOpen && allFields.length === 0) {
      loadExportFields();
    }
  }, [modalOpen]);

  useEffect(() => {
    if (modalOpen) {
      loadTemplates();
    }
  }, [modalOpen]);

  const loadExportFields = async () => {
    try {
      setFieldsLoading(true);
      const response = await userApi.getExportFields();
      if (response.success && response.data) {
        setAllFields(response.data.fields);
        setDefaultFields(response.data.defaultFields);
        if (selectedFields.length === 0) {
          setSelectedFields(response.data.defaultFields);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取导出字段失败';
      showToast('error', message);
    } finally {
      setFieldsLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      setTemplatesLoading(true);
      const response = await userApi.getExportTemplates();
      if (response.success && response.data) {
        setTemplates(response.data);
      }
    } catch (err) {
      console.error('加载导出模板失败:', err);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const handleFieldToggle = (fieldKey: string) => {
    setSelectedFields((prev) =>
      prev.includes(fieldKey)
        ? prev.filter((f) => f !== fieldKey)
        : [...prev, fieldKey]
    );
    setSelectedTemplateId(null);
  };

  const handleSelectAllFields = () => {
    setSelectedFields(allFields.map((f) => f.key));
    setSelectedTemplateId(null);
  };

  const handleResetFields = () => {
    setSelectedFields(defaultFields);
    setSelectedTemplateId(null);
  };

  const handleSelectTemplate = (template: ExportTemplate) => {
    setSelectedFields(template.fields);
    setSelectedTemplateId(template.id);
    setShowTemplateDropdown(false);
    showToast('success', `已应用模板「${template.name}」`);
  };

  const handleDeleteTemplate = async (e: React.MouseEvent, templateId: number, templateName: string) => {
    e.stopPropagation();
    if (!confirm(`确定要删除模板「${templateName}」吗？`)) return;

    try {
      const response = await userApi.deleteExportTemplate(templateId);
      if (response.success) {
        setTemplates((prev) => prev.filter((t) => t.id !== templateId));
        if (selectedTemplateId === templateId) {
          setSelectedTemplateId(null);
        }
        showToast('success', '模板删除成功');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '删除模板失败';
      showToast('error', message);
    }
  };

  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim()) {
      showToast('error', '请输入模板名称');
      return;
    }
    if (selectedFields.length === 0) {
      showToast('error', '请至少选择一个导出字段');
      return;
    }

    try {
      setSavingTemplate(true);
      const response = await userApi.createExportTemplate({
        name: newTemplateName.trim(),
        module: 'users',
        fields: selectedFields,
      });
      if (response.success && response.data) {
        setTemplates((prev) => [response.data!, ...prev]);
        setSelectedTemplateId(response.data.id);
        setNewTemplateName('');
        setSaveTemplateOpen(false);
        showToast('success', '模板保存成功');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '保存模板失败';
      showToast('error', message);
    } finally {
      setSavingTemplate(false);
    }
  };

  const buildExportParams = (): UserExportParams => {
    const params: UserExportParams = {
      fields: selectedFields,
    };

    if (exportScope === 'selected' && selectedIds.length > 0) {
      params.ids = selectedIds;
    } else if (exportScope === 'filtered') {
      if (searchQuery && searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (filterParams) {
        Object.assign(params, filterParams);
      }
    }

    return params;
  };

  const handleConfirmExport = async () => {
    if (selectedFields.length === 0) {
      showToast('error', '请至少选择一个导出字段');
      return;
    }

    try {
      setExporting(true);
      const params = buildExportParams();
      const response = await userApi.exportUsers(params);
      if (response.success && response.data) {
        const link = document.createElement('a');
        link.href = response.data.downloadUrl;
        link.download = response.data.fileName;
        link.click();
        showToast('success', `导出成功，共 ${response.data.count} 条数据`);
        onExport();
        setModalOpen(false);
        setIsOpen(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '导出失败';
      showToast('error', message);
    } finally {
      setExporting(false);
    }
  };

  const handleDropdownOptionClick = (scope: ExportScope) => {
    setExportScope(scope);
    setIsOpen(false);
    setModalOpen(true);
  };

  const hasFilterCondition = (searchQuery && searchQuery.trim()) || hasActiveFilters;
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={exporting || (totalCount === 0 && selectedIds.length === 0 && !hasFilterCondition)}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 text-gray-700
                   rounded-lg font-medium text-sm hover:bg-gray-50 hover:border-gray-400
                   transition-all duration-200
                   disabled:opacity-50 disabled:cursor-not-allowed
                   shadow-sm"
      >
        {exporting ? (
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
            onClick={() => handleDropdownOptionClick('all')}
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
                handleDropdownOptionClick('filtered');
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
                handleDropdownOptionClick('selected');
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

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">导出用户数据</h3>
              <button
                onClick={() => {
                  setModalOpen(false);
                  setSaveTemplateOpen(false);
                }}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  导出范围
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'all', label: '全部', count: totalCount },
                    { value: 'filtered', label: '筛选结果', count: filteredCount, disabled: !hasFilterCondition },
                    { value: 'selected', label: '已勾选', count: selectedIds.length, disabled: selectedIds.length === 0 },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setExportScope(opt.value as ExportScope)}
                      disabled={opt.disabled}
                      className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-all duration-150
                        ${exportScope === opt.value
                          ? 'bg-blue-50 border-blue-500 text-blue-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                        }
                        ${opt.disabled ? 'opacity-40 cursor-not-allowed' : ''}
                      `}
                    >
                      {opt.label}
                      <span className="block text-xs mt-0.5 opacity-70">{opt.count}条</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    导出模板
                  </label>
                  <button
                    onClick={() => setSaveTemplateOpen(!saveTemplateOpen)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    <Save size={14} />
                    保存为模板
                  </button>
                </div>

                <div className="relative" ref={templateDropdownRef}>
                  <button
                    onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
                    disabled={templatesLoading}
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg
                               text-left text-sm text-gray-700 flex items-center justify-between
                               hover:border-gray-400 transition-colors
                               disabled:opacity-50"
                  >
                    {templatesLoading ? (
                      <span className="flex items-center gap-2 text-gray-500">
                        <Loader2 size={16} className="animate-spin" />
                        加载中...
                      </span>
                    ) : selectedTemplate ? (
                      <span className="truncate">{selectedTemplate.name}</span>
                    ) : (
                      <span className="text-gray-500">选择模板（可选）</span>
                    )}
                    <ChevronDown
                      size={16}
                      className={`text-gray-400 transition-transform ${showTemplateDropdown ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {showTemplateDropdown && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg
                                    shadow-lg z-10 max-h-60 overflow-auto animate-in fade-in slide-in-from-top-1 duration-100">
                      {templates.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          暂无保存的模板
                        </div>
                      ) : (
                        templates.map((template) => (
                          <div
                            key={template.id}
                            onClick={() => handleSelectTemplate(template)}
                            className={`px-4 py-2.5 flex items-center justify-between text-sm
                              cursor-pointer transition-colors
                              ${selectedTemplateId === template.id ? 'bg-blue-50' : 'hover:bg-gray-50'}
                            `}
                          >
                            <span className="truncate flex-1 text-gray-700">
                              {template.name}
                            </span>
                            <div className="flex items-center gap-1">
                              {selectedTemplateId === template.id && (
                                <Check size={16} className="text-blue-600" />
                              )}
                              <button
                                onClick={(e) => handleDeleteTemplate(e, template.id, template.name)}
                                className="p-1 hover:bg-red-50 rounded transition-colors"
                              >
                                <Trash2 size={14} className="text-gray-400 hover:text-red-500" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {saveTemplateOpen && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 animate-in fade-in slide-in-from-top-1 duration-100">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTemplateName}
                        onChange={(e) => setNewTemplateName(e.target.value)}
                        placeholder="输入模板名称"
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg
                                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveTemplate();
                        }}
                      />
                      <button
                        onClick={handleSaveTemplate}
                        disabled={savingTemplate || !newTemplateName.trim()}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg
                                   hover:bg-blue-700 transition-colors
                                   disabled:opacity-50 disabled:cursor-not-allowed
                                   flex items-center gap-1.5"
                      >
                        {savingTemplate ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Save size={16} />
                        )}
                        保存
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    导出字段
                    <span className="ml-2 text-xs text-gray-500 font-normal">
                      已选 {selectedFields.length}/{allFields.length} 项
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSelectAllFields}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      全选
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={handleResetFields}
                      className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                    >
                      恢复默认
                    </button>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {fieldsLoading ? (
                    <div className="px-4 py-8 flex items-center justify-center text-gray-500">
                      <Loader2 size={20} className="animate-spin mr-2" />
                      加载字段中...
                    </div>
                  ) : (
                    <div className="max-h-56 overflow-auto divide-y divide-gray-100">
                      {allFields.map((field) => (
                        <label
                          key={field.key}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50
                                     cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedFields.includes(field.key)}
                            onChange={() => handleFieldToggle(field.key)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded
                                       focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{field.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => {
                  setModalOpen(false);
                  setSaveTemplateOpen(false);
                }}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300
                           rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmExport}
                disabled={exporting || selectedFields.length === 0}
                className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg
                           hover:bg-blue-700 transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center gap-2"
              >
                {exporting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Download size={16} />
                )}
                确认导出
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
