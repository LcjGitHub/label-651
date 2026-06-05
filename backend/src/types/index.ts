export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface UserCreate {
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
}

export interface UserUpdate {
  name?: string;
  email?: string;
  phone?: string;
  status?: 'active' | 'inactive';
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  total?: number;
}
