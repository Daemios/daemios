import { Prisma } from '@prisma/client';
import type { Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { errorMiddleware } from './error';
import { HttpError } from '../utils/httpError';

type MockResponse = Pick<Response, 'status' | 'json'> & {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
};

const createMockResponse = (): MockResponse => {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnThis();
  res.json = vi.fn().mockReturnThis();
  return res as MockResponse;
};

describe('errorMiddleware', () => {
  it('formats HttpError instances into standardized responses', () => {
    const res = createMockResponse();

    errorMiddleware(new HttpError(418, 'Short and stout'), {} as any, res as Response, vi.fn());

    expect(res.status).toHaveBeenCalledWith(418);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'http_error',
        message: 'Short and stout',
      },
    });
  });

  it('maps Prisma unique constraint errors to conflict responses', () => {
    const res = createMockResponse();
    const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
      code: 'P2002',
      clientVersion: '5.0.0',
    });

    errorMiddleware(prismaError, {} as any, res as Response, vi.fn());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'unique_constraint_failed',
        message: 'Unique constraint failed',
      },
    });
  });

  it('falls back to internal error envelope for unexpected errors', () => {
    const res = createMockResponse();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    errorMiddleware(new Error('boom'), {} as any, res as Response, vi.fn());

    expect(consoleSpy).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'internal_error',
        message: 'Internal server error',
      },
    });

    consoleSpy.mockRestore();
  });
});
