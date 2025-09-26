import passport from 'passport';
import express, { Request, Response } from 'express';
import { registrationValidator } from '../middlewares/user';
import { userService } from '../modules/user/user.service';

const router = express.Router();

router.post('/login', passport.authenticate('local'), (req: Request, res: Response) => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - passport augments req.user at runtime
  if (req.user) {
    // @ts-ignore
    res.send({
      success: true,
      // @ts-ignore
      displayName: req.user.displayName,
    });
  } else {
    res.status(401).send({ success: false });
  }
});

// Register user route
router.post('/register', registrationValidator, async (req: Request, res: Response) => {
  console.log('registering user');
  try {
  const { email, password, displayName } = req.body as any;
  const newUser = await userService.createUser(email, password, displayName);

    res.status(200).json({
      success: 'User created',
      user: newUser,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

