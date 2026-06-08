import {
  User,
  UserCreate,
  UserUpdate,
  UserDetail,
  Role,
  RoleCreate,
  RoleUpdate,
  Permission,
  PermissionCreate,
  PermissionUpdate,
  ApiResponse,
  LoginResponse,
  OperationLog,
  OperationLogQuery,
  ImportResult,
  ImportHistory,
  Message,
  MessageCreate,
  MessageQuery,
  BatchOperationResult,
  ExportTemplate,
  ExportField,
  SearchHistory,
} from '@/types';

const API_BASE_URL = '/api';

let currentUserId: number | null = null;

export const setCurrentUserId = (id: number | null) => {
  currentUserId = id;
  if (id) {
    localStorage.setItem('current_user_id', String(id));
  } else {
    localStorage.removeItem('current_user_id');
  }
};

export const getCurrentUserId = (): number | null => {
  if (currentUserId !== null) return currentUserId;
  const stored = localStorage.getItem('current_user_id');
  if (stored) {
    currentUserId = parseInt(stored);
    return currentUserId;
  }
  return null;
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  try {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || '请求失败，请稍后重试');
    }
    return data;
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('响应数据解析失败');
  }
};

const handleRequest = async <T>(
  url: string,
  options?: RequestInit
): Promise<T> => {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (options?.headers) {
      if (options.headers instanceof Headers) {
        options.headers.forEach((value, key) => {
          headers[key] = value;
        });
      } else if (Array.isArray(options.headers)) {
        options.headers.forEach(([key, value]) => {
          headers[key] = value;
        });
      } else {
        Object.assign(headers, options.headers);
      }
    }

    const userId = getCurrentUserId();
    if (userId) {
      headers['x-user-id'] = String(userId);
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });
    return handleResponse<T>(response);
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
      throw new Error('无法连接服务器，请确认后端已启动');
    }
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('网络请求失败，请检查网络连接');
  }
};

export interface UserListQuery {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'name' | 'email' | 'created_at';
  sortOrder?: 'asc' | 'desc';
  statuses?: string[];
  created_at_start?: string;
  created_at_end?: string;
  phone_prefix?: string;
}

export interface UserExportParams {
  search?: string;
  ids?: number[];
  statuses?: string[];
  created_at_start?: string;
  created_at_end?: string;
  phone_prefix?: string;
  fields?: string[];
}

