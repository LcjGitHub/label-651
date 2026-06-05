import express from 'express';
import cors from 'cors';
import usersRouter from './routes/users';
import { errorHandler, notFound } from './middleware/errorHandler';
import './database';

const app = express();
const PORT = process.env.PORT || 8089;

app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5176', 'http://127.0.0.1:5176'],
    credentials: true,
  })
);

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '用户管理系统 API 运行正常',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/users', usersRouter);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  console.log(`📚 API 文档: GET /api/health`);
  console.log(`👥 用户接口: GET /api/users`);
});

export default app;
