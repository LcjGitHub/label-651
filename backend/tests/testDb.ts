import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testDataDir = path.join(__dirname, '..', 'test-data');
if (!fs.existsSync(testDataDir)) {
  fs.mkdirSync(testDataDir, { recursive: true });
}

export const testDbPath = path.join(testDataDir, 'test-users.db');

export const createTestDatabase = (): DatabaseSync => {
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  const db = new DatabaseSync(testDbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      phone VARCHAR(20),
      avatar VARCHAR(500),
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(100) NOT NULL UNIQUE,
      code VARCHAR(50) NOT NULL UNIQUE,
      description TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
    CREATE INDEX IF NOT EXISTS idx_roles_code ON roles(code);
    CREATE INDEX IF NOT EXISTS idx_roles_status ON roles(status);

    CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(100) NOT NULL,
      code VARCHAR(100) NOT NULL UNIQUE,
      type VARCHAR(20) NOT NULL DEFAULT 'menu',
      parent_id INTEGER DEFAULT 0,
      path VARCHAR(255),
      component VARCHAR(255),
      icon VARCHAR(50),
      sort_order INTEGER DEFAULT 0,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_permissions_name ON permissions(name);
    CREATE INDEX IF NOT EXISTS idx_permissions_code ON permissions(code);
    CREATE INDEX IF NOT EXISTS idx_permissions_type ON permissions(type);
    CREATE INDEX IF NOT EXISTS idx_permissions_parent ON permissions(parent_id);

    CREATE TABLE IF NOT EXISTS user_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      role_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, role_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);

    CREATE TABLE IF NOT EXISTS role_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_id INTEGER NOT NULL,
      permission_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(role_id, permission_id),
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
      FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
    CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

    CREATE TABLE IF NOT EXISTS operation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operator_id INTEGER NOT NULL,
      operator_name VARCHAR(100) NOT NULL,
      operation_type VARCHAR(20) NOT NULL CHECK(operation_type IN ('CREATE', 'UPDATE', 'DELETE')),
      module VARCHAR(50) NOT NULL,
      detail TEXT,
      ip_address VARCHAR(50),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_operation_logs_operator ON operation_logs(operator_id);
    CREATE INDEX IF NOT EXISTS idx_operation_logs_type ON operation_logs(operation_type);
    CREATE INDEX IF NOT EXISTS idx_operation_logs_module ON operation_logs(module);
    CREATE INDEX IF NOT EXISTS idx_operation_logs_created ON operation_logs(created_at);

    CREATE TABLE IF NOT EXISTS import_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operator_id INTEGER NOT NULL,
      operator_name VARCHAR(100) NOT NULL,
      module VARCHAR(50) NOT NULL DEFAULT 'users',
      file_name VARCHAR(255) NOT NULL,
      file_size INTEGER NOT NULL DEFAULT 0,
      total_count INTEGER NOT NULL DEFAULT 0,
      success_count INTEGER NOT NULL DEFAULT 0,
      fail_count INTEGER NOT NULL DEFAULT 0,
      fail_reasons TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'completed',
      ip_address VARCHAR(50),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_import_history_operator ON import_history(operator_id);
    CREATE INDEX IF NOT EXISTS idx_import_history_module ON import_history(module);
    CREATE INDEX IF NOT EXISTS idx_import_history_status ON import_history(status);
    CREATE INDEX IF NOT EXISTS idx_import_history_created ON import_history(created_at);

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      receiver_id INTEGER NOT NULL,
      sender_id INTEGER,
      type VARCHAR(20) NOT NULL DEFAULT 'other' CHECK(type IN ('system', 'task', 'other')),
      is_read INTEGER NOT NULL DEFAULT 0 CHECK(is_read IN (0, 1)),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
    CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
    CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(type);
    CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);
    CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
  `);

  const insertUser = db.prepare(
    'INSERT INTO users (name, email, phone, status) VALUES (?, ?, ?, ?)'
  );

  db.exec('BEGIN TRANSACTION');
  const users = [
    ['张三', 'zhangsan@example.com', '13800138001', 'active'],
    ['李四', 'lisi@example.com', '13800138002', 'active'],
    ['王五', 'wangwu@example.com', '13800138003', 'inactive'],
    ['赵六', 'zhaoliu@example.com', '13800138004', 'active'],
    ['钱七', 'qianqi@example.com', '13900138005', 'active'],
    ['孙八', 'sunba@example.com', '13900138006', 'active'],
    ['周九', 'zhoujiu@example.com', '13900138007', 'inactive'],
    ['吴十', 'wushi@example.com', '13900138008', 'active'],
    ['测试管理员', 'admin@test.com', '13811112222', 'active'],
    ['测试无权限用户', 'noperm@test.com', '13833334444', 'active'],
  ];
  for (const user of users) {
    insertUser.run(...user);
  }
  db.exec('COMMIT');

  const insertRole = db.prepare(
    'INSERT INTO roles (name, code, description, status) VALUES (?, ?, ?, ?)'
  );
  db.exec('BEGIN TRANSACTION');
  const roles = [
    ['超级管理员', 'super_admin', '拥有系统所有权限', 'active'],
    ['管理员', 'admin', '拥有用户管理和角色管理权限', 'active'],
    ['普通用户', 'user', '基本查看权限', 'active'],
    ['访客', 'guest', '只读权限', 'active'],
  ];
  for (const role of roles) {
    insertRole.run(...role);
  }
  db.exec('COMMIT');

  const insertPerm = db.prepare(
    `INSERT INTO permissions (name, code, type, parent_id, path, component, icon, sort_order, description) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  db.exec('BEGIN TRANSACTION');
  const permissions = [
    ['用户管理', 'user:view', 'menu', 0, '/users', 'Users', 'Users', 1, '用户管理菜单'],
    ['用户列表', 'user:list', 'action', 1, '', '', '', 1, '查看用户列表'],
    ['用户新增', 'user:create', 'action', 1, '', '', '', 2, '新增用户'],
    ['用户编辑', 'user:update', 'action', 1, '', '', '', 3, '编辑用户'],
    ['用户删除', 'user:delete', 'action', 1, '', '', '', 4, '删除用户'],
    ['用户导入', 'user:import', 'action', 1, '', '', '', 5, '批量导入用户'],
    ['用户导出', 'user:export', 'action', 1, '', '', '', 6, '批量导出用户'],
    ['角色管理', 'role:view', 'menu', 0, '/roles', 'Roles', 'Shield', 2, '角色管理菜单'],
  ];
  for (const perm of permissions) {
    insertPerm.run(...perm);
  }

  const assignRolePerm = db.prepare(
    'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)'
  );
  for (let i = 1; i <= 7; i++) {
    assignRolePerm.run(1, i);
  }
  for (let i = 1; i <= 5; i++) {
    assignRolePerm.run(2, i);
  }
  assignRolePerm.run(3, 1);
  assignRolePerm.run(3, 2);
  db.exec('COMMIT');

  const insertUserRole = db.prepare(
    'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)'
  );
  db.exec('BEGIN TRANSACTION');
  insertUserRole.run(9, 1);
  insertUserRole.run(1, 2);
  insertUserRole.run(2, 3);
  insertUserRole.run(10, 4);
  db.exec('COMMIT');

  return db;
};

export const cleanupTestDatabase = (): void => {
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
  const shmPath = testDbPath + '-shm';
  const walPath = testDbPath + '-wal';
  if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
  if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
};

export const clearAllTables = (db: DatabaseSync): void => {
  db.exec('BEGIN TRANSACTION');
  db.exec('DELETE FROM operation_logs');
  db.exec('DELETE FROM import_history');
  db.exec('DELETE FROM messages');
  db.exec('DELETE FROM user_roles');
  db.exec('DELETE FROM role_permissions');
  db.exec('DELETE FROM users WHERE id > 10');
  db.exec('DELETE FROM roles WHERE id > 4');
  db.exec('DELETE FROM permissions WHERE id > 8');
  db.exec('COMMIT');
};
