export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  roles?: Role[];
}

export interface UserCreate {
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
  role_ids?: number[];
}

export interface UserUpdate {
  name?: string;
  email?: string;
  phone?: string;
  status?: 'active' | 'inactive';
  role_ids?: number[];
}

export interface Role {
  id: number;
  name: string;
  code: string;
  description: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  permissions?: Permission[];
  user_count?: number;
  permission_count?: number;
}

export interface LoginResponse {
  user: User;
  roles: string[];
  permissions: string[];
}

export interface RoleCreate {
  name: string;
  code: string;
  description?: string;
  status: 'active' | 'inactive';
  permission_ids?: number[];
}

export interface RoleUpdate {
  name?: string;
  code?: string;
  description?: string;
  status?: 'active' | 'inactive';
  permission_ids?: number[];
}

export interface Permission {
  id: number;
  name: string;
  code: string;
  type: 'menu' | 'action';
  parent_id: number;
  path?: string;
  component?: string;
  icon?: string;
  sort_order: number;
  description?: string;
  created_at: string;
  updated_at: string;
  children?: Permission[];
}

export interface PermissionCreate {
  name: string;
  code: string;
  type: 'menu' | 'action';
  parent_id?: number;
  path?: string;
  component?: string;
  icon?: string;
  sort_order?: number;
  description?: string;
}

export interface PermissionUpdate {
  name?: string;
  code?: string;
  type?: 'menu' | 'action';
  parent_id?: number;
  path?: string;
  component?: string;
  icon?: string;
  sort_order?: number;
  description?: string;
}

export interface UserRole {
  id: number;
  user_id: number;
  role_id: number;
  created_at: string;
}

export interface RolePermission {
  id: number;
  role_id: number;
  permission_id: number;
  created_at: string;
}

export type OperationType = 'CREATE' | 'UPDATE' | 'DELETE';

export interface OperationLog {
  id: number;
  operator_id: number;
  operator_name: string;
  operation_type: OperationType;
  module: string;
  detail: string;
  ip_address: string;
  created_at: string;
}

export interface OperationLogDetail {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  changes?: Record<string, { old: unknown; new: unknown }>;
}

export interface OperationLogQuery {
  operator_id?: number;
  operation_type?: OperationType;
  module?: string;
  start_time?: string;
  end_time?: string;
  page?: number;
  page_size?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  total?: number;
}
