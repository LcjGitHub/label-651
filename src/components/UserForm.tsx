import { X, Upload, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { User, UserCreate, UserUpdate } from '@/types';
import { userApi } from '@/services/api';
import RoleSelect from './RoleSelect';
import UserAvatar from './UserAvatar';
import AvatarCropper from './AvatarCropper';

interface UserFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (user: User) => void;
  onError?: (message: string) => void;
  user?: User | null;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

type FormStage = 'editing' | 'submitting' | 'uploading';

export default function UserForm({
  isOpen,
  onClose,
  onSaved,
  onError,
  user,
}: UserFormProps) {
  const [formData, setFormData] = useState<UserCreate & { role_ids: number[] }>({
    name: '',
    email: '',
    phone: '',
    status: 'active',
    role_ids: [],
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [stage, setStage] = useState<FormStage>('editing');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [pendingCropperSrc, setPendingCropperSrc] = useState<string | null>(null);
  const [croppedAvatarFile, setCroppedAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!user;

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        phone: user.phone,
        status: user.status,
        role_ids: user.roles?.map((r) => r.id) || [],
      });
      setPreviewAvatar(user.avatar || null);
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        status: 'active',
        role_ids: [],
      });
      setPreviewAvatar(null);
    }
    setErrors({});
    setStage('editing');
    setUploadProgress(0);
    setCroppedAvatarFile(null);
    setPendingCropperSrc(null);
  }, [user, isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && stage === 'editing' && !pendingCropperSrc) {
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
  }, [isOpen, onClose, stage, pendingCropperSrc]);

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

  const openCropperForFile = (file: File) => {
    const validationError = validateImageFile(file);
    if (validationError) {
      setErrors((prev) => ({ ...prev, avatar: validationError }));
      return;
    }
    setErrors((prev) => ({ ...prev, avatar: undefined }));

    const reader = new FileReader();
    reader.onload = (e) => {
      setPendingCropperSrc(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      openCropperForFile(file);
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
      openCropperForFile(file);
    }
  };

  const handleCropperConfirm = (croppedFile: File) => {
    setCroppedAvatarFile(croppedFile);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewAvatar(e.target?.result as string);
    };
    reader.readAsDataURL(croppedFile);
    setPendingCropperSrc(null);
  };

  const handleCropperClose = () => {
    setPendingCropperSrc(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || stage !== 'editing') return;

    try {
      setStage('submitting');
      let savedUser: User | null = null;

      if (isEditing && user) {
        const updatePayload: UserUpdate = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          status: formData.status,
          role_ids: formData.role_ids,
        };
        const response = await userApi.updateUser(user.id, updatePayload);
        if (response.success && response.data) {
          savedUser = response.data;
        }
      } else {
        const createPayload: UserCreate = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          status: formData.status,
          role_ids: formData.role_ids,
        };
        const response = await userApi.createUser(createPayload);
        if (response.success && response.data) {
          savedUser = response.data;
        }
      }

      if (!savedUser) {
        setStage('editing');
        return;
      }

      if (croppedAvatarFile) {
        setStage('uploading');
        setUploadProgress(0);
        const uploadResponse = await userApi.uploadAvatar(
          savedUser.id,
          croppedAvatarFile,
          (percent) => setUploadProgress(percent)
        );
        if (uploadResponse.success && uploadResponse.data) {
          savedUser = uploadResponse.data.user;
        }
      }

      onSaved(savedUser);
    } catch (err) {
      const message = err instanceof Error ? err.message : '操作失败';
      setStage('editing');
      if (onError) {
        onError(message);
      }
    }
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

  const isBusy = stage !== 'editing';
  const submitButtonLabel =
    stage === 'submitting'
      ? '保存中...'
      : stage === 'uploading'
      ? `上传头像 ${uploadProgress}%`
      : isEditing
      ? '保存'
      : '创建';

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
            disabled={isBusy}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-150
                       disabled:opacity-50 disabled:cursor-not-allowed"
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
              onClick={() => !isBusy && fileInputRef.current?.click()}
              className={`relative flex items-center justify-center gap-4 p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
              } ${isBusy ? 'cursor-not-allowed opacity-60' : ''}`}
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
                      {isBusy ? '处理中...' : '点击或拖拽上传头像'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    支持 JPG、PNG、GIF 格式，大小不超过 2MB
                  </span>
                </div>
              </div>

              {stage === 'uploading' && (
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
                      上传中 {uploadProgress}%
                    </span>
                  </div>
                </div>
              )}

              {stage === 'submitting' && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="animate-spin text-blue-600" size={24} />
                    <span className="text-xs text-gray-600 font-medium">保存中...</span>
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
              disabled={isBusy}
              className={`w-full px-4 py-2.5 border rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
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
              disabled={isBusy}
              className={`w-full px-4 py-2.5 border rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
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
              disabled={isBusy}
              className={`w-full px-4 py-2.5 border rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
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
              disabled={isBusy}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         transition-all duration-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
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
              disabled={isBusy}
              placeholder="请选择用户角色"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isBusy}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100
                         rounded-lg hover:bg-gray-200 transition-colors duration-150
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isBusy}
              className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600
                         rounded-lg hover:bg-blue-700 transition-colors duration-150
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitButtonLabel}
            </button>
          </div>
        </form>

        <AvatarCropper
          isOpen={!!pendingCropperSrc}
          imageSrc={pendingCropperSrc || ''}
          onClose={handleCropperClose}
          onConfirm={handleCropperConfirm}
        />
      </div>
    </div>
  );
}
