import request from 'supertest';
import session from 'express-session';
import type { NextFunction, Request, Response } from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./middlewares/user', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./middlewares/user')>();
  return {
    ...actual,
    isAuth: (_req: Request, _res: Response, next: NextFunction) => next(),
  };
});

vi.mock('@quixo3/prisma-session-store', () => {
  const MemoryStore = session.MemoryStore;
  return {
    PrismaSessionStore: class extends MemoryStore {
      constructor(...args: any[]) {
        super(...args);
      }
    },
  };
});

import app from './app';

describe('app standardized responses', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a success envelope for the health check', async () => {
    const response = await request(app).get('/_health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: { ok: true },
      message: 'Healthy',
    });
  });

  it('returns standardized error envelope for unknown routes', async () => {
    const response = await request(app).get('/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'not_found',
        message: 'Route not found: GET /does-not-exist',
      },
    });
  });
});
