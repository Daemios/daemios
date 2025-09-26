import { Request, Response } from 'express';
import { userService } from './user.service';
import { DomainError } from './user.domain';

export const userController = {
  create: async (req: Request, res: Response) => {
    const { email, password, displayName } = req.body;
    // Transport-level basic checks
    if (typeof email !== 'string' || typeof password !== 'string' || typeof displayName !== 'string') {
      return res.status(422).json({ error: 'invalid_payload' });
    }

    try {
      const user = await userService.createUser(email, password, displayName);
      res.status(201).json(user);
    } catch (e: any) {
      console.error(e);
      if (e instanceof DomainError) {
        if (e.code === 'INVALID_EMAIL' || e.code === 'NAME_TOO_SHORT' || e.code === 'PASSWORD_REQUIRED') return res.status(422).json({ error: 'invalid_payload' });
        if (e.code === 'EMAIL_IN_USE') return res.status(409).json({ error: 'email_in_use' });
      }
      res.status(500).json({ error: 'unexpected' });
    }
  },
  getOne: async (req: Request, res: Response) => {
    const { id } = req.params;
    const idNum = Number(id);
    if (!Number.isInteger(idNum) || idNum <= 0) return res.status(400).json({ error: 'invalid_id' });
    const user = await userService.getUser(idNum);
    if (!user) return res.status(404).json({ error: 'not_found' });
    res.json(user);
  },
};
