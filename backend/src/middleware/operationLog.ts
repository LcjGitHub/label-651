import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { getClientIp, getOperatorName, recordOperationLog, compareChanges } from '../services/logService';
import { OperationType, OperationLogDetail } from '../types';
import { getDb } from '../database';

export interface LogContext {
  module: string;
  operationType: OperationType;
  getBeforeData?: (req: AuthRequest) => Promise<Record<string, unknown> | undefined>;
  getAfterData?: (req: AuthRequest, res: Response) => Promise<Record<string, unknown> | undefined>;
  shouldLog?: (req: AuthRequest, res: Response) => boolean;
}

export const withOperationLog = (context: LogContext) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    let beforeData: Record<string, unknown> | undefined;
    let afterData: Record<string, unknown> | undefined;
    let responseBody: unknown;

    try {
      if (context.getBeforeData) {
        beforeData = await context.getBeforeData(req);
      }
    } catch (err) {
      console.error('获取操作前数据失败:', err);
    }

    res.send = function (body: unknown) {
      responseBody = body;
      return originalSend.call(this, body);
    };

    res.on('finish', async () => {
      try {
        const shouldLog = context.shouldLog ? context.shouldLog(req, res) : res.statusCode < 400;
        if (!shouldLog) return;

        const operatorId = req.userId!;
        const operatorName = getOperatorName(operatorId);
        const ipAddress = getClientIp(req);

        if (context.getAfterData && responseBody) {
          try {
            const parsed = typeof responseBody === 'string' ? JSON.parse(responseBody) : responseBody;
            res.locals.responseData = parsed;
            afterData = await context.getAfterData(req, res);
          } catch (err) {
            console.error('获取操作后数据失败:', err);
          }
        }

        const changes = compareChanges(beforeData, afterData);
        const detail: OperationLogDetail = {
          before: beforeData,
          after: afterData,
          changes: Object.keys(changes).length > 0 ? changes : undefined,
        };

        recordOperationLog(
          operatorId,
          operatorName,
          context.operationType,
          context.module,
          detail,
          ipAddress
        );
      } catch (err) {
        console.error('记录操作日志失败:', err);
      }
    });

    next();
  };
};

export const getRecordById = (tableName: string, id: number): Record<string, unknown> | undefined => {
  const db = getDb();
  const result = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).get(id);
  return result as Record<string, unknown> | undefined;
};

export const getUserWithRoles = (id: number): Record<string, unknown> | undefined => {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!user) return undefined;

  const roles = db.prepare(`
    SELECT r.* FROM roles r
    INNER JOIN user_roles ur ON r.id = ur.role_id
    WHERE ur.user_id = ?
    ORDER BY r.id
  `).all(id);

  const roleIds = roles.map((r: any) => r.id);

  return {
    ...user,
    roles,
    role_ids: roleIds,
  };
};

export const getRoleWithPermissions = (id: number): Record<string, unknown> | undefined => {
  const db = getDb();
  const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!role) return undefined;

  const permissions = db.prepare(`
    SELECT p.* FROM permissions p
    INNER JOIN role_permissions rp ON p.id = rp.permission_id
    WHERE rp.role_id = ?
    ORDER BY p.id
  `).all(id);

  const permissionIds = permissions.map((p: any) => p.id);

  return {
    ...role,
    permissions,
    permission_ids: permissionIds,
  };
};

export const getDataFromResponse = (res: any): Record<string, unknown> | undefined => {
  const responseData = res.locals?.responseData;
  if (responseData && responseData.success && responseData.data) {
    return responseData.data as Record<string, unknown>;
  }
  return undefined;
};
