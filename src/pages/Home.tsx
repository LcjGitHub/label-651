import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Plus, Edit2, Trash2, Loader2, Shield, Upload, History, Users, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye } from 'lucide-react';
import { User, UserCreate, UserUpdate, Toast as ToastType } from '@/types';
import { userApi, UserListQuery } from '@/services/api';
import SearchBar from '@/components/SearchBar';
import UserForm from '@/components/UserForm';
import ConfirmModal from '@/components/ConfirmModal';
import Toast from '@/components/Toast';
import ImportModal from '@/components/ImportModal';
import ImportHistoryModal from '@/components/ImportHistoryModal';
import ExportDropdown from '@/components/ExportDropdown';
import AppHeader from '@/components/AppHeader';
import UserDetailModal from '@/components/UserDetailModal';
import SortHeaderIcon, { SortFieldType, SortOrderType } from '@/components/SortHeaderIcon';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

type SortField = SortFieldType;
type SortOrder = SortOrderType;

export default function Home() {
  const { hasPermission } = useAuthStore();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const canViewUser = hasPermission('user:view');
  const canCreateUser = hasPermission('user:create');
  const canUpdateUser = hasPermission('user:update');
  const canDeleteUser = hasPermission('user:delete');
  const canImportUser = hasPermission('user:import');
  const canExportUser = hasPermission('user:export');

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [viewingUserId, setViewingUserId] = useState<number | null>(null);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importHistoryModalOpen, setImportHistoryModalOpen] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [toasts, setToasts] = useState<ToastType[]>([]);
  const location = useLocation();

  const isInitialLoadRef = useRef(true);
  const queryParamsRef = useRef({ search: '', page: 1, pageSize: 10, sortBy: 'created_at' as SortField, sortOrder: 'desc' as SortOrder });

  const showToast = (type: ToastType['type'], message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { search, page: p, pageSize: ps, sortBy: sb, sortOrder: so } = queryParamsRef.current;
      const response = await userApi.getUsers({ search, page: p, pageSize: ps, sortBy: sb, sortOrder: so });
      if (response.success && response.data) {
        setUsers(response.data);
        const dbTotal = response.total || response.data.length;
        const fTotal = response.filteredTotal ?? dbTotal;
        setTotal(dbTotal);
        setFilteredTotal(fTotal);
        setSelectedIds([]);

        const dataCount = search && search.trim() ? fTotal : dbTotal;
        const newTotalPages = Math.max(1, Math.ceil(dataCount / ps));
        if (p > newTotalPages) {
          queryParamsRef.current.page = newTotalPages;
          setPage(newTotalPages);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载用户列表失败';
      showToast('error', message);
    } finally {
      setLoading(false);
      isInitialLoadRef.current = false;
    }
  }, []);

  const totalPages = useMemo(() => {
    const count = searchQuery && searchQuery.trim() ? filteredTotal : total;
    return Math.max(1, Math.ceil(count / pageSize));
  }, [filteredTotal, total, pageSize, searchQuery]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      queryParamsRef.current.page = newPage;
      setPage(newPage);
      fetchUsers();
    }
  };

  const handlePageSizeChange = (newPageSize: number) => {
    queryParamsRef.current.pageSize = newPageSize;
    queryParamsRef.current.page = 1;
    setPageSize(newPageSize);
    setPage(1);
    fetchUsers();
  };

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      const newOrder: SortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
      queryParamsRef.current.sortOrder = newOrder;
      setSortOrder(newOrder);
    } else {
      queryParamsRef.current.sortBy = field;
      queryParamsRef.current.sortOrder = 'asc';
      queryParamsRef.current.page = 1;
      setSortBy(field);
      setSortOrder('asc');
      setPage(1);
    }
    fetchUsers();
  };

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
    const state = location.state as { message?: string } | null;
    if (state?.message) {
      showToast('error', state.message);
      navigate('/', { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  const handleSearch = useCallback(
    (query: string) => {
      queryParamsRef.current.search = query;
      queryParamsRef.current.page = 1;
      setSearchQuery(query);
      setPage(1);
      fetchUsers();
    },
    [fetchUsers]
  );

  const handleAddClick = () => {
    setEditingUser(null);
    setFormOpen(true);
  };

  const handleViewClick = (user: User) => {
    setViewingUserId(user.id);
    setDetailModalOpen(true);
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
          fetchUsers();
        }
      } else {
        const response = await userApi.createUser(data as UserCreate);
        if (response.success) {
          showToast('success', response.message || '用户创建成功');
          setFormOpen(false);
          fetchUsers();
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
        fetchUsers();
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
        <AppHeader showToast={showToast} />

        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">用户列表</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {searchQuery && searchQuery.trim() ? (
                  <>
                    共 {filteredTotal} 条匹配结果 · 总计 {total} 条
                  </>
                ) : (
                  <>共 {total} 条数据</>
                )}
                {selectedIds.length > 0 && (
                  <span className="ml-2 text-blue-600">（已选 {selectedIds.length} 条）</span>
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

          {loading && isInitialLoadRef.current ? (
            <div className="p-16 flex flex-col items-center justify-center">
              <Loader2 className="animate-spin text-blue-600" size={40} />
              <p className="mt-4 text-gray-500">加载中...</p>
            </div>
          ) : users.length === 0 && !loading ? (
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
            <div className="relative">
              {loading && !isInitialLoadRef.current && (
                <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] flex items-center justify-center rounded-b-2xl">
                  <div className="flex flex-col items-center">
                    <Loader2 className="animate-spin text-blue-600" size={32} />
                    <p className="mt-3 text-sm text-gray-600 font-medium">加载中...</p>
                  </div>
                </div>
              )}
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
                    <th
                      role="columnheader button"
                      tabIndex={0}
                      aria-sort={sortBy === 'name' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                      aria-label={`按姓名排序，当前${sortBy === 'name' ? (sortOrder === 'asc' ? '升序' : '降序') : '未排序'}`}
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group select-none focus:outline-none focus:bg-gray-100 focus:ring-2 focus:ring-inset focus:ring-blue-500"
                      onClick={() => handleSort('name')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSort('name');
                        }
                      }}
                    >
                      <span className="inline-flex items-center">
                        姓名
                        <SortHeaderIcon field="name" currentSortBy={sortBy} currentSortOrder={sortOrder} />
                      </span>
                    </th>
                    <th
                      role="columnheader button"
                      tabIndex={0}
                      aria-sort={sortBy === 'email' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                      aria-label={`按邮箱排序，当前${sortBy === 'email' ? (sortOrder === 'asc' ? '升序' : '降序') : '未排序'}`}
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group select-none focus:outline-none focus:bg-gray-100 focus:ring-2 focus:ring-inset focus:ring-blue-500"
                      onClick={() => handleSort('email')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSort('email');
                        }
                      }}
                    >
                      <span className="inline-flex items-center">
                        邮箱
                        <SortHeaderIcon field="email" currentSortBy={sortBy} currentSortOrder={sortOrder} />
                      </span>
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
                    <th
                      role="columnheader button"
                      tabIndex={0}
                      aria-sort={sortBy === 'created_at' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                      aria-label={`按创建时间排序，当前${sortBy === 'created_at' ? (sortOrder === 'asc' ? '升序' : '降序') : '未排序'}`}
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group select-none focus:outline-none focus:bg-gray-100 focus:ring-2 focus:ring-inset focus:ring-blue-500"
                      onClick={() => handleSort('created_at')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSort('created_at');
                        }
                      }}
                    >
                      <span className="inline-flex items-center">
                        创建时间
                        <SortHeaderIcon field="created_at" currentSortBy={sortBy} currentSortOrder={sortOrder} />
                      </span>
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
                          {canViewUser && (
                            <button
                              onClick={() => handleViewClick(user)}
                              className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50
                                         rounded-lg transition-all duration-150"
                              title="查看"
                            >
                              <Eye size={16} />
                            </button>
                          )}
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
            {users.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>共</span>
                  <span className="font-semibold text-gray-900">
                    {searchQuery && searchQuery.trim() ? filteredTotal : total}
                  </span>
                  <span>条</span>
                  <span className="text-gray-300 mx-2">·</span>
                  <span>每页</span>
                  <select
                    value={pageSize}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    className="px-2 py-1 border border-gray-300 rounded-md text-sm font-medium
                               bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500
                               focus:border-blue-500 cursor-pointer"
                    aria-label="选择每页显示条数"
                  >
                    {[10, 20, 50, 100].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                  <span>条</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={page === 1}
                    className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40
                               disabled:cursor-not-allowed transition-colors"
                    title="首页"
                  >
                    <ChevronsLeft size={16} />
                  </button>
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                    className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40
                               disabled:cursor-not-allowed transition-colors"
                    title="上一页"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="flex items-center gap-1 mx-2">
                    {(() => {
                      const pages: (number | '...')[] = [];
                      const maxVisible = 5;
                      const end = Math.min(totalPages, Math.max(1, page - Math.floor(maxVisible / 2)) + maxVisible - 1);
                      const start = Math.max(1, end - maxVisible + 1);
                      if (start > 1) {
                        pages.push(1);
                        if (start > 2) pages.push('...');
                      }
                      for (let i = start; i <= end; i++) {
                        pages.push(i);
                      }
                      if (end < totalPages) {
                        if (end < totalPages - 1) pages.push('...');
                        pages.push(totalPages);
                      }
                      return pages.map((p, idx) =>
                        p === '...' ? (
                          <span key={`dots-${idx}`} className="px-2 text-gray-400">
                            ...
                          </span>
                        ) : (
                          <button
                            key={p}
                            onClick={() => handlePageChange(p)}
                            className={`min-w-[32px] h-8 px-2 rounded-md text-sm font-medium transition-colors ${
                              p === page
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {p}
                          </button>
                        )
                      );
                    })()}
                  </div>
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40
                               disabled:cursor-not-allowed transition-colors"
                    title="下一页"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40
                               disabled:cursor-not-allowed transition-colors"
                    title="末页"
                  >
                    <ChevronsRight size={16} />
                  </button>
                </div>
              </div>
            )}
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
          onSuccess={() => fetchUsers()}
          showToast={showToast}
        />

        <ImportHistoryModal
          isOpen={importHistoryModalOpen}
          onClose={() => setImportHistoryModalOpen(false)}
          showToast={showToast}
        />

        <UserDetailModal
          isOpen={detailModalOpen}
          onClose={() => {
            setDetailModalOpen(false);
            setViewingUserId(null);
          }}
          userId={viewingUserId}
          onEdit={(user) => {
            setEditingUser(user);
            setFormOpen(true);
          }}
        />
      </div>
    </div>
  );
}
