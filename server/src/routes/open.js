import passport from 'passport';
import express from 'express';
import { registrationValidator } from '../middleware/user.js';
import { createUser, hashPassword } from '../lib/user.js';

const router = express.Router();

router.post('/login', passport.authenticate('local'), (req, res) => {
  if (req.user) {
    res.send({
      success: true,
      displayName: req.user.displayName,
    });
  }
});

// Register user route
router.post('/register', registrationValidator, async (req, res) => {
  console.log('registering user');
  try {
    const { email, password, displayName } = req.body;
    const hashedPassword = await hashPassword(password);
    const newUser = await createUser({ email, password: hashedPassword, displayName });

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
