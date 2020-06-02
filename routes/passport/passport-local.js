const { Strategy, ExtractJwt } = require('passport-jwt');
const passport = require('passport');
const { secret } = require('../../db/config');
const User = require('../../models/user');

passport.use(new Strategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey : secret
  }, (jwtPayload, cb) => {
    return User.findById(jwtPayload.id)
      .then(user => {
        return cb(null, user);
      })
      .catch(err => {
        return cb(err);
      });
  }
));