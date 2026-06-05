import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'users.db');

let db: DatabaseSync | null = null;

export const initDatabase = (): DatabaseSync => {
  if (db) return db;

  db = new DatabaseSync(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      phone VARCHAR(20),
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
  `);

  const count = db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number };
  if (count.cnt === 0) {
    const insert = db.prepare(`
      INSERT INTO users (name, email, phone, status) VALUES (?, ?, ?, ?)
    `);

    const users = [
      ['张三', 'zhangsan@example.com', '13800138001', 'active'],
      ['李四', 'lisi@example.com', '13800138002', 'active'],
      ['王五', 'wangwu@example.com', '13800138003', 'inactive'],
      ['赵六', 'zhaoliu@example.com', '13800138004', 'active'],
      ['钱七', 'qianqi@example.com', '13800138005', 'active'],
    ];

    db.exec('BEGIN TRANSACTION');
    try {
      for (const user of users) {
        insert.run(...user);
      }
      db.exec('COMMIT');
      console.log('初始化用户测试数据成功');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }

  const roleCount = db.prepare('SELECT COUNT(*) as cnt FROM roles').get() as { cnt: number };
  if (roleCount.cnt === 0) {
    const insertRole = db.prepare(`
      INSERT INTO roles (name, code, description, status) VALUES (?, ?, ?, ?)
    `);

    const roles = [
      ['超级管理员', 'super_admin', '拥有系统所有权限', 'active'],
      ['管理员', 'admin', '拥有用户管理和角色管理权限', 'active'],
      ['普通用户', 'user', '基本查看权限', 'active'],
      ['访客', 'guest', '只读权限', 'active'],
    ];

    db.exec('BEGIN TRANSACTION');
    try {
      for (const role of roles) {
        insertRole.run(...role);
      }
      db.exec('COMMIT');
      console.log('初始化角色数据成功');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }

  const permCount = db.prepare('SELECT COUNT(*) as cnt FROM permissions').get() as { cnt: number };
  if (permCount.cnt === 0) {
    const insertPerm = db.prepare(`
      INSERT INTO permissions (name, code, type, parent_id, path, component, icon, sort_order, description) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const permissions = [
      ['用户管理', 'user:view', 'menu', 0, '/users', 'Users', 'Users', 1, '用户管理菜单'],
      ['用户列表', 'user:list', 'action', 1, '', '', '', 1, '查看用户列表'],
      ['用户新增', 'user:create', 'action', 1, '', '', '', 2, '新增用户'],
      ['用户编辑', 'user:update', 'action', 1, '', '', '', 3, '编辑用户'],
      ['用户删除', 'user:delete', 'action', 1, '', '', '', 4, '删除用户'],

      ['角色管理', 'role:view', 'menu', 0, '/roles', 'Roles', 'Shield', 2, '角色管理菜单'],
      ['角色列表', 'role:list', 'action', 6, '', '', '', 1, '查看角色列表'],
      ['角色新增', 'role:create', 'action', 6, '', '', '', 2, '新增角色'],
      ['角色编辑', 'role:update', 'action', 6, '', '', '', 3, '编辑角色'],
      ['角色删除', 'role:delete', 'action', 6, '', '', '', 4, '删除角色'],
      ['角色分配权限', 'role:assign', 'action', 6, '', '', '', 5, '为角色分配权限'],

      ['系统设置', 'system:view', 'menu', 0, '/system', 'System', 'Settings', 3, '系统设置菜单'],
      ['系统日志', 'system:log', 'action', 12, '', '', '', 1, '查看系统日志'],
      ['系统配置', 'system:config', 'action', 12, '', '', '', 2, '修改系统配置'],
    ];

    db.exec('BEGIN TRANSACTION');
    try {
      for (const perm of permissions) {
        insertPerm.run(...perm);
      }

      const assignRolePerm = db.prepare(`
        INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)
      `);

      for (let i = 1; i <= 14; i++) {
        assignRolePerm.run(1, i);
      }

      for (let i = 1; i <= 11; i++) {
        assignRolePerm.run(2, i);
      }

      assignRolePerm.run(3, 1);
      assignRolePerm.run(3, 2);
      assignRolePerm.run(3, 6);
      assignRolePerm.run(3, 7);

      assignRolePerm.run(4, 1);
      assignRolePerm.run(4, 2);

      db.exec('COMMIT');
      console.log('初始化权限数据成功');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }

  const userRoleCount = db.prepare('SELECT COUNT(*) as cnt FROM user_roles').get() as { cnt: number };
  if (userRoleCount.cnt === 0) {
    const insertUserRole = db.prepare(`
      INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)
    `);

    db.exec('BEGIN TRANSACTION');
    try {
      insertUserRole.run(1, 1);
      insertUserRole.run(2, 2);
      insertUserRole.run(3, 3);
      insertUserRole.run(4, 3);
      insertUserRole.run(5, 4);
      db.exec('COMMIT');
      console.log('初始化用户角色关联数据成功');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }

  const migrateSystemLogPermission = () => {
    const database = db!;
    const systemLogPerm = database
      .prepare('SELECT id FROM permissions WHERE code = ?')
      .get('system:log') as { id: number } | undefined;

    let permId: number;

    if (!systemLogPerm) {
      const systemSettingPerm = database
        .prepare('SELECT id FROM permissions WHERE code = ?')
        .get('system:view') as { id: number } | undefined;

      let parentId = 0;
      if (!systemSettingPerm) {
        const result = database
          .prepare(
            `INSERT INTO permissions (name, code, type, parent_id, path, component, icon, sort_order, description)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            '系统设置',
            'system:view',
            'menu',
            0,
            '/system',
            'System',
            'Settings',
            3,
            '系统设置菜单'
          );
        parentId = result.lastInsertRowid as number;
      } else {
        parentId = systemSettingPerm.id;
      }

      const result = database
        .prepare(
          `INSERT INTO permissions (name, code, type, parent_id, path, component, icon, sort_order, description)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          '系统日志',
          'system:log',
          'action',
          parentId,
          '',
          '',
          '',
          1,
          '查看系统日志'
        );
      permId = result.lastInsertRowid as number;
      console.log('迁移：补充「系统日志」权限成功');
    } else {
      permId = systemLogPerm.id;
    }

    const superAdminRole = database
      .prepare('SELECT id FROM roles WHERE code = ?')
      .get('super_admin') as { id: number } | undefined;

    if (superAdminRole) {
      const existing = database
        .prepare('SELECT 1 FROM role_permissions WHERE role_id = ? AND permission_id = ?')
        .get(superAdminRole.id, permId);

      if (!existing) {
        database
          .prepare('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)')
          .run(superAdminRole.id, permId);
        console.log('迁移：为超级管理员分配「系统日志」权限成功');
      }
    }
  };

  try {
    db!.exec('BEGIN TRANSACTION');
    migrateSystemLogPermission();
    db!.exec('COMMIT');
  } catch (err) {
    db!.exec('ROLLBACK');
    console.error('数据库迁移失败:', err);
  }

  console.log('数据库初始化成功');
  return db;
};

export const getDb = (): DatabaseSync => {
  if (!db) {
    throw new Error('数据库未初始化，请先调用 initDatabase()');
  }
  return db;
};

export default db;
