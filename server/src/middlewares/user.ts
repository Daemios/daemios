import { Request, Response, NextFunction } from 'express';
import { validateRegistration } from '../modules/user/user.service';

export const registrationValidator = async (req: Request, res: Response, next: NextFunction) => {
  const validationError = validateRegistration(req.body as any);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }
  next();
};

export const isAuth = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  res.status(401).json({ msg: 'You are not authorized to view this resource' });
};

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user && (req.user as any).admin) return next();
  res.status(401).json({ msg: 'You are not authorized to view this resource' });
};
