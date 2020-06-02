const router = require('express').Router();
const User = require('../../models/user');
const bcrypt = require('bcryptjs');
const { secret } = require('../../db/config');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const randomstring = require('randomstring');
const notify = require('../services/notification-mail-service');
const appConfigService = require('../services/app-config-service');
const utilityService = require('../services/utility-service');
const SchemaValidatorService = require('../services/schema-validator-service');
const moment = require('moment');

/**
 * @api {post} /api/register Register new User
 * @apiName Register User
 * @apiGroup Auth User
 *
 * @apiVersion 1.0.0
 *
 * @apiParam (Body) {String} name User's name.
 * @apiParam (Body) {String} email User's email.
 * @apiParam (Body) {String} password User's password.
 *
 * @apiParamExample {json} Body:
 *      {
 *        "name": "Nick",
 *        "email": "example@example.com",
 *        "password": "some-password",
 *      }
 *
 * @apiSuccess {String} success indicates the status of procedure.
 * @apiSuccess {String} token indicates which user was created.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "active": false,
 *       "_id": "5d7969d239396c65ca989657",
 *       "name": "5d7969d239396c65ca989657",
 *       "email": "5d7969d239396c65ca989657",
 *       "password": "$2a$10$pPDb/ZiGtRNDBflQfs6yC.rxSIy9basL4daAXDYUSCt38AFdfT3VT5BEitc.",
 *       "date": "2019-09-11T21:40:34.248Z",
 *       "token": "sNGCr2g4cGiA1ZezXo4jlYlIzF5gUVXv",
 *     }
 *
 * @apiErrorExample Email-Exists:
 *     HTTP/1.1 403 Error
 *     {
 *       "success": false,
 *       "message": "Email address is already exists in DB."
 *     }
 */
router.post('/register', async (req,res) => {
  try {
    const schemaValidatorService = new SchemaValidatorService();
    await schemaValidatorService.customSchemaValidation('register', req.body);

    const { name, email, password } = req.body;

    const user = await User.findOne({ email });

    if (user) {
      return res.status(403).json({
        success: false,
        message: 'Email address is already exists in DB.'
      });
    } else {
      utilityService.isEmail(email, 'It is not an email string.', 422);

      const newUser = new User({ name, email, password });

      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hashSync(req.body.password, salt);

      const token = randomstring.generate();
      newUser.password = hash;
      newUser.token = token;

      const user = await newUser.save();
      await notify.sendEmailAfterRegister(user, token);

      res.status(201).json(user);
    }
  } catch (e) {
    utilityService.handleError(res, e);
  }
});

/**
 * @api {post} /api/login Login User
 * @apiName Login User
 * @apiGroup Auth User
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
 * @apiErrorExample No-Account-Found:
 *     HTTP/1.1 404 Error
 *     {
 *       "success": false,
 *       "message": "No account found."
 *     }
 *
 * @apiErrorExample Password-Incorrect:
 *     HTTP/1.1 403 Error
 *     {
 *       "success": false,
 *       "message": "Password is incorrect."
 *     }
 *
 * @apiErrorExample Account-Not-Active:
 *     HTTP/1.1 403 Error
 *     {
 *       "success": false,
 *       "message": "Your account is not active."
 *     }
 */
router.post('/login', async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  try {
    utilityService.isEmail(email, 'It is not an email string.', 422);

    const schemaValidatorService = new SchemaValidatorService();
    await schemaValidatorService.customSchemaValidation('login', req.body);

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'No account found.'
      });
    }

    utilityService.checkUserActivation(user);

    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      const payload = {
        id: user._id,
        email: user.email
      };
      jwt.sign(payload, secret, {expiresIn: 36000}, (err, token) => {
        if (err) res.status(500).json({ error: 'Error signing token', raw: err });
        res.set({ 'Content-Type': 'application/json', 'authorization': token });
        res.json({ token });
      });
    } else {
      res.status(422).json({
        success: false,
        message: 'Password is incorrect.'
      });
    }
  } catch (e) {
    utilityService.handleError(res, e);
  }
});

/**
 * @api {post} /api/confirm-activate?name=Robin&token=JASd1AS4dr7uijsd4TJU Confirm Activate User
 * @apiName Activate User
 * @apiGroup Auth User
 *
 * @apiVersion 1.0.0
 *
 * @apiParam (params) {String} name User's email.
 * @apiParam (params) {String} token User's token for activating account.
 *
 * @apiSuccess {String} success indicates the status of procedure.
 * @apiSuccess {String} token indicates which user was created.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "message": "User activated successfully"
 *     }
 *
 *
 * @apiErrorExample Token-Incorrect:
 *     HTTP/1.1 422 Error
 *     {
 *       "success": false,
 *       "message": "Token is incorrect."
 *     }
 */
