import { useState, useEffect } from 'react';
import { X, Check, Shield } from 'lucide-react';
import { Role } from '@/types';
import { roleApi } from '@/services/api';

interface RoleSelectProps {
  selectedRoleIds: number[];
  onChange: (roleIds: number[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function RoleSelect({
  selectedRoleIds,
  onChange,
  disabled = false,
  placeholder = '请选择角色',
}: RoleSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        setLoading(true);
        const response = await roleApi.getAllRoles();
        if (response.success && response.data) {
          setRoles(response.data);
        }
      } catch (err) {
        console.error('获取角色列表失败:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, []);

  const selectedRoles = roles.filter((r) => selectedRoleIds.includes(r.id));

  const handleToggle = (roleId: number) => {
    if (disabled) return;
    const newSelected = selectedRoleIds.includes(roleId)
      ? selectedRoleIds.filter((id) => id !== roleId)
      : [...selectedRoleIds, roleId];
    onChange(newSelected);
  };

  const handleRemove = (roleId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onChange(selectedRoleIds.filter((id) => id !== roleId));
  };

  const handleSelectAll = () => {
    if (disabled) return;
    const allActiveIds = roles
      .filter((r) => r.status === 'active')
      .map((r) => r.id);
    onChange(allActiveIds);
  };

  const handleClear = () => {
    if (disabled) return;
    onChange([]);
  };

  return (
    <div className="relative">
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`min-h-[42px] px-3 py-2 border rounded-lg cursor-pointer
                   flex flex-wrap items-center gap-2
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   transition-all duration-200 ${
                     disabled
                       ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-60'
                       : 'bg-white border-gray-300 hover:border-blue-400'
                   }`}
      >
        {selectedRoles.length === 0 ? (
          <span className="text-gray-400 text-sm">{placeholder}</span>
        ) : (
          selectedRoles.map((role) => (
            <span
              key={role.id}
              className="inline-flex items-center gap-1 px-2.5 py-1
                         bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
            >
              <Shield size={12} />
              {role.name}
              {!disabled && (
                <button
                  onClick={(e) => handleRemove(role.id, e)}
                  className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                >
                  <X size={10} />
                </button>
              )}
            </span>
          ))
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                disabled={disabled}
                className="px-2.5 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded
                          transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                全选
              </button>
              <button
                type="button"
                onClick={handleClear}
                disabled={disabled}
                className="px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded
                          transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                清空
              </button>
            </div>
            <span className="text-xs text-gray-500">
              已选 {selectedRoleIds.length} 个
            </span>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-gray-500 text-sm">加载中...</div>
            ) : roles.length === 0 ? (
              <div className="py-8 text-center text-gray-500 text-sm">暂无角色数据</div>
            ) : (
              roles.map((role) => {
                const isSelected = selectedRoleIds.includes(role.id);
                const isDisabled = disabled || role.status !== 'active';

                return (
                  <div
                    key={role.id}
                    onClick={() => !isDisabled && handleToggle(role.id)}
                    className={`flex items-center px-3 py-2.5 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50'
                        : isDisabled
                        ? 'bg-gray-50 opacity-50 cursor-not-allowed'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 border rounded flex items-center justify-center mr-3
                                 transition-all duration-150 ${
                                   isSelected
                                     ? 'bg-blue-600 border-blue-600'
                                     : isDisabled
                                     ? 'bg-gray-200 border-gray-300'
                                     : 'border-gray-300'
                                 }`}
                    >
                      {isSelected && <Check size={12} className="text-white" />}
                    </div>
                    <Shield
                      size={16}
                      className={`mr-2 ${
                        role.status === 'active' ? 'text-blue-500' : 'text-gray-400'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-medium ${
                            role.status === 'active' ? 'text-gray-800' : 'text-gray-400'
                          }`}
                        >
                          {role.name}
                        </span>
                        {role.status !== 'active' && (
                          <span className="text-xs text-gray-400">(已禁用)</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 font-mono truncate">
                        {role.code}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
