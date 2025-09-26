import passport from 'passport';
import { Router } from 'express';
import { registrationValidator } from '../middlewares/user';
import { userService } from '../modules/user/user.service';
const router = Router();
router.post('/login', passport.authenticate('local'), (req, res) => {
    if (req.user) {
        res.send({ success: true, displayName: req.user.displayName });
        return;
    }
    res.status(401).send({ success: false });
});
router.post('/register', registrationValidator, async (req, res) => {
    try {
        const { email, password, displayName } = req.body;
        const user = await userService.createUser(email, password, displayName);
        res.status(200).json({ success: 'User created', user });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
export default router;