router.post('/confirm-activate', async (req, res) => {
  try {
    const token = req.query.token;
    const email = req.query.name;

    const user = await User.findOne({ email });

    if (user.active) {
      return res.status(422).json({
        success: false,
        message: 'User was already activated.'
      })
    }

    const expTokenDate = moment(user.genActivateDate).add(24, 'hours').format();
    const now = new Date().toISOString();

    const isExpired = now > expTokenDate;

    if (token !== user.token) {
      return res.status(422).json({
        success: false,
        message: 'Token is incorrect.'
      })
    }

    if (isExpired) {
      return res.status(422).json({
        success: false,
        message: 'Token was expired.'
      })
    }

    if (!user.active && !isExpired) {
      user.active = true;
      await user.save();
    } else if (!user.active && isExpired) {
      const newToken = randomstring.generate();
      user.genActivateDate = now;
      await user.save();
      await notify.sendEmailAfterRegister(user, newToken);

      return res.status(422).json({
        success: false,
        message: 'Token was expired. See your email and apply new token.'
      })
    }

    res.status(200).json({
      success: true,
      message: 'User activated successfully'
    });
  } catch (e) {
    utilityService.handleError(res, e);
  }
});

/**
 * @api {post} /api/change-password Change User Password
 * @apiName Change User Password
 * @apiGroup Auth User
 *
 * @apiVersion 1.0.0
 *
 * @apiParam (Body) {String} email User's email.
 * @apiParam (Body) {String} password User's password.
 *
 * @apiParamExample {json} Body:
 *      {
 *        "password": "old password",
 *        "newPassword": "new-password",
 *        "newPassword2": "repeat-password",
 *      }
 *
 * @apiSuccess {String} success indicates the status of procedure.
 * @apiSuccess {String} token indicates which user was created.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "message": "User password was changed."
 *     }
 *
 *
 * @apiErrorExample No-Account-Found:
 *     HTTP/1.1 401 Error
 *     {
 *       Unauthorized
 *     }
 *
 * @apiErrorExample Current-Password-Incorrect:
 *     HTTP/1.1 403 Error
 *     {
 *       "success": false,
 *       "message": "Current password is incorrect."
 *     }
 *
 * @apiErrorExample User-Not-Defined:
 *     HTTP/1.1 403 Error
 *     {
 *       "success": false,
 *       "message": "User is not defined."
 *     }
 *
 * @apiErrorExample Account-Not-Active:
 *     HTTP/1.1 400 Error
 *     {
 *       "success": false,
 *       "message": "Your account is not active."
 *     }
 *
 * @apiErrorExample Password-Not-Match:
 *     HTTP/1.1 422 Error
 *     {
 *       "success": false,
 *       "message": "Password should be equal two times."
 *     }
 *
 * @apiErrorExample Password-Not-Match:
 *     HTTP/1.1 422 Error
 *     {
 *       "success": false,
 *       "message": "Password should be different."
 *     }
 */
router.post('/change-password', passport.authenticate('jwt', {session: false}), async (req, res) => {
  const { password, newPassword, newPassword2 } = req.body.password;
  const { name } = await appConfigService.extractUsersInfoFromToken(req);

  try {
    const schemaValidatorService = new SchemaValidatorService();
    await schemaValidatorService.customSchemaValidation('change-password', req.body);

    const user = await User.findOne({ name });
    utilityService.checkUserActivation(user);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User is not defined.'
      });
    }

    if (!user.active) {
      return res.status(400).json({
        success: false,
        message: 'Your account is not active.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(422).json({
        success: false,
        message: 'Current password is incorrect.'
      });
    }

    if (newPassword !== newPassword2) {
      return res.status(422).json({
        success: false,
        message: 'Password should be equal two times.'
      });
    }

    if (password === newPassword2) {
      return res.status(422).json({
        success: false,
        message: 'Password should be different.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hashSync(req.body.newPassword2, salt);

    user.password = hash;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User password was changed.'
    });
  } catch (e) {
    utilityService.handleError(res, e);
  }
});

/**
 * @api {post} /api/recover-password Recover Password
 * @apiName Recover Password
 * @apiGroup Auth User
 *
 * @apiVersion 1.0.0
 *
 * @apiParam (Body) {String} email User's email.
 * @apiParam (Body) {String} password User's password.
 *
 * @apiParamExample {json} Body:
 *      {
 *        "name": "Smith",
 *        "email": "example@gmail.com"
 *      }
 *
 * @apiSuccess {String} success indicates the status of procedure.
 * @apiSuccess {String} token indicates which user was created.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "message": "Confirmation email was sent to your email."
 *     }
 *
 * @apiErrorExample User-Not-Found:
 *     HTTP/1.1 404 Error
 *     {
 *       "success": false,
 *       "message": "User was not found."
 *     }
 *
 * @apiErrorExample User-Not-Defined:
 *     HTTP/1.1 422 Error
 *     {
 *       "success": false,
 *       "message": "Your account is not active."
 *     }
 *
 * @apiErrorExample Information-Incorrect:
 *     HTTP/1.1 422 Error
 *     {
 *       "success": false,
 *       "message": "User name or email is incorrect."
 *     }
 */
