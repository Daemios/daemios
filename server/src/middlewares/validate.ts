import { NextFunction, Request, Response } from 'express';
import { Rules, runRules } from '../utils/validators';
import { HttpError } from '../utils/httpError';

export const validate = (rules: Rules) => (req: Request, _res: Response, next: NextFunction) => {
  const errs = runRules(req as any, rules);
  if (errs.length) throw new HttpError(400, errs.join('; '));
  next();
};
