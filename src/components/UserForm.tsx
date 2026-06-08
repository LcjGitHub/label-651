import { X, Upload, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { User, UserCreate, UserUpdate } from '@/types';
import { userApi } from '@/services/api';
import RoleSelect from './RoleSelect';
import UserAvatar from './UserAvatar';

interface UserFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UserCreate | UserUpdate) => Promise<void>;
  user?: User | null;
  isLoading?: boolean;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

export default function UserForm({
  isOpen,
  onClose,
  onSubmit,
  user,
  isLoading = false,
}: UserFormProps) {
  const [formData, setFormData] = useState<UserCreate & { role_ids: number[] }>({
    name: '',
    email: '',
    phone: '',
    status: 'active',
    role_ids: [],
    avatar: undefined,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        phone: user.phone,
        status: user.status,
        role_ids: user.roles?.map((r) => r.id) || [],
        avatar: user.avatar || undefined,
      });
      setPreviewAvatar(user.avatar || null);
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        status: 'active',
        role_ids: [],
        avatar: undefined,
      });
      setPreviewAvatar(null);
    }
    setErrors({});
    setAvatarUploading(false);
    setUploadProgress(0);
  }, [user, isOpen]);

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
      newErrors.name = '姓名不能为空';
    }

    if (!formData.email.trim()) {
      newErrors.email = '邮箱不能为空';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '邮箱格式不正确';
    }

    if (formData.phone && !/^1[3-9]\d{9}$/.test(formData.phone)) {
      newErrors.phone = '手机号格式不正确';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateImageFile = (file: File): string | null => {
    const maxSize = 2 * 1024 * 1024;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];

    if (!allowedTypes.includes(file.type)) {
      return '只允许上传 JPG、PNG 或 GIF 格式的图片';
    }
    if (file.size > maxSize) {
      return '图片大小不能超过 2MB';
    }
    return null;
  };

  const handleAvatarFile = async (file: File) => {
    const validationError = validateImageFile(file);
    if (validationError) {
      setErrors((prev) => ({ ...prev, avatar: validationError }));
      return;
    }

    setErrors((prev) => ({ ...prev, avatar: undefined }));

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewAvatar(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    if (user) {
      try {
        setAvatarUploading(true);
        setUploadProgress(0);

        const response = await userApi.uploadAvatar(user.id, file, (percent) => {
          setUploadProgress(percent);
        });

        if (response.success && response.data) {
          setFormData((prev) => ({ ...prev, avatar: response.data!.avatarUrl }));
          setPreviewAvatar(response.data!.avatarUrl);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : '头像上传失败';
        setErrors((prev) => ({ ...prev, avatar: message }));
        setPreviewAvatar(user.avatar || null);
      } finally {
        setAvatarUploading(false);
        setUploadProgress(0);
      }
    } else {
      setFormData((prev) => ({ ...prev, avatar: file.name }));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleAvatarFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleAvatarFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const submitData = user
      ? { ...formData }
      : { ...formData };

    await onSubmit(submitData);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleRoleChange = (roleIds: number[]) => {
    setFormData((prev) => ({ ...prev, role_ids: roleIds }));
  };

  if (!isOpen) return null;

  const isEditing = !!user;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4
                      animate-in fade-in slide-in-from-top-4 duration-200"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? '编辑用户' : '新增用户'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-150"
            aria-label="关闭"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              头像
            </label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !avatarUploading && fileInputRef.current?.click()}
              className={`relative flex items-center justify-center gap-4 p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
              } ${avatarUploading ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              <div className="flex items-center gap-4">
                <UserAvatar
                  name={formData.name || 'U'}
                  avatar={previewAvatar}
                  size="xl"
                />
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Upload size={16} />
                    <span className="font-medium">
                      {avatarUploading ? '上传中...' : '点击或拖拽上传头像'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    支持 JPG、PNG、GIF 格式，大小不超过 2MB
                  </span>
                </div>
              </div>

              {avatarUploading && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl">
                  <div className="flex flex-col items-center gap-2 w-3/4">
                    <Loader2 className="animate-spin text-blue-600" size={24} />
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600 font-medium">
                      {uploadProgress}%
                    </span>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
            {errors.avatar && (
              <p className="mt-1 text-xs text-red-500">{errors.avatar}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              姓名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="请输入姓名"
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
              邮箱 <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="请输入邮箱"
              className={`w-full px-4 py-2.5 border rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         transition-all duration-200 ${
                           errors.email
                             ? 'border-red-500 focus:ring-red-500'
                             : 'border-gray-300'
                         }`}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              手机号
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="请输入手机号（选填）"
              className={`w-full px-4 py-2.5 border rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         transition-all duration-200 ${
                           errors.phone
                             ? 'border-red-500 focus:ring-red-500'
                             : 'border-gray-300'
                         }`}
            />
            {errors.phone && (
              <p className="mt-1 text-xs text-red-500">{errors.phone}</p>
            )}
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
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              分配角色
            </label>
            <RoleSelect
              selectedRoleIds={formData.role_ids}
              onChange={handleRoleChange}
              disabled={isLoading}
              placeholder="请选择用户角色"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading || avatarUploading}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100
                         rounded-lg hover:bg-gray-200 transition-colors duration-150
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isLoading || avatarUploading}
              className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600
                         rounded-lg hover:bg-blue-700 transition-colors duration-150
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '保存中...' : isEditing ? '保存' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
