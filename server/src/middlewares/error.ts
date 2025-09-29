import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { HttpError } from '../utils/httpError';
import { respondError } from '../utils/apiResponse';

export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return respondError(res, 409, 'unique_constraint_failed', 'Unique constraint failed');
    }
    return respondError(res, 400, 'database_error', 'Database error');
  }
  if (err instanceof HttpError) {
    return respondError(res, err.status, 'http_error', err.message);
  }
  console.error(err);
  return respondError(res, 500, 'internal_error', 'Internal server error');
}
