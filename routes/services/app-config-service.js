const jwtDecode = require('jwt-decode');
const jwt = require('jsonwebtoken');
const { secret } = require('../../db/config');

class AppConfigService {

  async extractUsersInfoFromToken(req) {
    if (!req.headers.authorization) {
      const error = new Error('User must be authorized');
      error.code = 403;
      throw error;
    }
    const token = req.headers.authorization;
    const userInfo = await jwtDecode(token);

    return userInfo;
  }

  getTokenFromRequest(req) {
    if (req.headers && req.headers.authorization || req.headers.authorization) {
      return req.headers.authorization || req.headers.authorization;
    }
    throw new Error('Token was not provided.');
  }

  /**
   * Check token{object}
   * @param {object} req
   * @param {object} res
   * @param {object} next
   * @returns {*}
   */
  checkToken(req, res, next) {
    const token = this.getTokenFromRequest(req);
    const tokenWithOutBearer = token.slice(7);

    if (tokenWithOutBearer) {
      jwt.verify(tokenWithOutBearer, secret, (err, decoded) => {
        if (err) {
          return res.status(422).send({
            success: false,
            message: 'Failed to authenticate token.'
          });
        } else {
          req.decoded = decoded;
          next();
        }
      });
    } else {
      return res.status(403).send({
        success: false,
        message: 'No token provided.'
      });
    }
  }

}

module.exports = new AppConfigService();
