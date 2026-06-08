import express from 'express';
import cors from 'cors';
import usersRouter from '../src/routes/users';
import { errorHandler, notFound } from '../src/middleware/errorHandler';
import { exportsDir, avatarsDir } from '../src/middleware/upload';

const createTestApp = () => {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  app.use('/api/exports', express.static(exportsDir));
  app.use('/api/avatars', express.static(avatarsDir));

  app.use('/api/users', usersRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
};

export default createTestApp;
