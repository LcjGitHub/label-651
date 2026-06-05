import { Router, Response, NextFunction } from 'express';
import { DatabaseSync } from 'node:sqlite';
import { getDb } from '../database';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { Message, MessageCreate, MessageQuery, ApiResponse, MessageType } from '../types';
import { sendMessageToUser, sendMessageToUsers, broadcastMessage, sendUnreadCountUpdate } from '../services/wsService';

const router = Router();

const getUnreadCount = (db: DatabaseSync, userId: number): number => {
  const result = db
    .prepare('SELECT COUNT(*) as cnt FROM messages WHERE receiver_id = ? AND is_read = 0')
    .get(userId) as { cnt: number };
  return result.cnt;
};

const getSenderName = (db: DatabaseSync, senderId: number | null): string => {
  if (!senderId) return '系统';
  const user = db.prepare('SELECT name FROM users WHERE id = ?').get(senderId) as { name: string } | undefined;
  return user?.name || '未知用户';
};

const enrichMessage = (db: DatabaseSync, msg: Message): Message => {
  return {
    ...msg,
    sender_name: getSenderName(db, msg.sender_id),
  };
};

router.get('/', requireAuth, (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const userId = req.userId!;
    const { type, is_read, page = 1, page_size = 20 } = req.query as unknown as MessageQuery;

    const conditions: string[] = ['receiver_id = ?'];
    const params: (string | number)[] = [userId];

    if (type && ['system', 'task', 'other'].includes(type)) {
      conditions.push('type = ?');
      params.push(type);
    }
    if (is_read !== undefined && (is_read === 0 || is_read === 1)) {
      conditions.push('is_read = ?');
      params.push(is_read);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countStmt = db.prepare(`SELECT COUNT(*) as cnt FROM messages ${whereClause}`);
    const countResult = countStmt.get(...params) as { cnt: number };
    const total = countResult.cnt;

    const currentPage = Math.max(1, page || 1);
    const currentPageSize = Math.min(100, Math.max(1, page_size || 20));
    const offset = (currentPage - 1) * currentPageSize;

    const queryStmt = db.prepare(
      `SELECT * FROM messages ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    );
    const messages = queryStmt.all(...params, currentPageSize, offset) as unknown as Message[];

    const enrichedMessages = messages.map((m) => enrichMessage(db, m));
    const unreadCount = getUnreadCount(db, userId);

    const response: ApiResponse<Message[]> = {
      success: true,
      data: enrichedMessages,
      total,
      filteredTotal: total,
      message: undefined,
    };

    res.json({
      ...response,
      unread_count: unreadCount,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/unread-count', requireAuth, (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const userId = req.userId!;
    const unreadCount = getUnreadCount(db, userId);

    const response: ApiResponse<{ unread_count: number }> = {
      success: true,
      data: { unread_count: unreadCount },
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const userId = req.userId!;
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      throw new AppError('无效的消息ID', 400);
    }

    const message = db
      .prepare('SELECT * FROM messages WHERE id = ? AND receiver_id = ?')
      .get(id, userId) as unknown as Message | undefined;

    if (!message) {
      throw new AppError('消息不存在', 404);
    }

    if (message.is_read === 0) {
      db.prepare('UPDATE messages SET is_read = 1 WHERE id = ?').run(id);
      message.is_read = 1;
      const unreadCount = getUnreadCount(db, userId);
      sendUnreadCountUpdate(userId, unreadCount);
    }

    const enrichedMessage = enrichMessage(db, message);
    const unreadCount = getUnreadCount(db, userId);

    const response: ApiResponse<Message> = {
      success: true,
      data: enrichedMessage,
      message: undefined,
      total: undefined,
      filteredTotal: undefined,
    };

    res.json({
      ...response,
      unread_count: unreadCount,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const senderId = req.userId!;
    const { title, content, receiver_ids, send_to_all, type } = req.body as MessageCreate;

    if (!title || !title.trim()) {
      throw new AppError('消息标题不能为空', 400);
    }
    if (!content || !content.trim()) {
      throw new AppError('消息内容不能为空', 400);
    }
    if (type && !['system', 'task', 'other'].includes(type)) {
      throw new AppError('消息类型不正确', 400);
    }
    if (!send_to_all && (!receiver_ids || !Array.isArray(receiver_ids) || receiver_ids.length === 0)) {
      throw new AppError('请指定接收用户或选择发送给所有人', 400);
    }

    const msgType: MessageType = type || 'other';
    const createdMessages: Message[] = [];

    db.exec('BEGIN TRANSACTION');
    try {
      const insertStmt = db.prepare(
        'INSERT INTO messages (title, content, receiver_id, sender_id, type) VALUES (?, ?, ?, ?, ?)'
      );

      let targetUserIds: number[] = [];

      if (send_to_all) {
        const users = db.prepare("SELECT id FROM users WHERE status = 'active'").all() as { id: number }[];
        targetUserIds = users.map((u) => u.id);
      } else {
        targetUserIds = receiver_ids!;
        const validUsers = db
          .prepare(`SELECT id FROM users WHERE id IN (${targetUserIds.map(() => '?').join(',')})`)
          .all(...targetUserIds) as { id: number }[];
        targetUserIds = validUsers.map((u) => u.id);
      }

      if (targetUserIds.length === 0) {
        throw new AppError('没有有效的接收用户', 400);
      }

      for (const receiverId of targetUserIds) {
        const result = insertStmt.run(
          title.trim(),
          content.trim(),
          receiverId,
          senderId,
          msgType
        );
        const msgId = result.lastInsertRowid as number;
        const message = db
          .prepare('SELECT * FROM messages WHERE id = ?')
          .get(msgId) as unknown as Message;
        const enriched = enrichMessage(db, message);
        createdMessages.push(enriched);
      }

      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    if (send_to_all) {
      createdMessages.forEach((msg) => {
        broadcastMessage(msg);
        sendUnreadCountUpdate(msg.receiver_id, getUnreadCount(db, msg.receiver_id));
      });
    } else {
      const userIds = createdMessages.map((m) => m.receiver_id);
      sendMessageToUsers(userIds, createdMessages[0]);
      createdMessages.forEach((msg) => {
        sendUnreadCountUpdate(msg.receiver_id, getUnreadCount(db, msg.receiver_id));
      });
    }

    const response: ApiResponse<Message[]> = {
      success: true,
      data: createdMessages,
      message: `消息发送成功，共${createdMessages.length}位用户`,
    };

    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
});

router.put('/:id/read', requireAuth, (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const userId = req.userId!;
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      throw new AppError('无效的消息ID', 400);
    }

    const existing = db
      .prepare('SELECT * FROM messages WHERE id = ? AND receiver_id = ?')
      .get(id, userId) as unknown as Message | undefined;

    if (!existing) {
      throw new AppError('消息不存在', 404);
    }

    db.prepare('UPDATE messages SET is_read = 1 WHERE id = ?').run(id);
    const unreadCount = getUnreadCount(db, userId);
    sendUnreadCountUpdate(userId, unreadCount);

    const response: ApiResponse = {
      success: true,
      message: '标记已读成功',
    };

    res.json({
      ...response,
      unread_count: unreadCount,
    });
  } catch (err) {
    next(err);
  }
});

router.put('/read-all', requireAuth, (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const userId = req.userId!;

    db.prepare('UPDATE messages SET is_read = 1 WHERE receiver_id = ? AND is_read = 0').run(userId);
    sendUnreadCountUpdate(userId, 0);

    const response: ApiResponse = {
      success: true,
      message: '全部标记已读成功',
    };

    res.json({
      ...response,
      unread_count: 0,
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const userId = req.userId!;
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      throw new AppError('无效的消息ID', 400);
    }

    const existing = db
      .prepare('SELECT * FROM messages WHERE id = ? AND receiver_id = ?')
      .get(id, userId) as unknown as Message | undefined;

    if (!existing) {
      throw new AppError('消息不存在', 404);
    }

    db.prepare('DELETE FROM messages WHERE id = ?').run(id);
    const unreadCount = getUnreadCount(db, userId);
    sendUnreadCountUpdate(userId, unreadCount);

    const response: ApiResponse = {
      success: true,
      message: '删除成功',
    };

    res.json({
      ...response,
      unread_count: unreadCount,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
