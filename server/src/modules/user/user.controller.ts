import { Request, Response } from 'express';
import { userService } from './user.service';
import { DomainError } from './user.domain';
import { respondError, respondSuccess } from '../../utils/apiResponse';

export const userController = {
  create: async (req: Request, res: Response) => {
    const { email, password, displayName } = req.body;
    // Transport-level basic checks
    if (typeof email !== 'string' || typeof password !== 'string' || typeof displayName !== 'string') {
      return respondError(res, 422, 'invalid_payload', 'Invalid registration payload');
    }

    try {
      const user = await userService.createUser(email, password, displayName);
      respondSuccess(res, 201, { user }, 'User created');
    } catch (e: any) {
      console.error(e);
      if (e instanceof DomainError) {
        if (e.code === 'INVALID_EMAIL' || e.code === 'NAME_TOO_SHORT' || e.code === 'PASSWORD_REQUIRED') {
          return respondError(res, 422, 'invalid_payload', e.message);
        }
        if (e.code === 'EMAIL_IN_USE') {
          return respondError(res, 409, 'email_in_use', e.message);
        }
      }
      respondError(res, 500, 'unexpected', 'Unexpected error');
    }
  },
  getOne: async (req: Request, res: Response) => {
    const { id } = req.params;
    const idNum = Number(id);
    if (!Number.isInteger(idNum) || idNum <= 0) {
      return respondError(res, 400, 'invalid_id', 'Invalid user id');
    }
    const user = await userService.getUser(idNum);
    if (!user) return respondError(res, 404, 'not_found', 'User not found');
    respondSuccess(res, 200, { user });
  },
};
