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
      console.log('初始化测试数据成功');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
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
