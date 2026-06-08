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
      ['孙八', 'sunba@example.com', '13800138006', 'active'],
      ['周九', 'zhoujiu@example.com', '13800138007', 'inactive'],
      ['吴十', 'wushi@example.com', '13800138008', 'active'],
      ['郑十一', 'zhengshiyi@example.com', '13800138009', 'active'],
      ['冯十二', 'fengshier@example.com', '13800138010', 'active'],
      ['陈十三', 'chenshisan@example.com', '13800138011', 'inactive'],
      ['褚十四', 'chushisi@example.com', '13800138012', 'active'],
      ['卫十五', 'weishiwu@example.com', '13800138013', 'active'],
      ['蒋十六', 'jiangshiliu@example.com', '13800138014', 'active'],
      ['沈十七', 'shenshiqi@example.com', '13800138015', 'inactive'],
      ['韩十八', 'hanshiba@example.com', '13800138016', 'active'],
      ['杨十九', 'yangshijiu@example.com', '13800138017', 'active'],
      ['朱二十', 'zhusershi@example.com', '13800138018', 'active'],
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
      ['用户导入', 'user:import', 'action', 1, '', '', '', 5, '批量导入用户'],
      ['用户导出', 'user:export', 'action', 1, '', '', '', 6, '批量导出用户'],

      ['角色管理', 'role:view', 'menu', 0, '/roles', 'Roles', 'Shield', 2, '角色管理菜单'],
      ['角色列表', 'role:list', 'action', 8, '', '', '', 1, '查看角色列表'],
      ['角色新增', 'role:create', 'action', 8, '', '', '', 2, '新增角色'],
      ['角色编辑', 'role:update', 'action', 8, '', '', '', 3, '编辑角色'],
      ['角色删除', 'role:delete', 'action', 8, '', '', '', 4, '删除角色'],
      ['角色分配权限', 'role:assign', 'action', 8, '', '', '', 5, '为角色分配权限'],

      ['系统设置', 'system:view', 'menu', 0, '/system', 'System', 'Settings', 3, '系统设置菜单'],
      ['系统日志', 'system:log', 'action', 14, '', '', '', 1, '查看系统日志'],
      ['系统配置', 'system:config', 'action', 14, '', '', '', 2, '修改系统配置'],
    ];

    db.exec('BEGIN TRANSACTION');
    try {
      for (const perm of permissions) {
        insertPerm.run(...perm);
      }

      const assignRolePerm = db.prepare(`
        INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)
      `);

      for (let i = 1; i <= 16; i++) {
        assignRolePerm.run(1, i);
      }

      for (let i = 1; i <= 13; i++) {
        assignRolePerm.run(2, i);
      }

      assignRolePerm.run(3, 1);
      assignRolePerm.run(3, 2);
      assignRolePerm.run(3, 8);
      assignRolePerm.run(3, 9);

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
      insertUserRole.run(6, 3);
      insertUserRole.run(7, 4);
      insertUserRole.run(8, 3);
      insertUserRole.run(9, 3);
      insertUserRole.run(10, 4);
      insertUserRole.run(11, 3);
      insertUserRole.run(12, 3);
      insertUserRole.run(13, 4);
      insertUserRole.run(14, 3);
      insertUserRole.run(15, 2);
      insertUserRole.run(16, 3);
      insertUserRole.run(17, 3);
      insertUserRole.run(18, 4);
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

  const migrateImportExportPermissions = () => {
    const database = db!;
    const userViewPerm = database
      .prepare('SELECT id FROM permissions WHERE code = ?')
      .get('user:view') as { id: number } | undefined;

    const parentId = userViewPerm?.id || 0;

    const importPerm = database
      .prepare('SELECT id FROM permissions WHERE code = ?')
      .get('user:import') as { id: number } | undefined;

    let importPermId: number;
    if (!importPerm) {
      const result = database
        .prepare(
          `INSERT INTO permissions (name, code, type, parent_id, path, component, icon, sort_order, description)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          '用户导入',
          'user:import',
          'action',
          parentId,
          '',
          '',
          '',
          5,
          '批量导入用户'
        );
      importPermId = result.lastInsertRowid as number;
      console.log('迁移：补充「用户导入」权限成功');
    } else {
      importPermId = importPerm.id;
    }

    const exportPerm = database
      .prepare('SELECT id FROM permissions WHERE code = ?')
      .get('user:export') as { id: number } | undefined;

    let exportPermId: number;
    if (!exportPerm) {
      const result = database
        .prepare(
          `INSERT INTO permissions (name, code, type, parent_id, path, component, icon, sort_order, description)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          '用户导出',
          'user:export',
          'action',
          parentId,
          '',
          '',
          '',
          6,
          '批量导出用户'
        );
      exportPermId = result.lastInsertRowid as number;
      console.log('迁移：补充「用户导出」权限成功');
    } else {
      exportPermId = exportPerm.id;
    }

    const superAdminRole = database
      .prepare('SELECT id FROM roles WHERE code = ?')
      .get('super_admin') as { id: number } | undefined;

    const adminRole = database
      .prepare('SELECT id FROM roles WHERE code = ?')
      .get('admin') as { id: number } | undefined;

    const assignPerm = (roleId: number, permId: number, permName: string) => {
      const existing = database
        .prepare('SELECT 1 FROM role_permissions WHERE role_id = ? AND permission_id = ?')
        .get(roleId, permId);
      if (!existing) {
        database
          .prepare('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)')
          .run(roleId, permId);
        const role = database.prepare('SELECT name FROM roles WHERE id = ?').get(roleId) as { name: string } | undefined;
        console.log(`迁移：为「${role?.name || roleId}」分配「${permName}」权限成功`);
      }
    };

    if (superAdminRole) {
      assignPerm(superAdminRole.id, importPermId, '用户导入');
      assignPerm(superAdminRole.id, exportPermId, '用户导出');
    }
    if (adminRole) {
      assignPerm(adminRole.id, importPermId, '用户导入');
      assignPerm(adminRole.id, exportPermId, '用户导出');
    }
  };

  const migrateAvatarField = () => {
    const database = db!;
    const columns = database
      .prepare("PRAGMA table_info(users)")
      .all() as unknown as { name: string }[];
    const hasAvatar = columns.some((col) => col.name === 'avatar');
    if (!hasAvatar) {
      database.exec('ALTER TABLE users ADD COLUMN avatar VARCHAR(500)');
      console.log('迁移：为 users 表添加 avatar 字段成功');
    }
  };

  try {
    db!.exec('BEGIN TRANSACTION');
    migrateSystemLogPermission();
    migrateImportExportPermissions();
    migrateAvatarField();
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
