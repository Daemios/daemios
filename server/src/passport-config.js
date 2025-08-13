import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import { getUser } from './lib/user.js';

function init(passport) {
  const authenticateUser = async (email, password, done) => {
    try {
      const user = await getUser({ email });
      if (!user) {
        console.log('no user found');
        return done(null, false, { message: 'Incorrect email or password' });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      console.log('isMatch', isMatch);
      if (!isMatch) {
        return done(null, false, { message: 'Incorrect email or password' });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  };

  passport.use(new LocalStrategy({ usernameField: 'email' }, authenticateUser));

  passport.serializeUser((user, done) => done(null, user));

  passport.deserializeUser(async (user, done) => {
    try {
      const foundUser = await getUser({ id: user.id });
      done(null, foundUser);
    } catch (err) {
      done(err, null);
    }
  });
}

export default init;
