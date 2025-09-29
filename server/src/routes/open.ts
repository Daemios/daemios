import passport from 'passport';
import express, { NextFunction, Request, Response } from 'express';
import { registrationValidator } from '../middlewares/user';
import { userService } from '../modules/user/user.service';
import { respondError, respondSuccess } from '../utils/apiResponse';

const router = express.Router();

router.post('/login', (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('local', (err: unknown, user: Express.User | false, info?: { message?: string }) => {
    if (err) return next(err);

    if (!user) {
      const message = info?.message ?? 'Invalid credentials';
      return respondError(res, 401, 'unauthorized', message);
    }

    req.logIn(user, (loginErr) => {
      if (loginErr) return next(loginErr);

      const { displayName } = user as { displayName: string };
      return respondSuccess(res, 200, { displayName }, 'Login successful');
    });

    return undefined;
  })(req, res, next);
});

// Register user route
router.post('/register', registrationValidator, async (req: Request, res: Response) => {
  console.log('registering user');
  try {
    const { email, password, displayName } = req.body as any;
    const newUser = await userService.createUser(email, password, displayName);

    respondSuccess(res, 201, { user: newUser }, 'User created');
  } catch (err) {
    console.error(err);
    respondError(res, 500, 'internal_error', 'Internal server error');
  }
});

export default router;
