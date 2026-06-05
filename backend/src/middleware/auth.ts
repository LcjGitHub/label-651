import { Request, Response, NextFunction } from 'express';
import { getDb } from '../database';
import { AppError } from './errorHandler';
import { Permission } from '../types';

export interface AuthRequest extends Request {
  userId?: number;
  userRoles?: string[];
  userPermissions?: string[];
}

export const getUserRoles = (db: any, userId: number): string[] => {
  const roles = db
    .prepare(
      `SELECT r.code FROM roles r
       INNER JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = ? AND r.status = 'active'`
    )
    .all(userId) as { code: string }[];
  return roles.map((r) => r.code);
};

export const getUserPermissions = (db: any, userId: number): string[] => {
  const permissions = db
    .prepare(
      `SELECT DISTINCT p.code FROM permissions p
       INNER JOIN role_permissions rp ON p.id = rp.permission_id
       INNER JOIN user_roles ur ON rp.role_id = ur.role_id
       INNER JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = ? AND r.status = 'active'`
    )
    .all(userId) as { code: string }[];
  return permissions.map((p) => p.code);
};

export const hasRole = (userId: number, roleCode: string): boolean => {
  const db = getDb();
  const result = db
    .prepare(
      `SELECT 1 FROM roles r
       INNER JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = ? AND r.code = ? AND r.status = 'active'`
    )
    .get(userId, roleCode);
  return !!result;
};

export const hasPermission = (userId: number, permissionCode: string): boolean => {
  const db = getDb();
  const result = db
    .prepare(
      `SELECT 1 FROM permissions p
       INNER JOIN role_permissions rp ON p.id = rp.permission_id
       INNER JOIN user_roles ur ON rp.role_id = ur.role_id
       INNER JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = ? AND p.code = ? AND r.status = 'active'`
    )
    .get(userId, permissionCode);
  return !!result;
};

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.headers['x-user-id'] as string;

  if (!userId) {
    return next(new AppError('未授权，请先登录', 401));
  }

  const id = parseInt(userId);
  if (isNaN(id)) {
    return next(new AppError('无效的用户ID', 401));
  }

  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!user) {
    return next(new AppError('用户不存在', 401));
  }

  req.userId = id;
  req.userRoles = getUserRoles(db, id);
  req.userPermissions = getUserPermissions(db, id);

  next();
};

export const requireRole = (roleCode: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userId) {
      return next(new AppError('未授权，请先登录', 401));
    }

    if (!req.userRoles?.includes(roleCode)) {
      return next(new AppError('没有访问权限，需要角色: ' + roleCode, 403));
    }

    next();
  };
};

export const requirePermission = (permissionCode: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userId) {
      return next(new AppError('未授权，请先登录', 401));
    }

    if (!req.userPermissions?.includes(permissionCode)) {
      return next(new AppError('没有操作权限，需要权限: ' + permissionCode, 403));
    }

    next();
  };
};

export const requireAnyRole = (roleCodes: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userId) {
      return next(new AppError('未授权，请先登录', 401));
    }

    const hasAny = roleCodes.some((code) => req.userRoles?.includes(code));
    if (!hasAny) {
      return next(new AppError('没有访问权限，需要角色之一: ' + roleCodes.join(', '), 403));
    }

    next();
  };
};

export const requireAnyPermission = (permissionCodes: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userId) {
      return next(new AppError('未授权，请先登录', 401));
    }

    const hasAny = permissionCodes.some((code) => req.userPermissions?.includes(code));
    if (!hasAny) {
      return next(new AppError('没有操作权限，需要权限之一: ' + permissionCodes.join(', '), 403));
    }

    next();
  };
};

export const requireAllRoles = (roleCodes: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userId) {
      return next(new AppError('未授权，请先登录', 401));
    }

    const hasAll = roleCodes.every((code) => req.userRoles?.includes(code));
    if (!hasAll) {
      return next(new AppError('没有访问权限，需要全部角色: ' + roleCodes.join(', '), 403));
    }

    next();
  };
};

export const requireAllPermissions = (permissionCodes: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userId) {
      return next(new AppError('未授权，请先登录', 401));
    }

    const hasAll = permissionCodes.every((code) => req.userPermissions?.includes(code));
    if (!hasAll) {
      return next(new AppError('没有操作权限，需要全部权限: ' + permissionCodes.join(', '), 403));
    }

    next();
  };
};
