import { Router, Request, Response, NextFunction } from 'express';
import { getDb } from '../database';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest, requireAuth, getUserRoles, getUserPermissions } from '../middleware/auth';
import { User, ApiResponse, LoginResponse, Role } from '../types';

const router = Router();

router.post('/login', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const { user_id } = req.body as { user_id?: number };

    if (!user_id) {
      throw new AppError('请选择用户身份', 400);
    }

    const user = db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(user_id) as unknown as User;

    if (!user) {
      throw new AppError('用户不存在', 404);
    }

    if (user.status !== 'active') {
      throw new AppError('用户已被禁用', 403);
    }

    const roles = db
      .prepare(
        `SELECT r.* FROM roles r
         INNER JOIN user_roles ur ON r.id = ur.role_id
         WHERE ur.user_id = ? AND r.status = 'active'
         ORDER BY r.id`
      )
      .all(user_id) as unknown as Role[];

    const roleCodes = roles.map((r) => r.code);
    const permissions = getUserPermissions(db, user_id);

    user.roles = roles;

    const response: ApiResponse<LoginResponse> = {
      success: true,
      data: {
        user,
        roles: roleCodes,
        permissions,
      },
      message: '登录成功',
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const userId = req.userId!;

    const user = db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(userId) as unknown as User;

    const roles = db
      .prepare(
        `SELECT r.* FROM roles r
         INNER JOIN user_roles ur ON r.id = ur.role_id
         WHERE ur.user_id = ? AND r.status = 'active'
         ORDER BY r.id`
      )
      .all(userId) as unknown as Role[];

    user.roles = roles;

    const response: ApiResponse<LoginResponse> = {
      success: true,
      data: {
        user,
        roles: req.userRoles || [],
        permissions: req.userPermissions || [],
      },
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.get('/users', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const users = db
      .prepare("SELECT id, name, email FROM users WHERE status = 'active' ORDER BY id")
      .all() as unknown as Pick<User, 'id' | 'name' | 'email'>[];

    const response: ApiResponse<Pick<User, 'id' | 'name' | 'email'>[]> = {
      success: true,
      data: users,
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

export default router;
