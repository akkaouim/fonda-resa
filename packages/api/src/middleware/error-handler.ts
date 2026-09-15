import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger.js';
import { multerErrorMessage } from '../shared/uploads.js';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // Multer throws before the route handler runs, so without this branch every
  // rejected upload fell through to the generic 500 below.
  if (err.name === 'MulterError') {
    const code = (err as { code?: string }).code ?? 'UPLOAD_ERROR';
    res.status(400).json({
      success: false,
      error: { code, message: multerErrorMessage(code) },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Donnees invalides',
        details: err.flatten().fieldErrors,
      },
    });
    return;
  }

  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Une erreur interne est survenue',
    },
  });
}
