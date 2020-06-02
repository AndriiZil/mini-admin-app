const router = require('express').Router();
const User = require('../../models/user');
const appConfigService = require('../services/app-config-service');
const utilityService = require('../services/utility-service');
const notify = require('../services/notification-mail-service');
const randomstring = require('randomstring');

/**
 * @api {get} /api/profile Get User's Profile
 * @apiName Get User's Profile
 * @apiGroup Profile
 *
 * @apiVersion 1.0.0
 *
 * @apiSuccess {String} token user's token.
 * @apiSuccess {Boolean} active user's active status.
 * @apiSuccess {Number/null} googleId google's account id.
 * @apiSuccess {Number/null} faceBookId facebook's account id.
 * @apiSuccess {String} _id user's id.
 * @apiSuccess {String} name user's name.
 * @apiSuccess {String} email user's email.
 * @apiSuccess {String} password user's password.
 * @apiSuccess {String} date date of creatin account.
 *
 * @apiSuccessExample Success-Response:
 *     {
 *        "token": "hWL6eQRisuu0H8tnYqmewLl8kPDLFUYG",
 *        "active": true,
 *        "googleId": null,
 *        "faceBookId": null,
 *        "_id": "5d7969d239396c65ca989657",
 *        "name": "Josh",
 *        "email": "andrii.zilnyk@gmail.com",
 *        "password": "$2a$10$pPDb/ZiGtRNDBflQfs6yC.rxSIy9bXDYUSCt38AFdfT3VT5BEitc.",
 *        "genActivateDate": "2019-10-28T09:05:08.390Z",
 *        "favourites": [
 *           {
                "createdAt": "2019-10-29T15:13:05.073Z",
                "_id": "5db6b263d66ca030c2b99b31",
                "email": "example@test.com",
                "context": "Some text data"
             }
 *        ]
 *        "createdDate": "2019-09-11T21:40:34.248Z",
 *        "__v": 0
 *     }
 *
 * @apiErrorExample Token not valid or not provided:
 *     HTTP/1.1 500 Error
 *     {
 *       "message": "Token was not provided."
 *     }
 *
 */
router.get('/profile', async (req, res) => {
  try {
    const { email } = await appConfigService.extractUsersInfoFromToken(req);
    const user = await User.findOne({ email });
    utilityService.checkUserActivation(user);

    res.status(200).json(user);
  } catch (e) {
    utilityService.handleError(res, e);
  }
});

/**
 * @api {post} /api/favourites Add data to favourites
 * @apiName Add data to favourites
 * @apiGroup Profile
 *
 * @apiVersion 1.0.0
 *
 * @apiParam (params) {String} email User's email which you want to add.
 * @apiParam (params) {String} context User's context favourites notes.
 *
 * @apiSuccess {Boolean} success status.
 * @apiSuccess {String} message user's active status.
 *
 * @apiSuccessExample Success-Response:
 *     {
 *        "success": true,
 *        "message": "Contact added to favourites",
 *     }
 *
 * @apiErrorExample Already in your list:
 *     HTTP/1.1 422 Error
 *     {
 *       "success": false,
 *       "message": "Such contact is already in your list"
 *     }
 *
 * @apiErrorExample Token not valid or not provided:
 *     HTTP/1.1 500 Error
 *     {
 *       "message": "Token was not provided."
 *     }
 */
router.post('/favourites', async (req, res) => {
  try {
    const email = req.body.email;
    const context = req.body.context;

    const userInfo = await appConfigService.extractUsersInfoFromToken(req);
    const user = await User.findOne({ email: userInfo.email });

    utilityService.checkUserActivation(user);

    const contact = user.favourites.find(contact => contact.email === email);

    if (!contact) {
      user.favourites.push({ email, context });
      await user.save();
    } else {
      return res.status(422).json({
        success: false,
        message: 'Such contact is already in your list'
      })
    }

    res.status(201).json({
      success: true,
      message: 'Contact added to favourites'
    })
  } catch (e) {
    utilityService.handleError(res, e);
  }
});

/**
 * @api {delete} /api/favourites/:id Delete contact from favourites
 * @apiName Delete contact from favourites
 * @apiGroup Profile
 *
 * @apiVersion 1.0.0
 *
 * @apiParam {String} id Contact ID.
 *
 * @apiSuccessExample Success-Response:
 *     {
 *        "success": true,
 *        "message": "Contact was deleted from favourites",
 *     }
 *
 * @apiErrorExample Contact Not Found:
 *     HTTP/1.1 404 Error
 *     {
 *       "success": false,
 *       "message": "Contact with such id was not found in list"
 *     }
 *
 * @apiErrorExample Token not valid or not provided:
 *     HTTP/1.1 500 Error
 *     {
 *       "message": "Token was not provided."
 *     }
 */
router.delete('/favourites/:id', async (req, res) => {
  try {
    const contactId = req.params.id;
    const userInfo = await appConfigService.extractUsersInfoFromToken(req);
    const user = await User.findOne({ email: userInfo.email });

    utilityService.checkUserActivation(user);

    const contactsIds = user.favourites.map(contact => contact._id);

    if (contactsIds.includes(contactId)) {
      await user.favourites.id(contactId).remove();
      await user.save();
    } else {
      return res.status(404).json({
        success: false,
        message: 'Contact with such id was not found in list'
      })
    }

    res.status(200).json({
      success: true,
      message: 'Contact was deleted from favourites'
    })
  } catch (e) {
    utilityService.handleError(res, e);
  }
});

/**
 * @api {post} /api/delete-account Delete account
 * @apiName Delete account
 * @apiGroup Profile
 *
 * @apiVersion 1.0.0
 *
 * @apiSuccessExample Success-Response:
 *     {
 *        "success": true,
 *        "message": "Check your email address for confirmation.",
 *     }
 *
 * @apiErrorExample Token not valid or not provided:
 *     HTTP/1.1 500 Error
 *     {
 *       "message": "Token was not provided."
 *     }
 */
router.post('/delete-account', async (req, res) => {
  try {
    const { email } = await appConfigService.extractUsersInfoFromToken(req);
    const user = await User.findOne({ email });

    utilityService.checkUserActivation(user);

    const now = new Date().toISOString();
    user.genActivateDate = now;
    const token = randomstring.generate();
    user.token = token;

    await Promise.all([user.save(), notify.sendEmailAfterDeleteAccount(user, token)]);

    res.status(200).json({
      success: true,
      message: 'Check your email address for confirmation.'
    })
  } catch (e) {
    utilityService.handleError(res, e);
  }
});

module.exports = router;
