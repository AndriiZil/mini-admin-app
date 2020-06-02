const router = require('express').Router();
// const connectEnsueLogIn = require('connect-ensure-login');
const passport = require('passport');

/**
 * @api {get} /api/auth/facebook Face Book Login
 * @apiName Face Book Login
 * @apiGroup User
 *
 * @apiVersion 1.0.0
 *
 * @apiParam (Body) {String} email User's email.
 * @apiParam (Body) {String} password User's password.
 *
 * @apiParamExample {json} Body:
 *      {
 *        "email": "example@example.com",
 *        "password": "some-password",
 *      }
 *
 * @apiSuccess {String} success indicates the status of procedure.
 * @apiSuccess {String} token indicates which user was created.
 *
 */
router.get('/auth/facebook', passport.authenticate('facebook'));

router.get('/auth/facebook/return', passport.authenticate('facebook', { failureRedirect: '/login' }), (req, res) => {
  res.redirect('/profile');
});

// router.get('/profile', connectEnsueLogIn.ensureLoggedIn(), (req, res) => {
//   res.render('profile', { user: req.user });
// });

/**
 * @api {get} /api/auth/facebook Google Login
 * @apiName Google Login
 * @apiGroup User
 *
 * @apiVersion 1.0.0
 *
 * @apiParam (Body) {String} email User's email.
 * @apiParam (Body) {String} password User's password.
 *
 * @apiParamExample {json} Body:
 *      {
 *        "email": "example@example.com",
 *        "password": "some-password",
 *      }
 *
 * @apiSuccess {String} success indicates the status of procedure.
 * @apiSuccess {String} token indicates which user was created.
 *
 */
router.get('/auth/google', passport.authenticate('google', { scope: ['profile'] }));

router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
  res.redirect('/');
});

module.exports = router;
