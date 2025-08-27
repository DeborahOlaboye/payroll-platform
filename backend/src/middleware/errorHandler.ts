import { Request, Response, NextFunction } from 'express';
import { PayrollError, createErrorResponse } from '@usdc-payroll/shared';
import { logger } from '../config/logger';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    body: req.body
  });

  if (error instanceof PayrollError) {
    res.status(error.statusCode).json(createErrorResponse(
      error.message,
      error.code,
      error.statusCode
    ));
    return;
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    res.status(400).json(createErrorResponse(
      'Validation failed',
      'VALIDATION_ERROR',
      400
    ));
    return;
  }

  // Handle Prisma errors
  if (error.name === 'PrismaClientKnownRequestError') {
    res.status(400).json(createErrorResponse(
      'Database operation failed',
      'DATABASE_ERROR',
      400
    ));
    return;
  }

  // Handle multer errors
  if (error.name === 'MulterError') {
    res.status(400).json(createErrorResponse(
      error.message,
      'FILE_UPLOAD_ERROR',
      400
    ));
    return;
  }

  // Default error response
  res.status(500).json(createErrorResponse(
    'Internal server error',
    'INTERNAL_ERROR',
    500
  ));
}
