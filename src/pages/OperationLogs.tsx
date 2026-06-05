import { useState, useCallback, useEffect } from 'react';
import { FileText, Eye, Loader2, Users, Shield, UserCog, LogOut, RotateCcw, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { OperationLog, OperationType, Toast as ToastType, OperationLogQuery, OperationLogDetail } from '@/types';
import { operationLogApi } from '@/services/api';
import Toast from '@/components/Toast';
import LogDetailModal from '@/components/LogDetailModal';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

const OPERATION_TYPES: { value: OperationType | ''; label: string }[] = [
  { value: '', label: '全部类型' },
  { value: 'CREATE', label: '新增' },
  { value: 'UPDATE', label: '编辑' },
  { value: 'DELETE', label: '删除' },
];

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

export default function OperationLogs() {
  const { user, hasPermission, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!hasPermission('system:log')) {
      setTimeout(() => {
        navigate('/', { state: { message: '您没有访问操作日志的权限' } });
      }, 100);
    }
  }, [hasPermission, navigate]);

  if (!hasPermission('system:log')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="text-red-500" size={40} />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">无访问权限</h2>
          <p className="text-gray-500 mb-4">您没有访问操作日志的权限</p>
          <p className="text-sm text-gray-400">正在跳转到首页...</p>
        </div>
      </div>
    );
  }

  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [permissionError, setPermissionError] = useState(false);

  const [filters, setFilters] = useState<OperationLogQuery>({
    operator_id: undefined,
    operation_type: undefined,
    module: '',
    start_time: '',
    end_time: '',
  });

  const [operators, setOperators] = useState<{ id: number; name: string }[]>([]);
  const [modules, setModules] = useState<string[]>([]);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<OperationLog | null>(null);

  const [toasts, setToasts] = useState<ToastType[]>([]);

  const canViewUserList = hasPermission('user:list');
  const canViewRoleList = hasPermission('role:list');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getChangeSummary = (log: OperationLog): string => {
    try {
      const detail = JSON.parse(log.detail) as OperationLogDetail;

      if (log.operation_type === 'CREATE') {
        const fieldNames = detail.after ? Object.keys(detail.after).slice(0, 3) : [];
        if (fieldNames.length > 0) {
          return `新增：${fieldNames.join('、')}`;
        }
        return '新增记录';
      }

      if (log.operation_type === 'DELETE') {
        const fieldNames = detail.before ? Object.keys(detail.before).slice(0, 3) : [];
        if (fieldNames.length > 0) {
          return `删除：${fieldNames.join('、')}`;
        }
        return '删除记录';
      }

      if (log.operation_type === 'UPDATE' && detail.changes) {
        const changes = Object.entries(detail.changes);
        if (changes.length === 0) {
          return '无实际变更';
        }

        const fieldLabelMap: Record<string, string> = {
          name: '姓名',
          email: '邮箱',
          phone: '手机',
          password: '密码',
          status: '状态',
          role_ids: '角色',
          permission_ids: '权限',
          description: '描述',
          code: '编码',
          type: '类型',
        };

        const summaries = changes.slice(0, 2).map(([key, value]) => {
          const label = fieldLabelMap[key] || key;
          const changeValue = value as { old: unknown; new: unknown };
          const oldVal = String(changeValue.old ?? '空').slice(0, 10);
          const newVal = String(changeValue.new ?? '空').slice(0, 10);
          return `${label}：${oldVal}→${newVal}`;
        });

        let summary = summaries.join('；');
        if (changes.length > 2) {
          summary += ` 等${changes.length}项变更`;
        }

        return summary;
      }

      return '编辑记录';
    } catch {
      return '查看详情';
    }
  };

  const showToast = (type: ToastType['type'], message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const fetchLogs = useCallback(async (query?: OperationLogQuery) => {
    try {
      setLoading(true);
      setPermissionError(false);
      const params: OperationLogQuery = {
        ...query,
        page,
        page_size: pageSize,
      };
      const response = await operationLogApi.getLogs(params);
      if (response.success && response.data) {
        setLogs(response.data);
        setTotal(response.total || response.data.length);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载日志列表失败';
      if (message.includes('权限') || message.includes('403') || message.includes('无权限')) {
        setPermissionError(true);
      } else {
        showToast('error', message);
      }
    } finally {
      setLoading(false);
    }
  }, [page]);

  const fetchFilters = useCallback(async () => {
    try {
      const [operatorsRes, modulesRes] = await Promise.all([
        operationLogApi.getOperators(),
        operationLogApi.getModules(),
      ]);
      if (operatorsRes.success && operatorsRes.data) {
        setOperators(operatorsRes.data);
      }
      if (modulesRes.success && modulesRes.data) {
        setModules(modulesRes.data);
      }
    } catch (err) {
      console.error('加载筛选条件失败:', err);
    }
  }, []);

  useEffect(() => {
    fetchLogs(filters);
  }, [fetchLogs, filters]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  const handleFilterChange = (key: keyof OperationLogQuery, value: unknown) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
    setPage(1);
  };

  const handleReset = () => {
    setFilters({
      operator_id: undefined,
      operation_type: undefined,
      module: '',
      start_time: '',
      end_time: '',
    });
    setPage(1);
  };

  const handleViewDetail = (log: OperationLog) => {
    setSelectedLog(log);
    setDetailModalOpen(true);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= Math.ceil(total / pageSize)) {
      setPage(newPage);
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

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Toast toasts={toasts} onRemove={removeToast} />

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-600 rounded-xl shadow-lg">
                <UserCog className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">用户管理系统</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  管理用户、角色和权限
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-150"
                title="退出登录"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>

          <div className="flex gap-1 bg-white p-1 rounded-xl shadow-lg w-fit">
            {canViewUserList && (
              <Link
                to="/"
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                  location.pathname === '/'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Users size={16} />
                用户管理
              </Link>
            )}
            {canViewRoleList && (
              <Link
                to="/roles"
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                  location.pathname === '/roles'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Shield size={16} />
                角色管理
              </Link>
            )}
            <Link
              to="/operation-logs"
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                location.pathname === '/operation-logs'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FileText size={16} />
              操作日志
            </Link>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">操作日志</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                共 {total} 条记录
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
          <div className="p-6 border-b border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  操作人
                </label>
                <select
                  value={filters.operator_id || ''}
                  onChange={(e) => handleFilterChange('operator_id', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                >
                  <option value="">全部操作人</option>
                  {operators.map((op) => (
                    <option key={op.id} value={op.id}>
                      {op.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  操作类型
                </label>
                <select
                  value={filters.operation_type || ''}
                  onChange={(e) => handleFilterChange('operation_type', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                >
                  {OPERATION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  操作模块
                </label>
                <select
                  value={filters.module || ''}
                  onChange={(e) => handleFilterChange('module', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                >
                  <option value="">全部模块</option>
                  {modules.map((mod) => (
                    <option key={mod} value={mod}>
                      {mod}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  开始时间
                </label>
                <input
                  type="date"
                  value={filters.start_time || ''}
                  onChange={(e) => handleFilterChange('start_time', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  结束时间
                </label>
                <input
                  type="date"
                  value={filters.end_time || ''}
                  onChange={(e) => handleFilterChange('end_time', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end mt-4 gap-3">
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-150"
              >
                <RotateCcw size={16} />
                重置
              </button>
              <button
                onClick={() => fetchLogs(filters)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-150"
              >
                <Search size={16} />
                查询
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center">
              <Loader2 className="animate-spin text-blue-600" size={40} />
              <p className="mt-4 text-gray-500">加载中...</p>
            </div>
          ) : permissionError ? (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <Shield className="text-red-500" size={40} />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                无访问权限
              </h3>
              <p className="text-gray-500 text-sm">
                您没有访问操作日志的权限，请联系管理员
              </p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="text-gray-400" size={40} />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                暂无日志数据
              </h3>
              <p className="text-gray-500 text-sm">
                系统会自动记录所有用户的增删改操作
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        编号
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        操作人
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        操作类型
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        操作模块
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        IP 地址
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        操作时间
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        操作详情
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {logs.map((log, index) => {
                      const typeInfo = getOperationTypeLabel(log.operation_type);
                      return (
                        <tr
                          key={log.id}
                          className={`hover:bg-blue-50/50 transition-colors duration-150 ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                          }`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {log.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center text-white font-medium text-xs shadow">
                                {log.operator_name.charAt(0)}
                              </div>
                              <span className="text-sm font-medium text-gray-900">
                                {log.operator_name}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${typeInfo.className}`}
                            >
                              {typeInfo.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {log.module}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700 font-mono">
                              {log.ip_address}
                            </code>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(log.created_at)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700 max-w-xs">
                            <div className="truncate" title={getChangeSummary(log)}>
                              {getChangeSummary(log)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <button
                              onClick={() => handleViewDetail(log)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-150"
                              title="查看详情"
                            >
                              <Eye size={14} />
                              详情
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    第 {page} / {totalPages} 页，共 {total} 条记录
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page === 1}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors duration-150 ${
                            page === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page === totalPages}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <LogDetailModal
          isOpen={detailModalOpen}
          onClose={() => {
            setDetailModalOpen(false);
            setSelectedLog(null);
          }}
          log={selectedLog}
        />
      </div>
    </div>
  );
}
