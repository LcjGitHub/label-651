import { X, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Role, RoleCreate, RoleUpdate, Permission } from '@/types';
import PermissionTree from './PermissionTree';
import { permissionApi } from '@/services/api';

interface RoleFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RoleCreate | RoleUpdate) => Promise<void>;
  role?: Role | null;
  isLoading?: boolean;
}

interface FormErrors {
  name?: string;
  code?: string;
}

export default function RoleForm({
  isOpen,
  onClose,
  onSubmit,
  role,
  isLoading = false,
}: RoleFormProps) {
  const [formData, setFormData] = useState<RoleCreate>({
    name: '',
    code: '',
    description: '',
    status: 'active',
    permission_ids: [],
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        setLoadingPermissions(true);
        const response = await permissionApi.getPermissionTree();
        if (response.success && response.data) {
          setPermissions(response.data);
        }
      } catch (err) {
        console.error('获取权限列表失败:', err);
      } finally {
        setLoadingPermissions(false);
      }
    };

    if (isOpen) {
      fetchPermissions();
    }
  }, [isOpen]);

  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name,
        code: role.code,
        description: role.description,
        status: role.status,
        permission_ids: role.permissions ? [] : [],
      });
      const collectIds = (perms: Permission[]): number[] => {
        let ids: number[] = [];
        perms.forEach((p) => {
          ids.push(p.id);
          if (p.children) {
            ids = ids.concat(collectIds(p.children));
          }
        });
        return ids;
      };
      if (role.permissions) {
        setSelectedPermissionIds(collectIds(role.permissions));
      }
    } else {
      setFormData({
        name: '',
        code: '',
        description: '',
        status: 'active',
        permission_ids: [],
      });
      setSelectedPermissionIds([]);
    }
    setErrors({});
  }, [role, isOpen]);

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

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = '角色名称不能为空';
    }

    if (!formData.code.trim()) {
      newErrors.code = '角色编码不能为空';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const submitData = role
      ? {
          ...formData,
          permission_ids: selectedPermissionIds,
        }
      : {
          ...formData,
          permission_ids: selectedPermissionIds,
        };

    await onSubmit(submitData);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  if (!isOpen) return null;

  const isEditing = !!role;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4
                      animate-in fade-in slide-in-from-top-4 duration-200
                      max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? '编辑角色' : '新增角色'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-150"
            aria-label="关闭"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                角色名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="请输入角色名称"
                className={`w-full px-4 py-2.5 border rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           transition-all duration-200 ${
                             errors.name
                               ? 'border-red-500 focus:ring-red-500'
                               : 'border-gray-300'
                           }`}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-500">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                角色编码 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                placeholder="如：admin, user"
                className={`w-full px-4 py-2.5 border rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           transition-all duration-200 ${
                             errors.code
                               ? 'border-red-500 focus:ring-red-500'
                               : 'border-gray-300'
                           }`}
              />
              {errors.code && (
                <p className="mt-1 text-xs text-red-500">{errors.code}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              描述
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="请输入角色描述（选填）"
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         transition-all duration-200 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              状态
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         transition-all duration-200 bg-white"
            >
              <option value="active">启用</option>
              <option value="inactive">禁用</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              分配权限
            </label>
            {loadingPermissions ? (
              <div className="flex items-center justify-center py-8 border border-gray-200 rounded-lg">
                <Loader2 className="animate-spin text-blue-600" size={24} />
                <span className="ml-2 text-gray-500">加载权限中...</span>
              </div>
            ) : (
              <PermissionTree
                permissions={permissions}
                selectedIds={selectedPermissionIds}
                onChange={setSelectedPermissionIds}
                disabled={isLoading}
              />
            )}
            <p className="mt-1.5 text-xs text-gray-400">
              已选择 {selectedPermissionIds.length} 个权限
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100
                         rounded-lg hover:bg-gray-200 transition-colors duration-150
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isLoading || loadingPermissions}
              className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600
                         rounded-lg hover:bg-blue-700 transition-colors duration-150
                         disabled:opacity-50 disabled:cursor-not-allowed
                         inline-flex items-center gap-2"
            >
              {isLoading && <Loader2 size={16} className="animate-spin" />}
              {isLoading ? '保存中...' : isEditing ? '保存' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
