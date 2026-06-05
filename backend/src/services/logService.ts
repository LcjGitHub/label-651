import { getDb } from '../database';
import { OperationType, OperationLogDetail } from '../types';

export const getClientIp = (req: any): string => {
  const forwarded = req.headers['x-forwarded-for'] as string;
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers['x-real-ip'] as string;
  if (realIp) {
    return realIp;
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
};

export const getOperatorName = (userId: number): string => {
  const db = getDb();
  const user = db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as { name: string } | undefined;
  return user?.name || '未知用户';
};

export const recordOperationLog = (
  operatorId: number,
  operatorName: string,
  operationType: OperationType,
  module: string,
  detail: OperationLogDetail,
  ipAddress: string
): number => {
  const db = getDb();
  const detailJson = JSON.stringify(detail);
  
  const result = db
    .prepare(
      `INSERT INTO operation_logs 
       (operator_id, operator_name, operation_type, module, detail, ip_address) 
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(operatorId, operatorName, operationType, module, detailJson, ipAddress);
  
  return result.lastInsertRowid as number;
};

export const compareChanges = (
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined
): Record<string, { old: unknown; new: unknown }> => {
  const changes: Record<string, { old: unknown; new: unknown }> = {};
  
  if (!before || !after) return changes;
  
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  
  for (const key of allKeys) {
    if (key === 'created_at' || key === 'updated_at') continue;
    
    const oldVal = before[key];
    const newVal = after[key];
    
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes[key] = {
        old: oldVal,
        new: newVal,
      };
    }
  }
  
  return changes;
};
