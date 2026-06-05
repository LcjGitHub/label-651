import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';

export class AppError extends Error {
  statusCode: number;
  success: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.success = false;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  if (err instanceof AppError) {
    const response: ApiResponse = {
      success: false,
      message: err.message,
    };
    return res.status(err.statusCode).json(response);
  }

  if (err.message.includes('UNIQUE constraint failed')) {
    const response: ApiResponse = {
      success: false,
      message: '邮箱已存在，请使用其他邮箱',
    };
    return res.status(400).json(response);
  }

  const response: ApiResponse = {
    success: false,
    message: '服务器内部错误',
  };
  res.status(500).json(response);
};

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`无法找到 ${req.originalUrl} 路由`, 404));
};
