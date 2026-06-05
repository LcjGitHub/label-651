import express from 'express';
import cors from 'cors';
import usersRouter from './routes/users';
import rolesRouter from './routes/roles';
import permissionsRouter from './routes/permissions';
import { errorHandler, notFound } from './middleware/errorHandler';
import { initDatabase } from './database';

const app = express();
const PORT = process.env.PORT || 8089;

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

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '用户管理系统 API 运行正常',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/users', usersRouter);
app.use('/api/roles', rolesRouter);
app.use('/api/permissions', permissionsRouter);

app.use(notFound);
app.use(errorHandler);

const startServer = () => {
  try {
    initDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
      console.log(`📚 API 文档: GET /api/health`);
      console.log(`👥 用户接口: GET /api/users`);
      console.log(`🎭 角色接口: GET /api/roles`);
      console.log(`🔐 权限接口: GET /api/permissions`);
    });
  } catch (err) {
    console.error('启动服务器失败:', err);
    process.exit(1);
  }
};

startServer();

export default app;
