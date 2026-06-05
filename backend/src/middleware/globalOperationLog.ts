import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { getClientIp, getOperatorName, recordOperationLog, compareChanges } from '../services/logService';
import { OperationType, OperationLogDetail } from '../types';
import { getUserWithRoles, getRoleWithPermissions, getRecordById } from './operationLog';
import { getDb } from '../database';

interface RouteConfig {
  pattern: RegExp;
  method: string;
  module: string;
  operationType: OperationType;
  getBeforeData?: (req: AuthRequest) => Promise<Record<string, unknown> | undefined>;
  getAfterData?: (req: AuthRequest) => Promise<Record<string, unknown> | undefined>;
}

const extractIdFromPath = (path: string, pattern: RegExp): number | null => {
  const match = path.match(pattern);
  if (match && match[1]) {
    const id = parseInt(match[1]);
    return isNaN(id) ? null : id;
  }
  return null;
};

const getPermissionWithDetails = (id: number): Record<string, unknown> | undefined => {
  return getRecordById('permissions', id);
};

const routeConfigs: RouteConfig[] = [
  {
    pattern: /^\/api\/users\/?$/,
    method: 'POST',
    module: '用户管理',
    operationType: 'CREATE',
    getAfterData: async (req) => {
      const responseData = (req as any)._responseData;
      if (responseData && responseData.success && responseData.data && responseData.data.id) {
        return getUserWithRoles(responseData.data.id);
      }
      return undefined;
    },
  },
  {
    pattern: /^\/api\/users\/(\d+)\/?$/,
    method: 'PUT',
    module: '用户管理',
    operationType: 'UPDATE',
    getBeforeData: async (req) => {
      const id = extractIdFromPath(req.path, /^\/api\/users\/(\d+)\/?$/);
      return id ? getUserWithRoles(id) : undefined;
    },
    getAfterData: async (req) => {
      const id = extractIdFromPath(req.path, /^\/api\/users\/(\d+)\/?$/);
      return id ? getUserWithRoles(id) : undefined;
    },
  },
  {
    pattern: /^\/api\/users\/(\d+)\/roles\/?$/,
    method: 'PUT',
    module: '用户管理',
    operationType: 'UPDATE',
    getBeforeData: async (req) => {
      const id = extractIdFromPath(req.path, /^\/api\/users\/(\d+)\/roles\/?$/);
      return id ? getUserWithRoles(id) : undefined;
    },
    getAfterData: async (req) => {
      const id = extractIdFromPath(req.path, /^\/api\/users\/(\d+)\/roles\/?$/);
      return id ? getUserWithRoles(id) : undefined;
    },
  },
  {
    pattern: /^\/api\/users\/(\d+)\/?$/,
    method: 'DELETE',
    module: '用户管理',
    operationType: 'DELETE',
    getBeforeData: async (req) => {
      const id = extractIdFromPath(req.path, /^\/api\/users\/(\d+)\/?$/);
      return id ? getUserWithRoles(id) : undefined;
    },
  },
  {
    pattern: /^\/api\/roles\/?$/,
    method: 'POST',
    module: '角色管理',
    operationType: 'CREATE',
    getAfterData: async (req) => {
      const responseData = (req as any)._responseData;
      if (responseData && responseData.success && responseData.data && responseData.data.id) {
        return getRoleWithPermissions(responseData.data.id);
      }
      return undefined;
    },
  },
  {
    pattern: /^\/api\/roles\/(\d+)\/?$/,
    method: 'PUT',
    module: '角色管理',
    operationType: 'UPDATE',
    getBeforeData: async (req) => {
      const id = extractIdFromPath(req.path, /^\/api\/roles\/(\d+)\/?$/);
      return id ? getRoleWithPermissions(id) : undefined;
    },
    getAfterData: async (req) => {
      const id = extractIdFromPath(req.path, /^\/api\/roles\/(\d+)\/?$/);
      return id ? getRoleWithPermissions(id) : undefined;
    },
  },
  {
    pattern: /^\/api\/roles\/(\d+)\/permissions\/?$/,
    method: 'PUT',
    module: '角色管理',
    operationType: 'UPDATE',
    getBeforeData: async (req) => {
      const id = extractIdFromPath(req.path, /^\/api\/roles\/(\d+)\/permissions\/?$/);
      return id ? getRoleWithPermissions(id) : undefined;
    },
    getAfterData: async (req) => {
      const id = extractIdFromPath(req.path, /^\/api\/roles\/(\d+)\/permissions\/?$/);
      return id ? getRoleWithPermissions(id) : undefined;
    },
  },
  {
    pattern: /^\/api\/roles\/(\d+)\/?$/,
    method: 'DELETE',
    module: '角色管理',
    operationType: 'DELETE',
    getBeforeData: async (req) => {
      const id = extractIdFromPath(req.path, /^\/api\/roles\/(\d+)\/?$/);
      return id ? getRoleWithPermissions(id) : undefined;
    },
  },
  {
    pattern: /^\/api\/permissions\/?$/,
    method: 'POST',
    module: '权限管理',
    operationType: 'CREATE',
    getAfterData: async (req) => {
      const responseData = (req as any)._responseData;
      if (responseData && responseData.success && responseData.data && responseData.data.id) {
        return getPermissionWithDetails(responseData.data.id);
      }
      return undefined;
    },
  },
  {
    pattern: /^\/api\/permissions\/(\d+)\/?$/,
    method: 'PUT',
    module: '权限管理',
    operationType: 'UPDATE',
    getBeforeData: async (req) => {
      const id = extractIdFromPath(req.path, /^\/api\/permissions\/(\d+)\/?$/);
      return id ? getPermissionWithDetails(id) : undefined;
    },
    getAfterData: async (req) => {
      const id = extractIdFromPath(req.path, /^\/api\/permissions\/(\d+)\/?$/);
      return id ? getPermissionWithDetails(id) : undefined;
    },
  },
  {
    pattern: /^\/api\/permissions\/(\d+)\/?$/,
    method: 'DELETE',
    module: '权限管理',
    operationType: 'DELETE',
    getBeforeData: async (req) => {
      const id = extractIdFromPath(req.path, /^\/api\/permissions\/(\d+)\/?$/);
      return id ? getPermissionWithDetails(id) : undefined;
    },
  },
];

