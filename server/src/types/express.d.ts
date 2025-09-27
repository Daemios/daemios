import express from 'express';

declare global {
  namespace Express {
    // A minimal typing for `req.user`. Adjust the shape as your Passport deserializer sets it.
    interface User {
      id?: string | number;
      // add other commonly used fields if desired, e.g. username, email
      [key: string]: any;
    }

    interface Request {
      user?: User | null;
    }
  }
}

export {};
