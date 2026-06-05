import { useState, useEffect, useRef } from 'react';
import { X, Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, Loader2, Download } from 'lucide-react';
import { userApi } from '@/services/api';
import { ImportResult } from '@/types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

type ImportStage = 'upload' | 'uploading' | 'result';

export default function ImportModal({ isOpen, onClose, onSuccess, showToast }: ImportModalProps) {
  const [stage, setStage] = useState<ImportStage>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && stage !== 'uploading') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, stage]);

  useEffect(() => {
    if (!isOpen) {
      setStage('upload');
      setSelectedFile(null);
      setProgress(0);
      setImportResult(null);
    }
  }, [isOpen]);

  const handleFileSelect = (file: File) => {
    const allowedTypes = ['.xlsx', '.xls', '.csv'];
    const fileName = file.name.toLowerCase();
    const isValid = allowedTypes.some((ext) => fileName.endsWith(ext));

    if (!isValid) {
      showToast('error', '只支持 Excel (.xlsx, .xls) 或 CSV (.csv) 格式文件');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('error', '文件大小不能超过 10MB');
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleConfirm = async () => {
    if (!selectedFile) return;

    try {
      setStage('uploading');
      setProgress(0);

      const response = await userApi.importUsers(selectedFile, (percent) => {
        setProgress(Math.min(percent, 95));
      });

      setProgress(100);

      if (response.success && response.data) {
        setImportResult(response.data);
        setStage('result');
        if (response.data.success > 0) {
          onSuccess();
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '导入失败';
      showToast('error', message);
      setStage('upload');
      setProgress(0);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await userApi.getExportTemplate();
      if (response.success && response.data) {
        const link = document.createElement('a');
        link.href = response.data.downloadUrl;
        link.download = response.data.fileName;
        link.click();
        showToast('success', '模板下载成功');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '模板下载失败';
      showToast('error', message);
    }
  };

  const handleClose = () => {
    if (stage === 'uploading') return;
    onClose();
  };

  if (!isOpen) return null;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4
                      animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <FileSpreadsheet className="text-blue-600" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">批量导入用户</h3>
              <p className="text-sm text-gray-500">支持 Excel 和 CSV 格式</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={stage === 'uploading'}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100
                       rounded-lg transition-all duration-150
                       disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="关闭"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {stage === 'upload' && (
            <>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
                           transition-all duration-200 ${
                             isDragging
                               ? 'border-blue-500 bg-blue-50'
                               : selectedFile
                               ? 'border-green-400 bg-green-50'
                               : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                           }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />

                {selectedFile ? (
                  <div className="space-y-2">
                    <div className="w-14 h-14 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="text-green-600" size={28} />
                    </div>
                    <p className="font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                    <p className="text-xs text-blue-600">点击重新选择文件</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-14 h-14 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                      <Upload className="text-gray-400" size={28} />
                    </div>
                    <p className="font-medium text-gray-900">
                      点击选择文件或拖拽文件到此处
                    </p>
                    <p className="text-sm text-gray-500">
                      支持 .xlsx, .xls, .csv 格式，最大 10MB
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-1.5 text-sm text-blue-600
                             hover:text-blue-700 transition-colors"
                >
                  <Download size={14} />
                  下载导入模板
                </button>
              </div>

              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-start gap-2">
                  <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={16} />
                  <div className="text-sm text-amber-800 space-y-1">
                    <p className="font-medium">导入说明：</p>
                    <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                      <li>姓名和邮箱为必填项</li>
                      <li>邮箱格式必须正确且不能重复</li>
                      <li>状态可选值：active（启用）或 inactive（禁用）</li>
                      <li>手机号格式为中国大陆手机号</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}

          {stage === 'uploading' && (
            <div className="py-8 space-y-6">
              <div className="text-center">
                <Loader2 className="animate-spin text-blue-600 mx-auto" size={40} />
                <p className="mt-4 font-medium text-gray-900">正在导入数据...</p>
                <p className="text-sm text-gray-500 mt-1">请不要关闭窗口</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">上传进度</span>
                  <span className="font-medium text-blue-600">{progress}%</span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full
                               transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {stage === 'result' && importResult && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <p className="text-2xl font-bold text-gray-900">{importResult.total}</p>
                  <p className="text-xs text-gray-500 mt-1">总计</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-xl">
                  <p className="text-2xl font-bold text-green-600">{importResult.success}</p>
                  <p className="text-xs text-green-600 mt-1">成功</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-xl">
                  <p className="text-2xl font-bold text-red-600">{importResult.fail}</p>
                  <p className="text-xs text-red-600 mt-1">失败</p>
                </div>
              </div>

              {importResult.failReasons.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <XCircle className="text-red-500" size={18} />
                    <p className="font-medium text-gray-900">失败详情</p>
                  </div>
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                    {importResult.failReasons.map((item, index) => (
                      <div key={index} className="px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                        <span className="inline-block w-16 text-gray-500">{item.row}行</span>
                        {item.reason.replace(/^第\d+行：/, '')}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
          {stage === 'upload' && (
            <>
              <button
                onClick={handleClose}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100
                           rounded-lg hover:bg-gray-200 transition-colors duration-150"
              >
                取消
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selectedFile}
                className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600
                           rounded-lg hover:bg-blue-700 transition-colors duration-150
                           disabled:opacity-50 disabled:cursor-not-allowed
                           inline-flex items-center gap-2"
              >
                <Upload size={16} />
                开始导入
              </button>
            </>
          )}
          {stage === 'uploading' && (
            <button
              disabled
              className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600
                         rounded-lg opacity-50 cursor-not-allowed
                         inline-flex items-center gap-2"
            >
              <Loader2 className="animate-spin" size={16} />
              导入中...
            </button>
          )}
          {stage === 'result' && (
            <button
              onClick={handleClose}
              className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600
                         rounded-lg hover:bg-blue-700 transition-colors duration-150"
            >
              完成
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
