import { Router, Request, Response, NextFunction } from 'express';
import { getDb } from '../database';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest, requireAuth, requirePermission } from '../middleware/auth';
import { Role, RoleCreate, RoleUpdate, Permission, ApiResponse } from '../types';

const router = Router();

const getRolePermissions = (db: any, roleId: number): Permission[] => {
  return db
    .prepare(
      `SELECT p.* FROM permissions p
       INNER JOIN role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role_id = ?
       ORDER BY p.sort_order, p.id`
    )
    .all(roleId) as unknown as Permission[];
};

const buildPermissionTree = (permissions: Permission[]): Permission[] => {
  const map = new Map<number, Permission>();
  const roots: Permission[] = [];

  permissions.forEach((p) => {
    map.set(p.id, { ...p, children: [] });
  });

  permissions.forEach((p) => {
    const node = map.get(p.id)!;
    if (p.parent_id === 0) {
      roots.push(node);
    } else {
      const parent = map.get(p.parent_id);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }
  });

  return roots;
};

const getRoleUserCount = (db: any, roleId: number): number => {
  const result = db
    .prepare('SELECT COUNT(*) as cnt FROM user_roles WHERE role_id = ?')
    .get(roleId) as { cnt: number };
  return result.cnt;
};

const getRolePermissionCount = (db: any, roleId: number): number => {
  const result = db
    .prepare('SELECT COUNT(*) as cnt FROM role_permissions WHERE role_id = ?')
    .get(roleId) as { cnt: number };
  return result.cnt;
};

