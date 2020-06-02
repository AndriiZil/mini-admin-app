const { Router } = require('express');
const appConfigService = require('./services/app-config-service');

const apiRoutes = Router();

const auth = require('./api/auth');
const passport = require('./api/passport');
const profile = require('./api/profile');

apiRoutes.use('/', auth);
apiRoutes.use('/', passport);

// Middleware for check JWT token
apiRoutes.use((req, res, next) => {
  appConfigService.checkToken(req, res, next);
});

apiRoutes.use('/', profile);

module.exports = apiRoutes;
