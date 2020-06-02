const GoogleStrategy = require('passport-google-oauth20').Strategy;
const notify = require('../services/notification-mail-service');
const randomstring = require('randomstring');
const passport = require('passport');
const User = require('../../models/user');

const opts = {
  clientID: process.env['GOOGLE_CLIENT_ID'],
  clientSecret: process.env['GOOGLE_CLIENT_SECRET'],
  callbackURL: '/auth/google/callback'
};

passport.use(new GoogleStrategy(opts, async (accessToken, refreshToken, profile, cb) => {
    await User.findOrCreate({ googleId: profile.id }, async (err, user) => {
      const token = randomstring.generate();
      user.token = token;
      user.name = profile.displayName;
      user.email = profile.emails[0].value || 'email';

      await notify.sendEmailAfterRegister(user, token);
      return cb(err, user);
    });
  }
));