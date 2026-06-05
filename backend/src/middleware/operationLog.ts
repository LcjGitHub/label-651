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

export const getDataFromResponse = (res: any): Record<string, unknown> | undefined => {
  const responseData = res.locals?.responseData;
  if (responseData && responseData.success && responseData.data) {
    return responseData.data as Record<string, unknown>;
  }
  return undefined;
};
