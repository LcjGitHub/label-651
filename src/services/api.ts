import { User, UserCreate, UserUpdate, ApiResponse } from '@/types';

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
};

export default userApi;