const findRouteConfig = (path: string, method: string): RouteConfig | undefined => {
  return routeConfigs.find(
    (config) => config.pattern.test(path) && config.method === method.toUpperCase()
  );
};

export const globalOperationLogMiddleware = () => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const method = req.method.toUpperCase();
    
    if (method === 'GET' || method === 'OPTIONS' || method === 'HEAD') {
      return next();
    }

    if (!req.path.startsWith('/api/') || req.path === '/api/auth/login') {
      return next();
    }

    const config = findRouteConfig(req.path, method);
    if (!config) {
      return next();
    }

    let beforeData: Record<string, unknown> | undefined;
    let afterData: Record<string, unknown> | undefined;

    try {
      if (config.getBeforeData) {
        beforeData = await config.getBeforeData(req);
      }
    } catch (err) {
      console.error('全局日志：获取操作前数据失败:', err);
    }

    const originalSend = res.send;
    (res as any).send = function (body: unknown) {
      try {
        if (typeof body === 'string') {
          (req as any)._responseData = JSON.parse(body);
        } else {
          (req as any)._responseData = body;
        }
      } catch (e) {
        (req as any)._responseData = null;
      }
      return originalSend.call(this, body);
    };

    res.on('finish', async () => {
      try {
        if (res.statusCode >= 400) return;

        if (!req.userId) return;

        if (config.getAfterData) {
          afterData = await config.getAfterData(req);
        }

        const changes = compareChanges(beforeData, afterData);
        const detail: OperationLogDetail = {
          before: beforeData,
          after: afterData,
          changes: Object.keys(changes).length > 0 ? changes : undefined,
        };

        if (config.operationType === 'UPDATE' && Object.keys(changes).length === 0) {
          return;
        }

        const operatorId = req.userId;
        const operatorName = getOperatorName(operatorId);
        const ipAddress = getClientIp(req);

        recordOperationLog(
          operatorId,
          operatorName,
          config.operationType,
          config.module,
          detail,
          ipAddress
        );
      } catch (err) {
        console.error('全局日志：记录操作日志失败:', err);
      }
    });

    next();
  };
};
