import express from 'express';
import request from 'supertest';
import passport from 'passport';
import { afterEach, describe, expect, it, vi } from 'vitest';

import openRouter from './open';

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    Object.assign(req, {
      logIn: (_user: unknown, done: (err?: unknown) => void) => done(),
    });
    next();
  });
  app.use('/open', openRouter);
  return app;
};

describe('POST /open/login', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns standardized error envelope when authentication fails', async () => {
    const app = buildApp();
    const authenticateMock = vi
      .spyOn(passport, 'authenticate')
      .mockImplementation((_strategy, callback) => () => {
        if (typeof callback === 'function') {
          callback(null, false, { message: 'Invalid credentials' });
        }
      });

    const response = await request(app).post('/open/login').send({ email: 'user@example.com', password: 'wrong' });

    expect(authenticateMock).toHaveBeenCalled();
    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'unauthorized',
        message: 'Invalid credentials',
      },
    });
  });

  it('returns standardized success envelope when authentication succeeds', async () => {
    const app = buildApp();
    const user = { displayName: 'Tester' } as any;
    const authenticateMock = vi
      .spyOn(passport, 'authenticate')
      .mockImplementation((_strategy, callback) => () => {
        if (typeof callback === 'function') {
          callback(null, user, undefined);
        }
      });

    const response = await request(app).post('/open/login').send({ email: 'user@example.com', password: 'correct' });

    expect(authenticateMock).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: { displayName: 'Tester' },
      message: 'Login successful',
    });
  });
});
