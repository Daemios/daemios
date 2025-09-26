import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import { userRepository } from './modules/user/user.repository';

// Keep the initialize function similar to the original JS implementation.
export default function initializePassport(passport: any) {
  const authenticateUser = async (email: string, password: string, done: any) => {
    try {
      const user = await userRepository.findByEmail(email);
      if (!user) {
        // mirror original behavior: return generic message
        return done(null, false, { message: 'Incorrect email or password' });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return done(null, false, { message: 'Incorrect email or password' });
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  };

  passport.use(new LocalStrategy({ usernameField: 'email' }, authenticateUser));

  // The original app serialized the whole user into session. Keep that behavior
  // to avoid changing how other code expects `req.session.passport.user` to look.
  passport.serializeUser((user: any, done: any) => done(null, user));

  passport.deserializeUser(async (user: any, done: any) => {
    try {
      const found = await userRepository.findById(user.id);
      done(null, found);
    } catch (err) {
      done(err, null);
    }
  });
}

