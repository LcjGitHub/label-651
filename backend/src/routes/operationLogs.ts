import { Router, Request, Response, NextFunction } from 'express';
import { getDb } from '../database';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest, requireAuth, requirePermission } from '../middleware/auth';
import { OperationLog, OperationLogQuery, ApiResponse } from '../types';

const router = Router();

router.get('/', requireAuth, requirePermission('system:log'), (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const {
      operator_id,
      operation_type,
      module,
      start_time,
      end_time,
      page = 1,
      page_size = 20,
    } = req.query as unknown as OperationLogQuery;

    const pageNum = Math.max(1, parseInt(String(page)) || 1);
    const pageSize = Math.max(1, Math.min(100, parseInt(String(page_size)) || 20));
    const offset = (pageNum - 1) * pageSize;

    const whereClauses: string[] = [];
    const params: unknown[] = [];

    if (operator_id) {
      whereClauses.push('operator_id = ?');
      params.push(parseInt(String(operator_id)));
    }
    if (operation_type) {
      whereClauses.push('operation_type = ?');
      params.push(operation_type);
    }
    if (module) {
      whereClauses.push('module = ?');
      params.push(module);
    }
    if (start_time) {
      whereClauses.push('created_at >= ?');
      params.push(start_time);
    }
    if (end_time) {
      whereClauses.push('created_at <= ?');
      params.push(end_time + ' 23:59:59');
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) as cnt FROM operation_logs ${whereSql}`;
    const countResult = db.prepare(countSql).get(...params as unknown as []) as { cnt: number };
    const total = countResult.cnt;

    const querySql = `
      SELECT * FROM operation_logs 
      ${whereSql}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    const queryParams = [...params, pageSize, offset] as any;
    const logs = db.prepare(querySql).all(...queryParams) as unknown as OperationLog[];

    const response: ApiResponse<OperationLog[]> = {
      success: true,
      data: logs,
      total,
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.get('/modules', requireAuth, requirePermission('system:log'), (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const result = db.prepare('SELECT DISTINCT module FROM operation_logs ORDER BY module').all() as { module: string }[];
    const modules = result.map(r => r.module);

    const response: ApiResponse<string[]> = {
      success: true,
      data: modules,
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.get('/operators', requireAuth, requirePermission('system:log'), (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const result = db.prepare('SELECT DISTINCT operator_id as id, operator_name as name FROM operation_logs ORDER BY operator_name').all() as { id: number; name: string }[];

    const response: ApiResponse<{ id: number; name: string }[]> = {
      success: true,
      data: result,
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, requirePermission('system:log'), (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new AppError('无效的日志ID', 400);
    }

    const log = db.prepare('SELECT * FROM operation_logs WHERE id = ?').get(id) as unknown as OperationLog;
    if (!log) {
      throw new AppError('日志不存在', 404);
    }

    const response: ApiResponse<OperationLog> = {
      success: true,
      data: log,
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

export default router;
