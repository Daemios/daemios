import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { isAuth } from './user';

describe('isAuth middleware', () => {
  it('denies unauthenticated requests with standardized envelope', async () => {
    const app = express();
    app.get('/protected', (req, res, next) => {
      Object.assign(req, {
        isAuthenticated: () => false,
      });
      next();
    }, isAuth);

    const response = await request(app).get('/protected');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'unauthorized',
        message: 'You are not authorized to view this resource',
      },
    });
  });

  it('allows authenticated requests to proceed', async () => {
    const app = express();
    app.get('/protected', (req, res, next) => {
      Object.assign(req, {
        isAuthenticated: () => true,
      });
      next();
    }, isAuth, (_req, res) => {
      res.status(204).end();
    });

    const response = await request(app).get('/protected');

    expect(response.status).toBe(204);
  });
});
