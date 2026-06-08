import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
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

  if (err instanceof multer.MulterError) {
    let message = '文件上传失败';
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = '文件大小超出限制，最大允许 2MB';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = '上传的文件字段名不正确';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = '上传文件数量超出限制';
    } else if (err.code === 'LIMIT_FIELD_VALUE') {
      message = '表单字段值超出大小限制';
    } else if (err.code === 'LIMIT_FIELD_COUNT') {
      message = '表单字段数量超出限制';
    } else if (err.code === 'LIMIT_PART_COUNT') {
      message = '表单数据部分数量超出限制';
    } else if (err.code === 'LIMIT_NO_FILES') {
      message = '未检测到上传的文件';
    } else if (err.code === 'LIMIT_INVALID_TYPE') {
      message = '文件格式不支持';
    }
    const response: ApiResponse = {
      success: false,
      message,
    };
    return res.status(400).json(response);
  }

  if (err.message.includes('只允许上传')) {
    const response: ApiResponse = {
      success: false,
      message: err.message,
    };
    return res.status(400).json(response);
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
