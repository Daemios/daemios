import { Request, Response, NextFunction } from 'express';
import { validateRegistration } from '../modules/user/user.service';
import { respondError } from '../utils/apiResponse';

export const registrationValidator = async (req: Request, res: Response, next: NextFunction) => {
  const validationError = validateRegistration(req.body as any);
  if (validationError) {
    return respondError(res, 400, 'invalid_payload', validationError);
  }
  next();
};

export const isAuth = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  respondError(res, 401, 'unauthorized', 'You are not authorized to view this resource');
};