export const userApi = {
  getUsers: async (params?: UserListQuery): Promise<ApiResponse<User[]>> => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            if (value.length > 0) {
              searchParams.append(key, value.join(','));
            }
          } else {
            searchParams.append(key, String(value));
          }
        }
      });
    }
    const queryString = searchParams.toString();
    const url = queryString ? `${API_BASE_URL}/users?${queryString}` : `${API_BASE_URL}/users`;
    return handleRequest<ApiResponse<User[]>>(url);
  },

  getUser: async (id: number): Promise<ApiResponse<User>> => {
    return handleRequest<ApiResponse<User>>(`${API_BASE_URL}/users/${id}`);
  },

  getUserDetail: async (id: number): Promise<ApiResponse<UserDetail>> => {
    return handleRequest<ApiResponse<UserDetail>>(`${API_BASE_URL}/users/${id}/detail`);
  },

  createUser: async (user: UserCreate): Promise<ApiResponse<User>> => {
    return handleRequest<ApiResponse<User>>(`${API_BASE_URL}/users`, {
      method: 'POST',
      body: JSON.stringify(user),
    });
  },

  updateUser: async (id: number, user: UserUpdate): Promise<ApiResponse<User>> => {
    return handleRequest<ApiResponse<User>>(`${API_BASE_URL}/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(user),
    });
  },

  deleteUser: async (id: number): Promise<ApiResponse> => {
    return handleRequest<ApiResponse>(`${API_BASE_URL}/users/${id}`, {
      method: 'DELETE',
    });
  },

  getUserRoles: async (id: number): Promise<ApiResponse<{ roles: Role[]; role_ids: number[] }>> => {
    return handleRequest<ApiResponse<{ roles: Role[]; role_ids: number[] }>>(
      `${API_BASE_URL}/users/${id}/roles`
    );
  },

  assignUserRoles: async (id: number, roleIds: number[]): Promise<ApiResponse> => {
    return handleRequest<ApiResponse>(`${API_BASE_URL}/users/${id}/roles`, {
      method: 'PUT',
      body: JSON.stringify({ role_ids: roleIds }),
    });
  },

  importUsers: async (file: File, onProgress?: (percent: number) => void): Promise<ApiResponse<ImportResult>> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/users/import`);

      const userId = getCurrentUserId();
      if (userId) {
        xhr.setRequestHeader('x-user-id', String(userId));
      }

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(data);
          } else {
            reject(new Error(data.message || '导入失败'));
          }
        } catch {
          reject(new Error('响应数据解析失败'));
        }
      };

      xhr.onerror = () => {
        reject(new Error('网络请求失败'));
      };

      xhr.send(formData);
    });
  },

  exportUsers: async (params?: UserExportParams): Promise<ApiResponse<{ downloadUrl: string; fileName: string; count: number }>> => {
    return handleRequest<ApiResponse<{ downloadUrl: string; fileName: string; count: number }>>(`${API_BASE_URL}/users/export`, {
      method: 'POST',
      body: JSON.stringify(params || {}),
    });
  },

  getExportTemplate: async (): Promise<ApiResponse<{ downloadUrl: string; fileName: string }>> => {
    return handleRequest<ApiResponse<{ downloadUrl: string; fileName: string }>>(`${API_BASE_URL}/users/export/template`);
  },

  getExportFields: async (): Promise<ApiResponse<{ fields: ExportField[]; defaultFields: string[] }>> => {
    return handleRequest<ApiResponse<{ fields: ExportField[]; defaultFields: string[] }>>(`${API_BASE_URL}/users/export/fields`);
  },

  getExportTemplates: async (module: string = 'users'): Promise<ApiResponse<ExportTemplate[]>> => {
    return handleRequest<ApiResponse<ExportTemplate[]>>(`${API_BASE_URL}/users/export/templates?module=${encodeURIComponent(module)}`);
  },

  createExportTemplate: async (data: { name: string; module?: string; fields: string[] }): Promise<ApiResponse<ExportTemplate>> => {
    return handleRequest<ApiResponse<ExportTemplate>>(`${API_BASE_URL}/users/export/templates`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateExportTemplate: async (id: number, data: { name?: string; fields?: string[] }): Promise<ApiResponse<ExportTemplate>> => {
    return handleRequest<ApiResponse<ExportTemplate>>(`${API_BASE_URL}/users/export/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteExportTemplate: async (id: number): Promise<ApiResponse> => {
    return handleRequest<ApiResponse>(`${API_BASE_URL}/users/export/templates/${id}`, {
      method: 'DELETE',
    });
  },

  getImportHistory: async (): Promise<ApiResponse<ImportHistory[]>> => {
    return handleRequest<ApiResponse<ImportHistory[]>>(`${API_BASE_URL}/users/import/history`);
  },

  uploadAvatar: async (
    userId: number,
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<ApiResponse<{ avatarUrl: string; user: User }>> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('avatar', file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/users/${userId}/avatar`);

      const currentUserId = getCurrentUserId();
      if (currentUserId) {
        xhr.setRequestHeader('x-user-id', String(currentUserId));
      }

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(data);
          } else {
            reject(new Error(data.message || '头像上传失败'));
          }
        } catch {
          reject(new Error('响应数据解析失败'));
        }
      };

      xhr.onerror = () => {
        reject(new Error('网络请求失败'));
      };

      xhr.send(formData);
    });
  },

  batchOperateUsers: async (action: 'delete' | 'enable' | 'disable', ids: number[]): Promise<ApiResponse<BatchOperationResult>> => {
    return handleRequest<ApiResponse<BatchOperationResult>>(`${API_BASE_URL}/users/batch`, {
      method: 'POST',
      body: JSON.stringify({ action, ids }),
    });
  },

  getSearchHistory: async (module: string = 'users'): Promise<ApiResponse<SearchHistory[]>> => {
    return handleRequest<ApiResponse<SearchHistory[]>>(`${API_BASE_URL}/users/search-history?module=${encodeURIComponent(module)}`);
  },

  saveSearchHistory: async (data: { module?: string; keyword?: string; filters?: Record<string, unknown> }): Promise<ApiResponse> => {
    return handleRequest<ApiResponse>(`${API_BASE_URL}/users/search-history`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteSearchHistory: async (id: number): Promise<ApiResponse> => {
    return handleRequest<ApiResponse>(`${API_BASE_URL}/users/search-history/${id}`, {
      method: 'DELETE',
    });
  },

  clearSearchHistory: async (module: string = 'users'): Promise<ApiResponse> => {
    return handleRequest<ApiResponse>(`${API_BASE_URL}/users/search-history?module=${encodeURIComponent(module)}`, {
      method: 'DELETE',
    });
  },
};

export const roleApi = {
  getRoles: async (search?: string): Promise<ApiResponse<Role[]>> => {
    const url = search
      ? `${API_BASE_URL}/roles?search=${encodeURIComponent(search)}`
      : `${API_BASE_URL}/roles`;
    return handleRequest<ApiResponse<Role[]>>(url);
  },

  getAllRoles: async (): Promise<ApiResponse<Role[]>> => {
    return handleRequest<ApiResponse<Role[]>>(`${API_BASE_URL}/roles/all`);
  },

  getRole: async (id: number): Promise<ApiResponse<Role>> => {
    return handleRequest<ApiResponse<Role>>(`${API_BASE_URL}/roles/${id}`);
  },

  getRolePermissions: async (
    id: number
  ): Promise<ApiResponse<{ permissions: Permission[]; permission_ids: number[] }>> => {
    return handleRequest<
      ApiResponse<{ permissions: Permission[]; permission_ids: number[] }>
    >(`${API_BASE_URL}/roles/${id}/permissions`);
  },

  createRole: async (role: RoleCreate): Promise<ApiResponse<Role>> => {
    return handleRequest<ApiResponse<Role>>(`${API_BASE_URL}/roles`, {
      method: 'POST',
      body: JSON.stringify(role),
    });
  },

  updateRole: async (
    id: number,
    role: RoleUpdate
  ): Promise<ApiResponse<Role>> => {
    return handleRequest<ApiResponse<Role>>(`${API_BASE_URL}/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(role),
    });
  },

  assignRolePermissions: async (
    id: number,
    permissionIds: number[]
  ): Promise<ApiResponse> => {
    return handleRequest<ApiResponse>(`${API_BASE_URL}/roles/${id}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permission_ids: permissionIds }),
    });
  },

  deleteRole: async (id: number): Promise<ApiResponse> => {
    return handleRequest<ApiResponse>(`${API_BASE_URL}/roles/${id}`, {
      method: 'DELETE',
    });
  },
};

