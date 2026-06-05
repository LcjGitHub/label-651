import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { Message } from '../types';

interface ClientMap {
  [userId: number]: WebSocket[];
}

const clients: ClientMap = {};

const getUserIdFromUrl = (url: string): number | null => {
  try {
    const urlObj = new URL(url, 'http://localhost');
    const userId = urlObj.searchParams.get('userId');
    if (userId) {
      const id = parseInt(userId);
      return isNaN(id) ? null : id;
    }
  } catch {
    return null;
  }
  return null;
};

export const initWebSocket = (server: Server): WebSocketServer => {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req) => {
    const userId = getUserIdFromUrl(req.url || '');

    if (!userId) {
      ws.close(4001, 'Invalid user ID');
      return;
    }

    if (!clients[userId]) {
      clients[userId] = [];
    }
    clients[userId].push(ws);

    console.log(`[WS] 用户 ${userId} 已连接，当前连接数: ${clients[userId].length}`);

    ws.on('close', () => {
      if (clients[userId]) {
        clients[userId] = clients[userId].filter((c) => c !== ws);
        if (clients[userId].length === 0) {
          delete clients[userId];
        }
      }
      console.log(`[WS] 用户 ${userId} 已断开连接`);
    });

    ws.on('error', (err) => {
      console.error(`[WS] 用户 ${userId} 连接错误:`, err);
    });

    ws.send(
      JSON.stringify({
        type: 'connected',
        data: { userId },
        timestamp: new Date().toISOString(),
      })
    );
  });

  console.log('✅ WebSocket 服务已启动，路径: /ws');
  return wss;
};

export const sendMessageToUser = (userId: number, message: Message): void => {
  const userClients = clients[userId];
  if (!userClients || userClients.length === 0) {
    console.log(`[WS] 用户 ${userId} 不在线，消息将在下次登录时显示`);
    return;
  }

  const payload = JSON.stringify({
    type: 'new_message',
    data: message,
    timestamp: new Date().toISOString(),
  });

  userClients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });

  console.log(`[WS] 已向用户 ${userId} 推送新消息: ${message.title}`);
};

export const sendMessageToUsers = (userIds: number[], message: Message): void => {
  userIds.forEach((userId) => {
    sendMessageToUser(userId, message);
  });
};

export const broadcastMessage = (message: Message): void => {
  Object.keys(clients).forEach((userIdStr) => {
    const userId = parseInt(userIdStr);
    sendMessageToUser(userId, message);
  });
};

export const sendUnreadCountUpdate = (userId: number, unreadCount: number): void => {
  const userClients = clients[userId];
  if (!userClients || userClients.length === 0) {
    return;
  }

  const payload = JSON.stringify({
    type: 'unread_count_update',
    data: { unreadCount },
    timestamp: new Date().toISOString(),
  });

  userClients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });
};
