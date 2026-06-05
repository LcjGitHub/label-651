import { Router, Request, Response, NextFunction } from 'express';
import { getDb } from '../database';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest, requireAuth, requirePermission } from '../middleware/auth';
import { Permission, PermissionCreate, PermissionUpdate, ApiResponse } from '../types';

const router = Router();

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

router.get('/', requireAuth, requirePermission('role:view'), (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const type = req.query.type as string;
    const tree = req.query.tree === 'true';

    let sql = 'SELECT * FROM permissions';
    const params: unknown[] = [];

    if (type && ['menu', 'action'].includes(type)) {
      sql += ' WHERE type = ?';
      params.push(type);
    }

    sql += ' ORDER BY sort_order, id';

    const permissions = db.prepare(sql).all(...params as unknown as []) as unknown as Permission[];
    const total = permissions.length;

    const data = tree ? buildPermissionTree(permissions) : permissions;

    const response: ApiResponse<Permission[]> = {
      success: true,
      data,
      total,
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.get('/tree', requireAuth, requirePermission('role:view'), (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const permissions = db
      .prepare('SELECT * FROM permissions ORDER BY sort_order, id')
      .all() as unknown as Permission[];

    const tree = buildPermissionTree(permissions);

    const response: ApiResponse<Permission[]> = {
      success: true,
      data: tree,
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
      throw new AppError('无效的权限ID', 400);
    }

    const permission = db
      .prepare('SELECT * FROM permissions WHERE id = ?')
      .get(id) as unknown as Permission;

    if (!permission) {
      throw new AppError('权限不存在', 404);
    }

    const response: ApiResponse<Permission> = {
      success: true,
      data: permission,
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, requirePermission('role:create'), (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const {
      name,
      code,
      type,
      parent_id,
      path,
      component,
      icon,
      sort_order,
      description,
    } = req.body as PermissionCreate;

    if (!name || !name.trim()) {
      throw new AppError('权限名称不能为空', 400);
    }
    if (!code || !code.trim()) {
      throw new AppError('权限编码不能为空', 400);
    }
    if (!type || !['menu', 'action'].includes(type)) {
      throw new AppError('权限类型不正确', 400);
    }

    const existingCode = db
      .prepare('SELECT id FROM permissions WHERE code = ?')
      .get(code.trim()) as { id: number } | undefined;
    if (existingCode) {
      throw new AppError('权限编码已存在', 400);
    }

    if (parent_id && parent_id > 0) {
      const parent = db
        .prepare('SELECT id FROM permissions WHERE id = ?')
        .get(parent_id) as { id: number } | undefined;
      if (!parent) {
        throw new AppError('父级权限不存在', 400);
      }
    }

    const result = db
      .prepare(
        `INSERT INTO permissions (name, code, type, parent_id, path, component, icon, sort_order, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        name.trim(),
        code.trim(),
        type,
        parent_id || 0,
        path || '',
        component || '',
        icon || '',
        sort_order || 0,
        description || ''
      );

    const permission = db
      .prepare('SELECT * FROM permissions WHERE id = ?')
      .get(result.lastInsertRowid) as unknown as Permission;

    const response: ApiResponse<Permission> = {
      success: true,
      data: permission,
      message: '权限创建成功',
    };

    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAuth, requirePermission('role:update'), (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new AppError('无效的权限ID', 400);
    }

    const existingPerm = db
      .prepare('SELECT * FROM permissions WHERE id = ?')
      .get(id) as unknown as Permission;

    if (!existingPerm) {
      throw new AppError('权限不存在', 404);
    }

    const {
      name,
      code,
      type,
      parent_id,
      path,
      component,
      icon,
      sort_order,
      description,
    } = req.body as PermissionUpdate;

    if (name !== undefined && !name.trim()) {
      throw new AppError('权限名称不能为空', 400);
    }
    if (code !== undefined && !code.trim()) {
      throw new AppError('权限编码不能为空', 400);
    }
    if (type !== undefined && !['menu', 'action'].includes(type)) {
      throw new AppError('权限类型不正确', 400);
    }

    if (code !== undefined && code.trim() !== existingPerm.code) {
      const existingCode = db
        .prepare('SELECT id FROM permissions WHERE code = ? AND id != ?')
        .get(code.trim(), id) as { id: number } | undefined;
      if (existingCode) {
        throw new AppError('权限编码已存在', 400);
      }
    }

    if (parent_id !== undefined && parent_id > 0 && parent_id !== existingPerm.parent_id) {
      if (parent_id === id) {
        throw new AppError('不能将自己设为父级权限', 400);
      }
      const parent = db
        .prepare('SELECT id FROM permissions WHERE id = ?')
        .get(parent_id) as { id: number } | undefined;
      if (!parent) {
        throw new AppError('父级权限不存在', 400);
      }
    }

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
    if (type !== undefined) {
      updateFields.push('type = ?');
      updateValues.push(type);
    }
    if (parent_id !== undefined) {
      updateFields.push('parent_id = ?');
      updateValues.push(parent_id || 0);
    }
    if (path !== undefined) {
      updateFields.push('path = ?');
      updateValues.push(path || '');
    }
    if (component !== undefined) {
      updateFields.push('component = ?');
      updateValues.push(component || '');
    }
    if (icon !== undefined) {
      updateFields.push('icon = ?');
      updateValues.push(icon || '');
    }
    if (sort_order !== undefined) {
      updateFields.push('sort_order = ?');
      updateValues.push(sort_order || 0);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description || '');
    }

    if (updateFields.length === 0) {
      throw new AppError('没有需要更新的字段', 400);
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id);

    const sql = `UPDATE permissions SET ${updateFields.join(', ')} WHERE id = ?`;
    db.prepare(sql).run(...updateValues as unknown as []);

    const updatedPerm = db
      .prepare('SELECT * FROM permissions WHERE id = ?')
      .get(id) as unknown as Permission;

    const response: ApiResponse<Permission> = {
      success: true,
      data: updatedPerm,
      message: '权限更新成功',
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, requirePermission('role:delete'), (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new AppError('无效的权限ID', 400);
    }

    const existingPerm = db
      .prepare('SELECT * FROM permissions WHERE id = ?')
      .get(id) as unknown as Permission;

    if (!existingPerm) {
      throw new AppError('权限不存在', 404);
    }

    const childCount = db
      .prepare('SELECT COUNT(*) as cnt FROM permissions WHERE parent_id = ?')
      .get(id) as { cnt: number };
    if (childCount.cnt > 0) {
      throw new AppError(`该权限下还有 ${childCount.cnt} 个子权限，请先删除子权限`, 400);
    }

    const roleCount = db
      .prepare('SELECT COUNT(*) as cnt FROM role_permissions WHERE permission_id = ?')
      .get(id) as { cnt: number };
    if (roleCount.cnt > 0) {
      throw new AppError(`该权限已被 ${roleCount.cnt} 个角色使用，请先移除关联`, 400);
    }

    db.prepare('DELETE FROM permissions WHERE id = ?').run(id);

    const response: ApiResponse = {
      success: true,
      message: '权限删除成功',
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

export default router;
