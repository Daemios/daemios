import { validateRegistration } from '../lib/user.js';

export const registrationValidator = async (req, res, next) => {
  const validationError = validateRegistration(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }
  next();
};

export const isAuth = (req, res, next) => {
  console.log('attempting to authenticate');
  if (req.isAuthenticated()) {
    return next();
  }

  res.status(401).json({
    msg: 'You are not authorized to view this resource',
  });
};

export const isAdmin = (req, res, next) => {
  if (req.user && req.user.admin) {
    return next();
  }

  res.status(401).json({
    msg: 'You are not authorized to view this resource',
  });
};
