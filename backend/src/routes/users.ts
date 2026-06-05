import { Router, Request, Response, NextFunction } from 'express';
import { getDb } from '../database';
import { AppError } from '../middleware/errorHandler';
import { User, UserCreate, UserUpdate, ApiResponse } from '../types';

const router = Router();

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
};

router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const search = req.query.search as string;
    let users: User[];
    let total: number;

    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      users = db
        .prepare(
          'SELECT * FROM users WHERE name LIKE ? OR email LIKE ? ORDER BY created_at DESC'
        )
        .all(searchTerm, searchTerm) as User[];
      total = users.length;
    } else {
      users = db
        .prepare('SELECT * FROM users ORDER BY created_at DESC')
        .all() as User[];
      const countResult = db
        .prepare('SELECT COUNT(*) as cnt FROM users')
        .get() as { cnt: number };
      total = countResult.cnt;
    }

    const response: ApiResponse<User[]> = {
      success: true,
      data: users,
      total,
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new AppError('无效的用户ID', 400);
    }

    const user = db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(id) as User;

    if (!user) {
      throw new AppError('用户不存在', 404);
    }

    const response: ApiResponse<User> = {
      success: true,
      data: user,
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const { name, email, phone, status } = req.body as UserCreate;

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

    const user = db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(result.lastInsertRowid) as User;

    const response: ApiResponse<User> = {
      success: true,
      data: user,
      message: '用户创建成功',
    };

    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new AppError('无效的用户ID', 400);
    }

    const existingUser = db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(id) as User;

    if (!existingUser) {
      throw new AppError('用户不存在', 404);
    }

    const { name, email, phone, status } = req.body as UserUpdate;

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

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id);

    const sql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    db.prepare(sql).run(...updateValues);

    const updatedUser = db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(id) as User;

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

router.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new AppError('无效的用户ID', 400);
    }

    const existingUser = db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(id) as User;

    if (!existingUser) {
      throw new AppError('用户不存在', 404);
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);

    const response: ApiResponse = {
      success: true,
      message: '用户删除成功',
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

export default router;
