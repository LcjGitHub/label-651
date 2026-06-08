import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import usersRouter from './routes/users';
import rolesRouter from './routes/roles';
import permissionsRouter from './routes/permissions';
import authRouter from './routes/auth';
import operationLogsRouter from './routes/operationLogs';
import messagesRouter from './routes/messages';
import { errorHandler, notFound } from './middleware/errorHandler';
import { globalOperationLogMiddleware } from './middleware/globalOperationLog';
import { initDatabase, getConnectionStats, getSlowQueryLogs, getConnectionDetails } from './database';
import { exportsDir, avatarsDir } from './middleware/upload';
import { initWebSocket } from './services/wsService';

const app = express();
const PORT = process.env.PORT || 8089;
const server = createServer(app);

app.use(
  cors({
    origin: (origin, callback) => {
      const isLocal =
        !origin ||
        origin.startsWith('http://localhost') ||
        origin.startsWith('http://127.0.0.1') ||
        origin.startsWith('http://[::1]');
      callback(null, isLocal);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));

app.use('/api/exports', express.static(exportsDir));
app.use('/api/avatars', express.static(avatarsDir));

app.use(globalOperationLogMiddleware());

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '用户管理系统 API 运行正常',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/db/stats', (req, res) => {
  try {
    const stats = getConnectionStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : '获取数据库统计信息失败',
    });
  }
});

app.get('/api/db/slow-queries', (req, res) => {
  try {
    const limitParam = parseInt(req.query.limit as string);
    const limit = isNaN(limitParam) ? 100 : Math.min(Math.max(limitParam, 1), 500);
    const logs = getSlowQueryLogs(limit);
    res.json({
      success: true,
      data: logs,
      total: logs.length,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : '获取慢查询日志失败',
    });
  }
});

app.get('/api/db/connections', (req, res) => {
  try {
    const details = getConnectionDetails();
    res.json({
      success: true,
      data: details,
      total: details.length,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : '获取连接详情失败',
    });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/roles', rolesRouter);
app.use('/api/permissions', permissionsRouter);
app.use('/api/operation-logs', operationLogsRouter);
app.use('/api/messages', messagesRouter);

app.use(notFound);
app.use(errorHandler);

const startServer = () => {
  try {
    initDatabase();
    initWebSocket(server);
    server.listen(PORT, () => {
      console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
      console.log(`📚 API 文档: GET /api/health`);
      console.log(`👥 用户接口: GET /api/users`);
      console.log(`🎭 角色接口: GET /api/roles`);
      console.log(`🔐 权限接口: GET /api/permissions`);
      console.log(`💬 消息接口: GET /api/messages`);
      console.log(`🔌 WebSocket: ws://localhost:${PORT}/ws`);
    });
  } catch (err) {
    console.error('启动服务器失败:', err);
    process.exit(1);
  }
};

startServer();

export default app;
