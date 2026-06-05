import { useState, useCallback, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, Loader2, Shield, UserCog, LogOut, FileText, Upload, History, Bell } from 'lucide-react';
import { User, UserCreate, UserUpdate, Toast as ToastType } from '@/types';
import { userApi } from '@/services/api';
import SearchBar from '@/components/SearchBar';
import UserForm from '@/components/UserForm';
import ConfirmModal from '@/components/ConfirmModal';
import Toast from '@/components/Toast';
import ImportModal from '@/components/ImportModal';
import ImportHistoryModal from '@/components/ImportHistoryModal';
import ExportDropdown from '@/components/ExportDropdown';
import MessageDropdown from '@/components/MessageDropdown';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useMessageStore } from '@/store/messageStore';

export default function Home() {
  const { user, hasPermission, logout } = useAuthStore();
  const navigate = useNavigate();
  const connectWebSocket = useMessageStore((state) => state.connectWebSocket);
  const disconnectWebSocket = useMessageStore((state) => state.disconnectWebSocket);
  const fetchUnreadCount = useMessageStore((state) => state.fetchUnreadCount);
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const canViewRoleList = hasPermission('role:list');
  const canViewOperationLogs = hasPermission('system:log');
  const canCreateUser = hasPermission('user:create');
  const canUpdateUser = hasPermission('user:update');
  const canDeleteUser = hasPermission('user:delete');
  const canImportUser = hasPermission('user:import');
  const canExportUser = hasPermission('user:export');

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importHistoryModalOpen, setImportHistoryModalOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [toasts, setToasts] = useState<ToastType[]>([]);
  const location = useLocation();

  const fetchUsers = useCallback(async (search?: string) => {
    try {
      setLoading(true);
      const response = await userApi.getUsers(search);
      if (response.success && response.data) {
        setUsers(response.data);
        const dbTotal = response.total || response.data.length;
        setTotal(dbTotal);
        setFilteredTotal(response.filteredTotal ?? dbTotal);
        setSelectedIds([]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载用户列表失败';
      showToast('error', message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(users.map((u) => u.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (userId: number, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, userId]);
    } else {
      setSelectedIds((prev) => prev.filter((id) => id !== userId));
    }
  };

  const isAllSelected = users.length > 0 && selectedIds.length === users.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < users.length;

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    connectWebSocket();
    fetchUnreadCount();
    return () => {
      disconnectWebSocket();
    };
  }, [connectWebSocket, disconnectWebSocket, fetchUnreadCount]);

  useEffect(() => {
    const state = location.state as { message?: string } | null;
    if (state?.message) {
      showToast('error', state.message);
      navigate('/', { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  const showToast = (type: ToastType['type'], message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      fetchUsers(query);
    },
    [fetchUsers]
  );

  const handleAddClick = () => {
    setEditingUser(null);
    setFormOpen(true);
  };

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setFormOpen(true);
  };

  const handleDeleteClick = (user: User) => {
    setDeletingUser(user);
    setDeleteModalOpen(true);
  };

  const handleFormSubmit = async (data: UserCreate | UserUpdate) => {
    try {
      setFormLoading(true);
      if (editingUser) {
        const response = await userApi.updateUser(editingUser.id, data as UserUpdate);
        if (response.success) {
          showToast('success', response.message || '用户更新成功');
          setFormOpen(false);
          fetchUsers(searchQuery);
        }
      } else {
        const response = await userApi.createUser(data as UserCreate);
        if (response.success) {
          showToast('success', response.message || '用户创建成功');
          setFormOpen(false);
          fetchUsers(searchQuery);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '操作失败';
      showToast('error', message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingUser) return;
    try {
      setDeleteLoading(true);
      const response = await userApi.deleteUser(deletingUser.id);
      if (response.success) {
        showToast('success', response.message || '用户删除成功');
        setDeleteModalOpen(false);
        setDeletingUser(null);
        fetchUsers(searchQuery);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '删除失败';
      showToast('error', message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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
              <MessageDropdown showToast={showToast} />
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
            {canViewOperationLogs && (
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
            )}
            <Link
              to="/messages"
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                location.pathname === '/messages'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Bell size={16} />
              消息中心
            </Link>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">用户列表</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {searchQuery && searchQuery.trim() ? (
                  <>
                    当前匹配 {filteredTotal} 位用户 · 数据库共 {total} 位
                  </>
                ) : (
                  <>共 {total} 位用户</>
                )}
                {selectedIds.length > 0 && (
                  <span className="ml-2 text-blue-600">（已选 {selectedIds.length} 位）</span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canImportUser && (
                <>
                  <button
                    onClick={() => setImportModalOpen(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 text-gray-700
                               rounded-lg font-medium text-sm hover:bg-gray-50 hover:border-gray-400
                               transition-all duration-200 shadow-sm"
                  >
                    <Upload size={18} />
                    导入
                  </button>
                  <button
                    onClick={() => setImportHistoryModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-600
                               rounded-lg font-medium text-sm hover:bg-gray-50 hover:border-gray-400
                               transition-all duration-200 shadow-sm"
                    title="查看导入历史"
                  >
                    <History size={18} />
                  </button>
                </>
              )}
              {canExportUser && (
                <ExportDropdown
                  selectedIds={selectedIds}
                  searchQuery={searchQuery}
                  totalCount={total}
                  filteredCount={filteredTotal}
                  showToast={showToast}
                  onExport={() => {}}
                />
              )}
              {canCreateUser && (
                <button
                  onClick={handleAddClick}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white
                             rounded-lg font-medium text-sm hover:bg-blue-700 hover:shadow-lg
                             transition-all duration-200 hover:-translate-y-0.5"
                >
                  <Plus size={18} />
                  新增用户
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <SearchBar onSearch={handleSearch} />
          </div>

          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center">
              <Loader2 className="animate-spin text-blue-600" size={40} />
              <p className="mt-4 text-gray-500">加载中...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Users className="text-gray-400" size={40} />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? '未找到匹配的用户' : '暂无用户数据'}
              </h3>
              <p className="text-gray-500 text-sm mb-6">
                {searchQuery ? '请尝试其他搜索关键词' : '点击上方按钮添加第一个用户'}
              </p>
              {!searchQuery && (
                <button
                  onClick={handleAddClick}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white
                             rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
                >
                  <Plus size={16} />
                  添加用户
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left w-12">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = isIndeterminate;
                        }}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600
                                   focus:ring-blue-500 cursor-pointer"
                      />
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      编号
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      姓名
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      邮箱
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      手机号
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      角色
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      创建时间
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((user, index) => (
                    <tr
                      key={user.id}
                      className={`hover:bg-blue-50/50 transition-colors duration-150 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                      } ${selectedIds.includes(user.id) ? 'bg-blue-50/80' : ''}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(user.id)}
                          onChange={(e) => handleSelectOne(user.id, e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600
                                     focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600
                                        flex items-center justify-center text-white font-medium text-sm shadow">
                            {user.name.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {user.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {user.phone || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {user.roles && user.roles.length > 0 ? (
                            user.roles.map((role) => (
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
                            ))
                          ) : (
                            <span className="text-gray-400 text-sm">未分配</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            user.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              user.status === 'active'
                                ? 'bg-green-500'
                                : 'bg-gray-400'
                            }`}
                          />
                          {user.status === 'active' ? '启用' : '禁用'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canUpdateUser && (
                            <button
                              onClick={() => handleEditClick(user)}
                              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50
                                         rounded-lg transition-all duration-150"
                              title="编辑"
                            >
                              <Edit2 size={16} />
                            </button>
                          )}
                          {canDeleteUser && (
                            <button
                              onClick={() => handleDeleteClick(user)}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50
                                         rounded-lg transition-all duration-150"
                              title="删除"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <UserForm
          isOpen={formOpen}
          onClose={() => setFormOpen(false)}
          onSubmit={handleFormSubmit}
          user={editingUser}
          isLoading={formLoading}
        />

        <ConfirmModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setDeletingUser(null);
          }}
          onConfirm={handleDeleteConfirm}
          title="确认删除"
          message={
            deletingUser
              ? `确定要删除用户「${deletingUser.name}」吗？此操作不可恢复。`
              : ''
          }
          confirmText="删除"
          type="danger"
          isLoading={deleteLoading}
        />

        <ImportModal
          isOpen={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          onSuccess={() => fetchUsers(searchQuery)}
          showToast={showToast}
        />

        <ImportHistoryModal
          isOpen={importHistoryModalOpen}
          onClose={() => setImportHistoryModalOpen(false)}
          showToast={showToast}
        />
      </div>
    </div>
  );
}
