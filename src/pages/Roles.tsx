import { useState, useCallback, useEffect } from 'react';
import { Plus, Edit2, Trash2, Shield, Loader2, Users, Key, UserCog, LogOut } from 'lucide-react';
import { Role, RoleCreate, RoleUpdate, Toast as ToastType, Permission } from '@/types';
import { roleApi, permissionApi } from '@/services/api';
import SearchBar from '@/components/SearchBar';
import RoleForm from '@/components/RoleForm';
import ConfirmModal from '@/components/ConfirmModal';
import Toast from '@/components/Toast';
import PermissionTree from '@/components/PermissionTree';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export default function Roles() {
  const { user, hasPermission, logout } = useAuthStore();
  const navigate = useNavigate();
  const [roles, setRoles] = useState<Role[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();

  const canViewUserList = hasPermission('user:list');
  const canCreateRole = hasPermission('role:create');
  const canUpdateRole = hasPermission('role:update');
  const canDeleteRole = hasPermission('role:delete');
  const canAssignRole = hasPermission('role:assign');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const [formOpen, setFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [permModalOpen, setPermModalOpen] = useState(false);
  const [permRole, setPermRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedPermIds, setSelectedPermIds] = useState<number[]>([]);
  const [permLoading, setPermLoading] = useState(false);
  const [permSaving, setPermSaving] = useState(false);

  const [toasts, setToasts] = useState<ToastType[]>([]);

  const fetchRoles = useCallback(async (search?: string) => {
    try {
      setLoading(true);
      const response = await roleApi.getRoles(search);
      if (response.success && response.data) {
        setRoles(response.data);
        setTotal(response.total || response.data.length);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载角色列表失败';
      showToast('error', message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

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
      fetchRoles(query);
    },
    [fetchRoles]
  );

  const handleAddClick = () => {
    setEditingRole(null);
    setFormOpen(true);
  };

  const handleEditClick = (role: Role) => {
    setEditingRole(role);
    setFormOpen(true);
  };

  const handleDeleteClick = (role: Role) => {
    setDeletingRole(role);
    setDeleteModalOpen(true);
  };

  const handlePermClick = async (role: Role) => {
    try {
      setPermLoading(true);
      setPermRole(role);
      setPermModalOpen(true);

      const [permResponse, rolePermResponse] = await Promise.all([
        permissionApi.getPermissionTree(),
        roleApi.getRolePermissions(role.id),
      ]);

      if (permResponse.success && permResponse.data) {
        setPermissions(permResponse.data);
      }
      if (rolePermResponse.success && rolePermResponse.data) {
        setSelectedPermIds(rolePermResponse.data.permission_ids);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载权限数据失败';
      showToast('error', message);
    } finally {
      setPermLoading(false);
    }
  };

  const handleFormSubmit = async (data: RoleCreate | RoleUpdate) => {
    try {
      setFormLoading(true);
      if (editingRole) {
        const response = await roleApi.updateRole(editingRole.id, data as RoleUpdate);
        if (response.success) {
          showToast('success', response.message || '角色更新成功');
          setFormOpen(false);
          fetchRoles(searchQuery);
        }
      } else {
        const response = await roleApi.createRole(data as RoleCreate);
        if (response.success) {
          showToast('success', response.message || '角色创建成功');
          setFormOpen(false);
          fetchRoles(searchQuery);
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
    if (!deletingRole) return;
    try {
      setDeleteLoading(true);
      const response = await roleApi.deleteRole(deletingRole.id);
      if (response.success) {
        showToast('success', response.message || '角色删除成功');
        setDeleteModalOpen(false);
        setDeletingRole(null);
        fetchRoles(searchQuery);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '删除失败';
      showToast('error', message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handlePermSave = async () => {
    if (!permRole) return;
    try {
      setPermSaving(true);
      const response = await roleApi.assignRolePermissions(permRole.id, selectedPermIds);
      if (response.success) {
        showToast('success', response.message || '权限分配成功');
        setPermModalOpen(false);
        setPermRole(null);
        fetchRoles(searchQuery);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '权限分配失败';
      showToast('error', message);
    } finally {
      setPermSaving(false);
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
          </div>
        </div>

        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">角色列表</h2>
              <p className="text-sm text-gray-500 mt-0.5">共 {total} 个角色</p>
            </div>
            {canCreateRole && (
              <button
                onClick={handleAddClick}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white
                           rounded-lg font-medium text-sm hover:bg-purple-700 hover:shadow-lg
                           transition-all duration-200 hover:-translate-y-0.5"
              >
                <Plus size={18} />
                新增角色
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <SearchBar onSearch={handleSearch} placeholder="搜索角色名称、编码..." />
          </div>

          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center">
              <Loader2 className="animate-spin text-purple-600" size={40} />
              <p className="mt-4 text-gray-500">加载中...</p>
            </div>
          ) : roles.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Shield className="text-gray-400" size={40} />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? '未找到匹配的角色' : '暂无角色数据'}
              </h3>
              <p className="text-gray-500 text-sm mb-6">
                {searchQuery ? '请尝试其他搜索关键词' : '点击上方按钮添加第一个角色'}
              </p>
              {!searchQuery && (
                <button
                  onClick={handleAddClick}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white
                             rounded-lg font-medium text-sm hover:bg-purple-700 transition-colors"
                >
                  <Plus size={16} />
                  添加角色
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      编号
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      角色名称
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      角色编码
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      描述
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      用户数
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      权限数
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
                  {roles.map((role, index) => (
                    <tr
                      key={role.id}
                      className={`hover:bg-purple-50/50 transition-colors duration-150 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {role.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-purple-600
                                        flex items-center justify-center text-white font-medium text-sm shadow">
                            <Shield size={16} />
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {role.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700 font-mono">
                          {role.code}
                        </code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 max-w-xs truncate">
                        {role.description || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                          <Users size={14} />
                          {role.user_count || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                          <Key size={14} />
                          {role.permission_count || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            role.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              role.status === 'active'
                                ? 'bg-green-500'
                                : 'bg-gray-400'
                            }`}
                          />
                          {role.status === 'active' ? '启用' : '禁用'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(role.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canAssignRole && (
                            <button
                              onClick={() => handlePermClick(role)}
                              className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50
                                         rounded-lg transition-all duration-150"
                              title="分配权限"
                            >
                              <Key size={16} />
                            </button>
                          )}
                          {canUpdateRole && (
                            <button
                              onClick={() => handleEditClick(role)}
                              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50
                                         rounded-lg transition-all duration-150"
                              title="编辑"
                            >
                              <Edit2 size={16} />
                            </button>
                          )}
                          {canDeleteRole && (
                            <button
                              onClick={() => handleDeleteClick(role)}
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

        <RoleForm
          isOpen={formOpen}
          onClose={() => setFormOpen(false)}
          onSubmit={handleFormSubmit}
          role={editingRole}
          isLoading={formLoading}
        />

        <ConfirmModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setDeletingRole(null);
          }}
          onConfirm={handleDeleteConfirm}
          title="确认删除"
          message={
            deletingRole
              ? `确定要删除角色「${deletingRole.name}」吗？此操作不可恢复。`
              : ''
          }
          confirmText="删除"
          type="danger"
          isLoading={deleteLoading}
        />

        {permModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setPermModalOpen(false)}
            />
            <div
              className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4
                            animate-in fade-in slide-in-from-top-4 duration-200
                            max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">分配权限</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    为角色「{permRole?.name}」分配权限
                  </p>
                </div>
                <button
                  onClick={() => setPermModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-150"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                {permLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="animate-spin text-purple-600" size={32} />
                    <span className="ml-2 text-gray-500">加载中...</span>
                  </div>
                ) : (
                  <PermissionTree
                    permissions={permissions}
                    selectedIds={selectedPermIds}
                    onChange={setSelectedPermIds}
                    disabled={permSaving}
                  />
                )}
                <p className="mt-3 text-sm text-gray-500">
                  已选择 <span className="font-medium text-purple-600">{selectedPermIds.length}</span> 个权限
                </p>
              </div>

              <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setPermModalOpen(false)}
                  disabled={permSaving}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300
                             rounded-lg hover:bg-gray-50 transition-colors duration-150
                             disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handlePermSave}
                  disabled={permSaving || permLoading}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-purple-600
                             rounded-lg hover:bg-purple-700 transition-colors duration-150
                             disabled:opacity-50 disabled:cursor-not-allowed
                             inline-flex items-center gap-2"
                >
                  {permSaving && <Loader2 size={16} className="animate-spin" />}
                  {permSaving ? '保存中...' : '保存权限'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
