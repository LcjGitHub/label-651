import {
  User,
  UserCreate,
  UserUpdate,
  Role,
  RoleCreate,
  RoleUpdate,
  Permission,
  PermissionCreate,
  PermissionUpdate,
  ApiResponse,
} from '@/types';

const API_BASE_URL = '/api';

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
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
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

export const userApi = {
  getUsers: async (search?: string): Promise<ApiResponse<User[]>> => {
    const url = search
      ? `${API_BASE_URL}/users?search=${encodeURIComponent(search)}`
      : `${API_BASE_URL}/users`;
    return handleRequest<ApiResponse<User[]>>(url);
  },

  getUser: async (id: number): Promise<ApiResponse<User>> => {
    return handleRequest<ApiResponse<User>>(`${API_BASE_URL}/users/${id}`);
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

export default userApi;