export const permissionApi = {
  getPermissions: async (
    type?: 'menu' | 'action',
    tree?: boolean
  ): Promise<ApiResponse<Permission[]>> => {
    let url = `${API_BASE_URL}/permissions`;
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (tree) params.append('tree', 'true');
    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;
    return handleRequest<ApiResponse<Permission[]>>(url);
  },

  getPermissionTree: async (): Promise<ApiResponse<Permission[]>> => {
    return handleRequest<ApiResponse<Permission[]>>(
      `${API_BASE_URL}/permissions/tree`
    );
  },

  getPermission: async (id: number): Promise<ApiResponse<Permission>> => {
    return handleRequest<ApiResponse<Permission>>(
      `${API_BASE_URL}/permissions/${id}`
    );
  },

  createPermission: async (
    permission: PermissionCreate
  ): Promise<ApiResponse<Permission>> => {
    return handleRequest<ApiResponse<Permission>>(
      `${API_BASE_URL}/permissions`,
      {
        method: 'POST',
        body: JSON.stringify(permission),
      }
    );
  },

  updatePermission: async (
    id: number,
    permission: PermissionUpdate
  ): Promise<ApiResponse<Permission>> => {
    return handleRequest<ApiResponse<Permission>>(
      `${API_BASE_URL}/permissions/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(permission),
      }
    );
  },

  deletePermission: async (id: number): Promise<ApiResponse> => {
    return handleRequest<ApiResponse>(`${API_BASE_URL}/permissions/${id}`, {
      method: 'DELETE',
    });
  },
};

export const authApi = {
  login: async (userId: number): Promise<ApiResponse<LoginResponse>> => {
    return handleRequest<ApiResponse<LoginResponse>>(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  },

  getCurrentUser: async (): Promise<ApiResponse<LoginResponse>> => {
    return handleRequest<ApiResponse<LoginResponse>>(`${API_BASE_URL}/auth/me`);
  },

  getLoginUsers: async (): Promise<ApiResponse<Pick<User, 'id' | 'name' | 'email'>[]>> => {
    return handleRequest<ApiResponse<Pick<User, 'id' | 'name' | 'email'>[]>>(
      `${API_BASE_URL}/auth/users`
    );
  },
};

export const operationLogApi = {
  getLogs: async (params?: OperationLogQuery): Promise<ApiResponse<OperationLog[]>> => {
    let url = `${API_BASE_URL}/operation-logs`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) url += `?${queryString}`;
    }
    return handleRequest<ApiResponse<OperationLog[]>>(url);
  },

  getLog: async (id: number): Promise<ApiResponse<OperationLog>> => {
    return handleRequest<ApiResponse<OperationLog>>(`${API_BASE_URL}/operation-logs/${id}`);
  },

  getModules: async (): Promise<ApiResponse<string[]>> => {
    return handleRequest<ApiResponse<string[]>>(`${API_BASE_URL}/operation-logs/modules`);
  },

  getOperators: async (): Promise<ApiResponse<{ id: number; name: string }[]>> => {
    return handleRequest<ApiResponse<{ id: number; name: string }[]>>(
      `${API_BASE_URL}/operation-logs/operators`
    );
  },
};

export const messageApi = {
  getMessages: async (
    params?: MessageQuery
  ): Promise<ApiResponse<Message[]> & { unread_count?: number }> => {
    let url = `${API_BASE_URL}/messages`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) url += `?${queryString}`;
    }
    return handleRequest<ApiResponse<Message[]> & { unread_count?: number }>(url);
  },

  getMessage: async (id: number): Promise<ApiResponse<Message> & { unread_count?: number }> => {
    return handleRequest<ApiResponse<Message> & { unread_count?: number }>(
      `${API_BASE_URL}/messages/${id}`
    );
  },

  getUnreadCount: async (): Promise<ApiResponse<{ unread_count: number }>> => {
    return handleRequest<ApiResponse<{ unread_count: number }>>(
      `${API_BASE_URL}/messages/unread-count`
    );
  },

  createMessage: async (
    data: MessageCreate
  ): Promise<ApiResponse<Message[]>> => {
    return handleRequest<ApiResponse<Message[]>>(`${API_BASE_URL}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  markAsRead: async (id: number): Promise<ApiResponse & { unread_count?: number }> => {
    return handleRequest<ApiResponse & { unread_count?: number }>(
      `${API_BASE_URL}/messages/${id}/read`,
      {
        method: 'PUT',
      }
    );
  },

  markAllAsRead: async (): Promise<ApiResponse & { unread_count?: number }> => {
    return handleRequest<ApiResponse & { unread_count?: number }>(
      `${API_BASE_URL}/messages/read-all`,
      {
        method: 'PUT',
      }
    );
  },

  deleteMessage: async (id: number): Promise<ApiResponse & { unread_count?: number }> => {
    return handleRequest<ApiResponse & { unread_count?: number }>(
      `${API_BASE_URL}/messages/${id}`,
      {
        method: 'DELETE',
      }
    );
  },
};

export default userApi;
