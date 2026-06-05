import { User, UserCreate, UserUpdate, ApiResponse } from '@/types';

const API_BASE_URL = 'http://localhost:8089/api';

const handleResponse = async <T>(response: Response): Promise<T> => {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || '请求失败');
  }
  return data;
};

export const userApi = {
  getUsers: async (search?: string): Promise<ApiResponse<User[]>> => {
    const url = search
      ? `${API_BASE_URL}/users?search=${encodeURIComponent(search)}`
      : `${API_BASE_URL}/users`;
    const response = await fetch(url);
    return handleResponse<ApiResponse<User[]>>(response);
  },

  getUser: async (id: number): Promise<ApiResponse<User>> => {
    const response = await fetch(`${API_BASE_URL}/users/${id}`);
    return handleResponse<ApiResponse<User>>(response);
  },

  createUser: async (user: UserCreate): Promise<ApiResponse<User>> => {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(user),
    });
    return handleResponse<ApiResponse<User>>(response);
  },

  updateUser: async (id: number, user: UserUpdate): Promise<ApiResponse<User>> => {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(user),
    });
    return handleResponse<ApiResponse<User>>(response);
  },

  deleteUser: async (id: number): Promise<ApiResponse> => {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<ApiResponse>(response);
  },
};

export default userApi;