router.post('/recover-password', async (req, res) => {
  const { name, email } = req.body;

  try {
    utilityService.isEmail(email, 'It is not an email string.', 422);

    const schemaValidatorService = new SchemaValidatorService();
    await schemaValidatorService.customSchemaValidation('recover-password', req.body);

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User was not found.'
      })
    }

    utilityService.checkUserActivation(user);

    if (!user.active) {
      return res.status(422).json({
        success: false,
        message: 'Your account is not active.'
      });
    }

    if (user.email !== email || name !== user.name) {
      return res.status(422).json({
        success: false,
        message: 'User name or email is incorrect.'
      })
    }

    const token = randomstring.generate();
    user.token = token;

    await Promise.all([user.save(), notify.sendMailAfterRecoverPassword(user, token)]);

    res.status(200).json({
      success: true,
      message: 'Confirmation email was sent to your email.'
    })
  } catch (e) {
    utilityService.handleError(res, e);
  }
});

/**
 * @api {post} /api/confirm-recover-password Confirm Recover Password
 * @apiName Confirm Recover Password
 * @apiGroup Auth User
 *
 * @apiVersion 1.0.0
 *
 * @apiParam (params) {String} email User's name.
 * @apiParam (params) {String} token User's token for recover password.
 *
 * @apiSuccess {String} success indicates the status of procedure.
 * @apiSuccess {String} token indicates which user was created.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "message": "Password was reseted. Please wait for email."
 *     }
 *
 * @apiErrorExample Confirmation-Token-Incorrect:
 *     HTTP/1.1 422 Error
 *     {
 *       "success": false,
 *       "message": "Confirmation token is incorrect."
 *     }
 */
router.post('/confirm-recover-password', async (req, res) => {
  try {
    const { token, email } = req.query;

    const user = await User.findOne({ email });

    utilityService.checkUserActivation(user);

    if (user.token !== token) {
      return res.status(422).json({
        success: false,
        message: 'Confirmation token is incorrect.'
      });
    }

    const resetedPassword = randomstring.generate(10);
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hashSync(resetedPassword, salt);

    user.password = hash;
    user.token = randomstring.generate();
    await Promise.all([user.save(), notify.sendEmailWithResetedPassword(user, resetedPassword)]);

    res.status(200).json({
      success: true,
      message: 'Password was reseted. Please wait for email.'
    });
  } catch (e) {
    utilityService.handleError(res, e);
  }
});

/**
 * @api {post} /api/confirm-delete-account Confirm Delete Account
 * @apiName Confirm Delete Account
 * @apiGroup Auth User
 *
 * @apiVersion 1.0.0
 *
 * @apiSuccess {String} success indicates the status of procedure.
 * @apiSuccess {String} message text status.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "message": "User was deleted successfully."
 *     }
 *
 * @apiErrorExample Token-Incorrect:
 *     HTTP/1.1 422 Error
 *     {
 *       "success": false,
 *       "message": "Token is incorrect."
 *     }
 *
 * @apiErrorExample Expiration-Token:
 *     HTTP/1.1 422 Error
 *     {
 *       "success": false,
 *       "message": "Token was expired."
 *     }
 */
router.post('/confirm-delete-account', async (req, res) => {
  try {
    const { email, token } = req.query;

    const user = await User.findOne({ email });

    const expTokenDate = moment(user.genActivateDate).add(3, 'hours').format();
    const now = new Date().toISOString();
    const isExpired = now > expTokenDate;

    if (user.token !== token) {
      return res.status(422).json({
        success: false,
        message: 'Token is incorrect.'
      });
    }

    if (isExpired) {
      return res.status(422).json({
        success: false,
        message: 'Token was expired.'
      });
    }

    await User.findOneAndDelete({ email });

    res.status(200).json({
      success: true,
      message: 'User was deleted successfully.'
    });
  } catch (e) {
    utilityService.handleError(res, e);
  }
});

/**
 * @api {post} /api/logout Logout
 * @apiName Logout User
 * @apiGroup Auth User
 *
 * @apiVersion 1.0.0
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 */
router.get('/logout', (req, res) => {
  req.logout();
  res.send(null)
});

module.exports = router;
