import { validateRegistration } from '../lib/user';
export const registrationValidator = async (req, res, next) => {
    const validationError = validateRegistration(req.body);
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }
    next();
};
export const isAuth = (req, res, next) => {
    // passport attaches isAuthenticated to the request in runtime
    // keep behavior consistent with legacy code
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (req.isAuthenticated && req.isAuthenticated())
        return next();
    res.status(401).json({ msg: 'You are not authorized to view this resource' });
};
export const isAdmin = (req, res, next) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (req.user && req.user.admin)
        return next();
    res.status(401).json({ msg: 'You are not authorized to view this resource' });
};
