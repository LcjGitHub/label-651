import { X, Edit2, Shield, Loader2, Eye } from 'lucide-react';
import { useEffect, useState } from 'react';
import { User, UserDetail as UserDetailType, OperationLog, OperationType } from '@/types';
import { userApi } from '@/services/api';

interface UserDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number | null;
  onEdit: (user: User) => void;
}

const getOperationTypeLabel = (type: OperationType): { label: string; className: string } => {
  switch (type) {
    case 'CREATE':
      return { label: '新增', className: 'bg-green-100 text-green-700' };
    case 'UPDATE':
      return { label: '编辑', className: 'bg-blue-100 text-blue-700' };
    case 'DELETE':
      return { label: '删除', className: 'bg-red-100 text-red-700' };
    default:
      return { label: type, className: 'bg-gray-100 text-gray-700' };
  }
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export default function UserDetailModal({ isOpen, onClose, userId, onEdit }: UserDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<UserDetailType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
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
  }, [isOpen, onClose]);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!userId) return;
      try {
        setLoading(true);
        setError(null);
        setDetail(null);
        const response = await userApi.getUserDetail(userId);
        if (response.success && response.data) {
          setDetail(response.data);
        } else {
          setError('加载用户详情失败');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : '加载用户详情失败';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && userId) {
      fetchDetail();
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const handleEditClick = () => {
    if (detail?.user) {
      onEdit(detail.user);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4
                    animate-in fade-in slide-in-from-top-4 duration-200
                    max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">用户详情</h2>
            <p className="text-sm text-gray-500 mt-1">查看用户的完整信息和操作历史</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-150"
            aria-label="关闭"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {loading && (
            <div className="py-16 flex flex-col items-center justify-center">
              <Loader2 className="animate-spin text-blue-600" size={32} />
              <p className="mt-4 text-gray-500">加载中...</p>
            </div>
          )}

          {error && !loading && (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <X className="text-red-400" size={32} />
              </div>
              <p className="text-red-600 font-medium">{error}</p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                关闭
              </button>
            </div>
          )}

          {!loading && !error && detail && (
            <>
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">基本信息</h3>
                  <button
                    onClick={handleEditClick}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600
                               rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                  >
                    <Edit2 size={14} />
                    编辑
                  </button>
                </div>

                <div className="bg-gray-50 rounded-xl p-5">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600
                                  flex items-center justify-center text-white font-bold text-2xl shadow-md flex-shrink-0">
                      {detail.user.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xl font-semibold text-gray-900">{detail.user.name}</h4>
                      <p className="text-sm text-gray-500 mt-0.5 break-all">{detail.user.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            detail.user.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              detail.user.status === 'active'
                                ? 'bg-green-500'
                                : 'bg-gray-400'
                            }`}
                          />
                          {detail.user.status === 'active' ? '启用' : '禁用'}
                        </span>
                        {detail.user.roles && detail.user.roles.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {detail.user.roles.map((role) => (
                              <span
                                key={role.id}
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  role.status === 'active'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-gray-100 text-gray-500'
                                }`}
                              >
                                <Shield size={10} className="mr-1" />
                                {role.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-gray-100">
                      <p className="text-xs text-gray-500 mb-1">用户 ID</p>
                      <p className="text-sm font-medium text-gray-900">{detail.user.id}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-gray-100">
                      <p className="text-xs text-gray-500 mb-1">手机号</p>
                      <p className="text-sm font-medium text-gray-900">{detail.user.phone || '-'}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-gray-100">
                      <p className="text-xs text-gray-500 mb-1">创建时间</p>
                      <p className="text-sm font-medium text-gray-900">{formatDate(detail.user.created_at)}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-gray-100">
                      <p className="text-xs text-gray-500 mb-1">更新时间</p>
                      <p className="text-sm font-medium text-gray-900">{formatDate(detail.user.updated_at)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">操作历史</h3>
                  <span className="text-sm text-gray-500">最近 {detail.operationLogs.length} 条记录</span>
                </div>

                {detail.operationLogs.length === 0 ? (
                  <div className="bg-gray-50 rounded-xl p-12 text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Eye className="text-gray-400" size={20} />
                    </div>
                    <p className="text-gray-500 text-sm">暂无操作记录</p>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100/50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              操作时间
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              类型
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              模块
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              操作人
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              IP
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {detail.operationLogs.map((log: OperationLog) => {
                            const typeInfo = getOperationTypeLabel(log.operation_type);
                            return (
                              <tr key={log.id} className="hover:bg-white/60 transition-colors">
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                  {formatDate(log.created_at)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeInfo.className}`}>
                                    {typeInfo.label}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                  {log.module}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                  {log.operator_name}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 font-mono">
                                  {log.ip_address}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300
                       rounded-lg hover:bg-gray-50 transition-colors duration-150"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
