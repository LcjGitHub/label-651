import { Router, Response, NextFunction } from 'express';
import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';
import { getDb } from '../database';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest, requireAuth, requirePermission } from '../middleware/auth';
import { upload, exportsDir } from '../middleware/upload';
import { User, UserCreate, UserUpdate, Role, ApiResponse, ImportHistory, ImportResult, UserDetail, OperationLog } from '../types';

const router = Router();

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
};

const getUserRoles = (db: DatabaseSync, userId: number): Role[] => {
  return db
    .prepare(
      `SELECT r.* FROM roles r
       INNER JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = ?
       ORDER BY r.id`
    )
    .all(userId) as unknown as Role[];
};

const ALLOWED_SORT_FIELDS = ['name', 'email', 'created_at'];
const ALLOWED_SORT_ORDERS = ['asc', 'desc'];

router.get('/', requireAuth, requirePermission('user:list'), (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const search = req.query.search as string;

    const pageParam = parseInt(req.query.page as string);
    const pageSizeParam = parseInt(req.query.pageSize as string);
    const sortBy = (req.query.sortBy as string) || 'created_at';
    const sortOrder = (req.query.sortOrder as string) || 'desc';

    const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
    const pageSize = isNaN(pageSizeParam) || pageSizeParam < 1 ? 10 : [10, 20, 50, 100].includes(pageSizeParam) ? pageSizeParam : 10;
    const validSortBy = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : 'created_at';
    const validSortOrder = ALLOWED_SORT_ORDERS.includes(sortOrder.toLowerCase()) ? sortOrder.toUpperCase() : 'DESC';

    const allCount = db
      .prepare('SELECT COUNT(*) as cnt FROM users')
      .get() as { cnt: number };
    const total = allCount.cnt;

    let users: User[];
    let filteredTotal = total;

    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      const filteredCount = db
        .prepare('SELECT COUNT(*) as cnt FROM users WHERE name LIKE ? OR email LIKE ?')
        .get(searchTerm, searchTerm) as { cnt: number };
      filteredTotal = filteredCount.cnt;

      const offset = (page - 1) * pageSize;
      const sql = `SELECT * FROM users WHERE name LIKE ? OR email LIKE ? ORDER BY ${validSortBy} ${validSortOrder} LIMIT ? OFFSET ?`;
      users = db.prepare(sql).all(searchTerm, searchTerm, pageSize, offset) as unknown as User[];
    } else {
      const offset = (page - 1) * pageSize;
      const sql = `SELECT * FROM users ORDER BY ${validSortBy} ${validSortOrder} LIMIT ? OFFSET ?`;
      users = db.prepare(sql).all(pageSize, offset) as unknown as User[];
    }

    users = users.map((user) => ({
      ...user,
      roles: getUserRoles(db, user.id),
    }));

    const response: ApiResponse<User[]> = {
      success: true,
      data: users,
      total,
      filteredTotal,
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, requirePermission('user:view'), (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new AppError('无效的用户ID', 400);
    }

    const user = db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(id) as unknown as User;

    if (!user) {
      throw new AppError('用户不存在', 404);
    }

    user.roles = getUserRoles(db, id);

    const response: ApiResponse<User> = {
      success: true,
      data: user,
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/detail', requireAuth, requirePermission('user:view'), (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new AppError('无效的用户ID', 400);
    }

    const user = db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(id) as unknown as User;

    if (!user) {
      throw new AppError('用户不存在', 404);
    }

    user.roles = getUserRoles(db, id);

    const logs = db
      .prepare(
        `SELECT * FROM operation_logs 
         WHERE operator_id = ? 
         ORDER BY created_at DESC 
         LIMIT 10`
      )
      .all(id) as unknown as OperationLog[];

    const detail: UserDetail = {
      user,
      operationLogs: logs,
    };

    const response: ApiResponse<UserDetail> = {
      success: true,
      data: detail,
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, requirePermission('user:create'), 
  (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const { name, email, phone, status, role_ids } = req.body as UserCreate;

    if (!name || !name.trim()) {
      throw new AppError('姓名不能为空', 400);
    }
    if (!email || !email.trim()) {
      throw new AppError('邮箱不能为空', 400);
    }
    if (!validateEmail(email)) {
      throw new AppError('邮箱格式不正确', 400);
    }
    if (phone && !validatePhone(phone)) {
      throw new AppError('手机号格式不正确', 400);
    }
    if (status && !['active', 'inactive'].includes(status)) {
      throw new AppError('状态值不正确', 400);
    }

    db.exec('BEGIN TRANSACTION');
    try {
      const result = db
        .prepare(
          'INSERT INTO users (name, email, phone, status) VALUES (?, ?, ?, ?)'
        )
        .run(
          name.trim(),
          email.trim(),
          phone || '',
          status || 'active'
        );

      const userId = result.lastInsertRowid as number;

      if (role_ids && role_ids.length > 0) {
        const insertRole = db.prepare(
          'INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)'
        );
        for (const roleId of role_ids) {
          insertRole.run(userId, roleId);
        }
      }

      db.exec('COMMIT');

      const user = db
        .prepare('SELECT * FROM users WHERE id = ?')
        .get(userId) as unknown as User;
      user.roles = getUserRoles(db, userId);

      const response: ApiResponse<User> = {
        success: true,
        data: user,
        message: '用户创建成功',
      };

      res.status(201).json(response);
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAuth, requirePermission('user:update'),
  (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new AppError('无效的用户ID', 400);
    }

    const existingUser = db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(id) as unknown as User;

    if (!existingUser) {
      throw new AppError('用户不存在', 404);
    }

    const { name, email, phone, status, role_ids } = req.body as UserUpdate;

    if (name !== undefined && !name.trim()) {
      throw new AppError('姓名不能为空', 400);
    }
    if (email !== undefined && !validateEmail(email)) {
      throw new AppError('邮箱格式不正确', 400);
    }
    if (phone !== undefined && phone && !validatePhone(phone)) {
      throw new AppError('手机号格式不正确', 400);
    }
    if (status !== undefined && !['active', 'inactive'].includes(status)) {
      throw new AppError('状态值不正确', 400);
    }

    db.exec('BEGIN TRANSACTION');
    try {
      const updateFields: string[] = [];
      const updateValues: unknown[] = [];

      if (name !== undefined) {
        updateFields.push('name = ?');
        updateValues.push(name.trim());
      }
      if (email !== undefined) {
        updateFields.push('email = ?');
        updateValues.push(email.trim());
      }
      if (phone !== undefined) {
        updateFields.push('phone = ?');
        updateValues.push(phone || '');
      }
      if (status !== undefined) {
        updateFields.push('status = ?');
        updateValues.push(status);
      }

      if (updateFields.length > 0) {
        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateValues.push(id);
        const sql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
        db.prepare(sql).run(...updateValues as unknown as []);
      }

      if (role_ids !== undefined) {
        db.prepare('DELETE FROM user_roles WHERE user_id = ?').run(id);
        if (role_ids.length > 0) {
          const insertRole = db.prepare(
            'INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)'
          );
          for (const roleId of role_ids) {
            insertRole.run(id, roleId);
          }
        }
      }

      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    const updatedUser = db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(id) as unknown as User;
    updatedUser.roles = getUserRoles(db, id);

    const response: ApiResponse<User> = {
      success: true,
      data: updatedUser,
      message: '用户更新成功',
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/roles', requireAuth, requirePermission('user:view'), (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new AppError('无效的用户ID', 400);
    }

    const existingUser = db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(id) as unknown as User;

    if (!existingUser) {
      throw new AppError('用户不存在', 404);
    }

    const roles = getUserRoles(db, id);
    const roleIds = roles.map((r) => r.id);

    const response: ApiResponse<{ roles: Role[]; role_ids: number[] }> = {
      success: true,
      data: {
        roles,
        role_ids: roleIds,
      },
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.put('/:id/roles', requireAuth, requirePermission('user:update'),
  (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new AppError('无效的用户ID', 400);
    }

    const existingUser = db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(id) as unknown as User;

    if (!existingUser) {
      throw new AppError('用户不存在', 404);
    }

    const { role_ids } = req.body as { role_ids: number[] };

    if (!Array.isArray(role_ids)) {
      throw new AppError('角色ID列表格式不正确', 400);
    }

    db.exec('BEGIN TRANSACTION');
    try {
      db.prepare('DELETE FROM user_roles WHERE user_id = ?').run(id);
      if (role_ids.length > 0) {
        const insertRole = db.prepare(
          'INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)'
        );
        for (const roleId of role_ids) {
          insertRole.run(id, roleId);
        }
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    const response: ApiResponse = {
      success: true,
      message: '角色分配成功',
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, requirePermission('user:delete'),
  (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new AppError('无效的用户ID', 400);
    }

    const existingUser = db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(id) as unknown as User;

    if (!existingUser) {
      throw new AppError('用户不存在', 404);
    }

    db.exec('BEGIN TRANSACTION');
    try {
      db.prepare('DELETE FROM user_roles WHERE user_id = ?').run(id);
      db.prepare('DELETE FROM users WHERE id = ?').run(id);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    const response: ApiResponse = {
      success: true,
      message: '用户删除成功',
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

interface ImportRow {
  name?: string;
  email?: string;
  phone?: string;
  status?: string;
}

type SheetRow = Record<string, unknown>;

const parseImportFile = (filePath: string): ImportRow[] => {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as SheetRow[];

  return jsonData.map((row: SheetRow) => ({
    name: String(row['姓名'] ?? row['name'] ?? row['Name'] ?? ''),
    email: String(row['邮箱'] ?? row['email'] ?? row['Email'] ?? ''),
    phone: String(row['手机号'] ?? row['phone'] ?? row['Phone'] ?? ''),
    status: String(row['状态'] ?? row['status'] ?? row['Status'] ?? 'active'),
  }));
};

const validateImportRow = (row: ImportRow, index: number): { valid: boolean; reason?: string } => {
  if (!row.name || String(row.name).trim() === '') {
    return { valid: false, reason: `第${index + 2}行：姓名不能为空` };
  }
  if (!row.email || String(row.email).trim() === '') {
    return { valid: false, reason: `第${index + 2}行：邮箱不能为空` };
  }
  if (!validateEmail(String(row.email))) {
    return { valid: false, reason: `第${index + 2}行：邮箱格式不正确` };
  }
  if (row.phone && String(row.phone).trim() !== '' && !validatePhone(String(row.phone))) {
    return { valid: false, reason: `第${index + 2}行：手机号格式不正确` };
  }
  if (row.status && !['active', 'inactive'].includes(String(row.status))) {
    return { valid: false, reason: `第${index + 2}行：状态值只能是 active 或 inactive` };
  }
  return { valid: true };
};

interface MulterRequest extends AuthRequest {
  file?: Express.Multer.File;
}

router.post('/import', requireAuth, requirePermission('user:import'),
  upload.single('file'),
  (req: MulterRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const file = req.file;
    if (!file) {
      throw new AppError('请选择要上传的文件', 400);
    }

    if (!req.userId) {
      throw new AppError('未授权，请先登录', 401);
    }

    const operator = db
      .prepare('SELECT id, name FROM users WHERE id = ?')
      .get(req.userId) as { id: number; name: string } | undefined;

    let rows: ImportRow[] = [];
    const filePath = file.path;
    try {
      rows = parseImportFile(filePath);
    } catch {
      fs.unlinkSync(filePath);
      throw new AppError('文件解析失败，请检查文件格式', 400);
    }

    if (rows.length === 0) {
      fs.unlinkSync(filePath);
      throw new AppError('文件内容为空', 400);
    }

    const failReasons: { row: number; reason: string }[] = [];
    const validRows: (ImportRow & { _rowIndex: number })[] = [];

    rows.forEach((row, index) => {
      const validation = validateImportRow(row, index);
      if (!validation.valid && validation.reason) {
        failReasons.push({ row: index + 2, reason: validation.reason });
      } else {
        validRows.push({ ...row, _rowIndex: index });
      }
    });

    const insertUser = db.prepare(
      'INSERT OR IGNORE INTO users (name, email, phone, status) VALUES (?, ?, ?, ?)'
    );

    let successCount = 0;
    const realFailReasons = [...failReasons];

    db.exec('BEGIN TRANSACTION');
    try {
      for (const row of validRows) {
        try {
          const result = insertUser.run(
            String(row.name).trim(),
            String(row.email).trim(),
            row.phone ? String(row.phone).trim() : '',
            row.status || 'active'
          );
          if (result.changes > 0) {
            successCount++;
          } else {
            realFailReasons.push({
              row: row._rowIndex + 2,
              reason: `第${row._rowIndex + 2}行：邮箱已存在`,
            });
          }
        } catch (innerErr) {
          realFailReasons.push({
            row: row._rowIndex + 2,
            reason: `第${row._rowIndex + 2}行：${innerErr instanceof Error ? innerErr.message : '导入失败'}`,
          });
        }
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      fs.unlinkSync(filePath);
      throw err;
    }

    try {
      fs.unlinkSync(filePath);
    } catch {
      // ignore file deletion error
    }

    const importResult: ImportResult = {
      total: rows.length,
      success: successCount,
      fail: realFailReasons.length,
      failReasons: realFailReasons,
    };

    try {
      db
        .prepare(
          `INSERT INTO import_history 
           (operator_id, operator_name, module, file_name, file_size, total_count, success_count, fail_count, fail_reasons, status, ip_address)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          req.userId,
          operator?.name || '未知用户',
          'users',
          file.originalname,
          file.size,
          rows.length,
          successCount,
          realFailReasons.length,
          JSON.stringify(realFailReasons),
          'completed',
          req.ip || ''
        );
    } catch (logErr) {
      console.error('记录导入历史失败:', logErr);
    }

    const response: ApiResponse<ImportResult> = {
      success: true,
      data: importResult,
      message: `导入完成：成功${successCount}条，失败${realFailReasons.length}条`,
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.post('/export', requireAuth, requirePermission('user:export'),
  (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const { search, ids } = req.body as { search?: string; ids?: number[] };

    let users: User[] = [];

    if (ids && Array.isArray(ids) && ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',');
      users = db
        .prepare(`SELECT * FROM users WHERE id IN (${placeholders}) ORDER BY created_at DESC`)
        .all(...ids) as unknown as User[];
    } else if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      users = db
        .prepare(
          'SELECT * FROM users WHERE name LIKE ? OR email LIKE ? ORDER BY created_at DESC'
        )
        .all(searchTerm, searchTerm) as unknown as User[];
    } else {
      users = db
        .prepare('SELECT * FROM users ORDER BY created_at DESC')
        .all() as unknown as User[];
    }

    const exportData = users.map((user) => ({
      编号: user.id,
      姓名: user.name,
      邮箱: user.email,
      手机号: user.phone || '',
      状态: user.status === 'active' ? '启用' : '禁用',
      创建时间: user.created_at,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet['!cols'] = [
      { wch: 8 },
      { wch: 16 },
      { wch: 30 },
      { wch: 16 },
      { wch: 10 },
      { wch: 20 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '用户列表');

    const timestamp = Date.now();
    const fileName = `users-export-${timestamp}.xlsx`;
    const filePath = path.join(exportsDir, fileName);

    XLSX.writeFile(workbook, filePath);

    const downloadUrl = `/api/exports/${fileName}`;

    const response: ApiResponse<{ downloadUrl: string; fileName: string; count: number }> = {
      success: true,
      data: {
        downloadUrl,
        fileName,
        count: users.length,
      },
      message: `导出成功，共${users.length}条数据`,
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.get('/export/template', requireAuth, requirePermission('user:export'),
  (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const templateData = [
      {
        姓名: '张三',
        邮箱: 'zhangsan@example.com',
        手机号: '13800138001',
        状态: 'active',
      },
      {
        姓名: '李四',
        邮箱: 'lisi@example.com',
        手机号: '',
        状态: 'inactive',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    worksheet['!cols'] = [
      { wch: 16 },
      { wch: 30 },
      { wch: 16 },
      { wch: 10 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '导入模板');

    const timestamp = Date.now();
    const fileName = `users-import-template-${timestamp}.xlsx`;
    const filePath = path.join(exportsDir, fileName);

    XLSX.writeFile(workbook, filePath);

    const downloadUrl = `/api/exports/${fileName}`;

    const response: ApiResponse<{ downloadUrl: string; fileName: string }> = {
      success: true,
      data: {
        downloadUrl,
        fileName,
      },
      message: '模板生成成功',
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.get('/import/history', requireAuth, requirePermission('user:import'),
  (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();

    const history = db
      .prepare(
        `SELECT * FROM import_history WHERE module = 'users' ORDER BY created_at DESC LIMIT 50`
      )
      .all() as unknown as ImportHistory[];

    const response: ApiResponse<ImportHistory[]> = {
      success: true,
      data: history,
      total: history.length,
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

export default router;
