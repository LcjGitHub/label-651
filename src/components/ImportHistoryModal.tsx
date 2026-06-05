import { useState, useEffect } from 'react';
import { X, History, ChevronDown, ChevronUp, FileSpreadsheet, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { userApi } from '@/services/api';
import { ImportHistory } from '@/types';

interface ImportHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export default function ImportHistoryModal({ isOpen, onClose, showToast }: ImportHistoryModalProps) {
  const [history, setHistory] = useState<ImportHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      loadHistory();
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await userApi.getImportHistory();
      if (response.success && response.data) {
        setHistory(response.data);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载导入历史失败';
      showToast('error', message);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDateTime = (datetime: string) => {
    const d = new Date(datetime);
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const parseFailReasons = (failReasons: string): { row: number; reason: string }[] => {
    try {
      return JSON.parse(failReasons);
    } catch {
      return [];
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-100 text-green-700 border-green-200',
      failed: 'bg-red-100 text-red-700 border-red-200',
      processing: 'bg-blue-100 text-blue-700 border-blue-200',
      pending: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    const labels: Record<string, string> = {
      completed: '已完成',
      failed: '失败',
      processing: '处理中',
      pending: '等待中',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${styles[status] || styles.pending}`}>
        {status === 'processing' ? <Clock size={10} className="animate-pulse" /> : null}
        {labels[status] || status}
      </span>
    );
  };

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col
                      animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-xl">
              <History className="text-indigo-600" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">导入历史</h3>
              <p className="text-sm text-gray-500">最近 50 条导入记录</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100
                       rounded-lg transition-all duration-150"
            aria-label="关闭"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="py-16 text-center">
              <Loader2 className="animate-spin text-indigo-500 mx-auto" size={32} />
              <p className="mt-4 text-sm text-gray-500">加载中...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="py-16 text-center">
              <FileSpreadsheet className="text-gray-300 mx-auto" size={48} />
              <p className="mt-4 text-sm text-gray-500">暂无导入记录</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => {
                const failReasons = parseFailReasons(item.fail_reasons);
                const isExpanded = expandedId === item.id;
                return (
                  <div
                    key={item.id}
                    className="border border-gray-200 rounded-xl overflow-hidden
                               hover:border-gray-300 transition-colors duration-150"
                  >
                    <div
                      className="p-4 cursor-pointer hover:bg-gray-50 transition-colors duration-150"
                      onClick={() => item.fail_count > 0 && toggleExpand(item.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 truncate">{item.file_name}</p>
                            {getStatusBadge(item.status)}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {item.operator_name} · {formatFileSize(item.file_size)} · {formatDateTime(item.created_at)}
                          </p>
                        </div>
                        {item.fail_count > 0 ? (
                          <button className="p-1 text-gray-400 hover:text-gray-600 rounded">
                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </button>
                        ) : null}
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-3">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg">
                          <FileSpreadsheet size={14} className="text-gray-500" />
                          <span className="text-sm text-gray-700">
                            <span className="font-semibold">{item.total_count}</span>
                            <span className="text-gray-500 text-xs ml-1">总数</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-lg">
                          <CheckCircle size={14} className="text-green-600" />
                          <span className="text-sm text-green-700">
                            <span className="font-semibold">{item.success_count}</span>
                            <span className="text-green-500 text-xs ml-1">成功</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 rounded-lg">
                          <XCircle size={14} className="text-red-600" />
                          <span className="text-sm text-red-700">
                            <span className="font-semibold">{item.fail_count}</span>
                            <span className="text-red-500 text-xs ml-1">失败</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {isExpanded && failReasons.length > 0 && (
                      <div className="border-t border-gray-100 bg-gray-50 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <XCircle size={16} className="text-red-500" />
                          <p className="text-sm font-medium text-gray-800">失败原因</p>
                        </div>
                        <div className="max-h-40 overflow-y-auto border border-red-200 rounded-lg divide-y divide-red-100 bg-white">
                          {failReasons.map((fr, idx) => (
                            <div key={idx} className="px-3 py-2 text-sm text-gray-700">
                              <span className="inline-block w-12 text-red-500 font-mono text-xs">{fr.row}行</span>
                              {String(fr.reason).replace(/^第\d+行：/, '')}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100
                       rounded-lg hover:bg-gray-200 transition-colors duration-150"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