router.get('/', requireAuth, requirePermission('role:list'), (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const search = req.query.search as string;
    let roles: Role[];
    let total: number;

    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      roles = db
        .prepare(
          'SELECT * FROM roles WHERE name LIKE ? OR code LIKE ? OR description LIKE ? ORDER BY created_at DESC'
        )
        .all(searchTerm, searchTerm, searchTerm) as unknown as Role[];
      total = roles.length;
    } else {
      roles = db
        .prepare('SELECT * FROM roles ORDER BY created_at DESC')
        .all() as unknown as Role[];
      const countResult = db
        .prepare('SELECT COUNT(*) as cnt FROM roles')
        .get() as { cnt: number };
      total = countResult.cnt;
    }

    roles = roles.map((role) => ({
      ...role,
      user_count: getRoleUserCount(db, role.id),
      permission_count: getRolePermissionCount(db, role.id),
    }));

    const response: ApiResponse<Role[]> = {
      success: true,
      data: roles,
      total,
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.get('/all', requireAuth, requirePermission('role:view'), (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const roles = db
      .prepare("SELECT * FROM roles WHERE status = 'active' ORDER BY id")
      .all() as unknown as Role[];

    const response: ApiResponse<Role[]> = {
      success: true,
      data: roles,
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, requirePermission('role:view'), (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new AppError('无效的角色ID', 400);
    }

    const role = db
      .prepare('SELECT * FROM roles WHERE id = ?')
      .get(id) as unknown as Role;

    if (!role) {
      throw new AppError('角色不存在', 404);
    }

    const permissions = getRolePermissions(db, id);
    role.permissions = buildPermissionTree(permissions);
    role.user_count = getRoleUserCount(db, id);

    const response: ApiResponse<Role> = {
      success: true,
      data: role,
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/permissions', requireAuth, requirePermission('role:view'), (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new AppError('无效的角色ID', 400);
    }

    const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(id) as unknown as Role;
    if (!role) {
      throw new AppError('角色不存在', 404);
    }

    const permissions = getRolePermissions(db, id);
    const permissionIds = permissions.map((p) => p.id);

    const response: ApiResponse<{ permissions: Permission[]; permission_ids: number[] }> = {
      success: true,
      data: {
        permissions: buildPermissionTree(permissions),
        permission_ids: permissionIds,
      },
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, requirePermission('role:create'),
  (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const { name, code, description, status, permission_ids } = req.body as RoleCreate;

    if (!name || !name.trim()) {
      throw new AppError('角色名称不能为空', 400);
    }
    if (!code || !code.trim()) {
      throw new AppError('角色编码不能为空', 400);
    }
    if (status && !['active', 'inactive'].includes(status)) {
      throw new AppError('状态值不正确', 400);
    }

    const existingName = db
      .prepare('SELECT id FROM roles WHERE name = ?')
      .get(name.trim()) as { id: number } | undefined;
    if (existingName) {
      throw new AppError('角色名称已存在', 400);
    }

    const existingCode = db
      .prepare('SELECT id FROM roles WHERE code = ?')
      .get(code.trim()) as { id: number } | undefined;
    if (existingCode) {
      throw new AppError('角色编码已存在', 400);
    }

    let roleId: number | null = null;

    db.exec('BEGIN TRANSACTION');
    try {
      const result = db
        .prepare(
          'INSERT INTO roles (name, code, description, status) VALUES (?, ?, ?, ?)'
        )
        .run(
          name.trim(),
          code.trim(),
          description || '',
          status || 'active'
        );

      roleId = result.lastInsertRowid as number;

      if (permission_ids && permission_ids.length > 0) {
        const insertPerm = db.prepare(
          'INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)'
        );
        for (const permId of permission_ids) {
          insertPerm.run(roleId, permId);
        }
      }

      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    const role = db
      .prepare('SELECT * FROM roles WHERE id = ?')
      .get(roleId) as unknown as Role;
    role.user_count = 0;

    const response: ApiResponse<Role> = {
      success: true,
      data: role,
      message: '角色创建成功',
    };

    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAuth, requirePermission('role:update'),
  (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new AppError('无效的角色ID', 400);
    }

    const existingRole = db
      .prepare('SELECT * FROM roles WHERE id = ?')
      .get(id) as unknown as Role;

    if (!existingRole) {
      throw new AppError('角色不存在', 404);
    }

    const { name, code, description, status, permission_ids } = req.body as RoleUpdate;

    if (name !== undefined && !name.trim()) {
      throw new AppError('角色名称不能为空', 400);
    }
    if (code !== undefined && !code.trim()) {
      throw new AppError('角色编码不能为空', 400);
    }
    if (status !== undefined && !['active', 'inactive'].includes(status)) {
      throw new AppError('状态值不正确', 400);
    }

    if (name !== undefined && name.trim() !== existingRole.name) {
      const existingName = db
        .prepare('SELECT id FROM roles WHERE name = ? AND id != ?')
        .get(name.trim(), id) as { id: number } | undefined;
      if (existingName) {
        throw new AppError('角色名称已存在', 400);
      }
    }

    if (code !== undefined && code.trim() !== existingRole.code) {
      const existingCode = db
        .prepare('SELECT id FROM roles WHERE code = ? AND id != ?')
        .get(code.trim(), id) as { id: number } | undefined;
      if (existingCode) {
        throw new AppError('角色编码已存在', 400);
      }
    }

    db.exec('BEGIN TRANSACTION');
    try {
      const updateFields: string[] = [];
      const updateValues: unknown[] = [];

      if (name !== undefined) {
        updateFields.push('name = ?');
        updateValues.push(name.trim());
      }
      if (code !== undefined) {
        updateFields.push('code = ?');
        updateValues.push(code.trim());
      }
      if (description !== undefined) {
        updateFields.push('description = ?');
        updateValues.push(description || '');
      }
      if (status !== undefined) {
        updateFields.push('status = ?');
        updateValues.push(status);
      }

      if (updateFields.length > 0) {
        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateValues.push(id);
        const sql = `UPDATE roles SET ${updateFields.join(', ')} WHERE id = ?`;
        db.prepare(sql).run(...updateValues as unknown as []);
      }

      if (permission_ids !== undefined) {
        db.prepare('DELETE FROM role_permissions WHERE role_id = ?').run(id);
        if (permission_ids.length > 0) {
          const insertPerm = db.prepare(
            'INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)'
          );
          for (const permId of permission_ids) {
            insertPerm.run(id, permId);
          }
        }
      }

      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    const updatedRole = db
      .prepare('SELECT * FROM roles WHERE id = ?')
      .get(id) as unknown as Role;
    updatedRole.user_count = getRoleUserCount(db, id);

    const response: ApiResponse<Role> = {
      success: true,
      data: updatedRole,
      message: '角色更新成功',
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.put('/:id/permissions', requireAuth, requirePermission('role:assign'),
  (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new AppError('无效的角色ID', 400);
    }

    const existingRole = db
      .prepare('SELECT * FROM roles WHERE id = ?')
      .get(id) as unknown as Role;

    if (!existingRole) {
      throw new AppError('角色不存在', 404);
    }

    const { permission_ids } = req.body as { permission_ids: number[] };

    if (!Array.isArray(permission_ids)) {
      throw new AppError('权限ID列表格式不正确', 400);
    }

    db.exec('BEGIN TRANSACTION');
    try {
      db.prepare('DELETE FROM role_permissions WHERE role_id = ?').run(id);
      if (permission_ids.length > 0) {
        const insertPerm = db.prepare(
          'INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)'
        );
        for (const permId of permission_ids) {
          insertPerm.run(id, permId);
        }
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    const response: ApiResponse = {
      success: true,
      message: '权限分配成功',
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, requirePermission('role:delete'),
  (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new AppError('无效的角色ID', 400);
    }

    const existingRole = db
      .prepare('SELECT * FROM roles WHERE id = ?')
      .get(id) as unknown as Role;

    if (!existingRole) {
      throw new AppError('角色不存在', 404);
    }

    const userCount = getRoleUserCount(db, id);
    if (userCount > 0) {
      throw new AppError(`该角色下还有 ${userCount} 个用户，请先移除用户关联`, 400);
    }

    db.exec('BEGIN TRANSACTION');
    try {
      db.prepare('DELETE FROM role_permissions WHERE role_id = ?').run(id);
      db.prepare('DELETE FROM roles WHERE id = ?').run(id);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    const response: ApiResponse = {
      success: true,
      message: '角色删除成功',
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

export default router;
