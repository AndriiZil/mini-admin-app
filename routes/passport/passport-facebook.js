const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const notify = require('../services/notification-mail-service');
const randomstring = require('randomstring');
const User = require('../../models/user');

const opts = {
  clientID: process.env['FACEBOOK_CLIENT_ID'],
  clientSecret: process.env['FACEBOOK_CLIENT_SECRET'],
  callbackURL: '/auth/facebook/return',
  profileFields: ['id', 'displayName', 'link', 'photos', 'email']
};

passport.use(new FacebookStrategy(opts, async (accessToken, refreshToken, profile, cb) => {
  await User.findOrCreate({ faceBookId: profile.id }, async (err, user) => {
    const token = randomstring.generate();
    user.token = token;
    user.name = profile.displayName;
    user.email = profile.emails[0].value || 'email';

    await notify.sendEmailAfterRegister(user, token);
    return cb(err, user);
  });
}));