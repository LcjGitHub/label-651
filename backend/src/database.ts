import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
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

class Database {
  private db: SqlJsDatabase | null = null;
  private SQL: Awaited<ReturnType<typeof initSqlJs>> | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    this.SQL = await initSqlJs({
      locateFile: (file: string) =>
        path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file),
    });

    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath);
      this.db = new this.SQL.Database(fileBuffer);
    } else {
      this.db = new this.SQL.Database();
      this.save();
    }

    console.log('数据库初始化成功');
  }

  private save(): void {
    if (!this.db) return;
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }

  run(sql: string, params: unknown[] = []): Promise<{ lastID: number; changes: number }> {
    return new Promise((resolve, reject) => {
      try {
        if (!this.db) throw new Error('数据库未初始化');
        const stmt = this.db.prepare(sql);
        stmt.run(params as (string | number | null)[]);
        stmt.free();
        const lastID = this.db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number;
        const changes = this.db.exec('SELECT changes() as cnt')[0].values[0][0] as number;
        this.save();
        resolve({ lastID, changes });
      } catch (err) {
        reject(err);
      }
    });
  }

  get<T = unknown>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      try {
        if (!this.db) throw new Error('数据库未初始化');
        const stmt = this.db.prepare(sql);
        const result = stmt.getAsObject(params as (string | number | null)[]);
        stmt.free();
        if (Object.keys(result).length === 0) {
          resolve(undefined);
        } else {
          resolve(result as T);
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  all<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      try {
        if (!this.db) throw new Error('数据库未初始化');
        const results = this.db.exec(sql, params as (string | number | null)[]);
        if (results.length === 0) {
          resolve([]);
          return;
        }

        const columns = results[0].columns;
        const values = results[0].values;
        const rows = values.map((row) => {
          const obj: Record<string, unknown> = {};
          columns.forEach((col, idx) => {
            obj[col] = row[idx];
          });
          return obj as T;
        });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    });
  }

  exec(sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (!this.db) throw new Error('数据库未初始化');
        this.db.run(sql);
        this.save();
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.db) {
        this.save();
        this.db.close();
        this.db = null;
      }
      resolve();
    });
  }
}

export const db = new Database();

const initDatabase = async () => {
  try {
    await db.init();

    await db.exec(`
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

    const countResult = await db.get<{ cnt: number }>('SELECT COUNT(*) as cnt FROM users');
    if (!countResult || countResult.cnt === 0) {
      const users = [
        ['张三', 'zhangsan@example.com', '13800138001', 'active'],
        ['李四', 'lisi@example.com', '13800138002', 'active'],
        ['王五', 'wangwu@example.com', '13800138003', 'inactive'],
        ['赵六', 'zhaoliu@example.com', '13800138004', 'active'],
        ['钱七', 'qianqi@example.com', '13800138005', 'active'],
      ];

      for (const user of users) {
        await db.run(
          'INSERT INTO users (name, email, phone, status) VALUES (?, ?, ?, ?)',
          user
        );
      }
      console.log('初始化测试数据成功');
    }

    console.log('数据库表结构初始化完成');
  } catch (err) {
    console.error('数据库初始化失败:', err);
    process.exit(1);
  }
};

initDatabase();

export default db;
