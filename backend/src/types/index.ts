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

export interface ImportHistory {
  id: number;
  operator_id: number;
  operator_name: string;
  module: string;
  file_name: string;
  file_size: number;
  total_count: number;
  success_count: number;
  fail_count: number;
  fail_reasons: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  ip_address: string;
  created_at: string;
}

export interface ImportResult {
  total: number;
  success: number;
  fail: number;
  failReasons: { row: number; reason: string }[];
}

export type MessageType = 'system' | 'task' | 'other';

export interface Message {
  id: number;
  title: string;
  content: string;
  receiver_id: number;
  sender_id: number | null;
  sender_name?: string;
  receiver_name?: string;
  type: MessageType;
  is_read: 0 | 1;
  created_at: string;
}

export interface MessageCreate {
  title: string;
  content: string;
  receiver_ids?: number[];
  send_to_all?: boolean;
  sender_id?: number;
  type: MessageType;
}

export interface MessageQuery {
  type?: MessageType;
  is_read?: 0 | 1;
  page?: number;
  page_size?: number;
}

export interface ExportQuery {
  search?: string;
  ids?: number[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  total?: number;
  filteredTotal?: number;
}
