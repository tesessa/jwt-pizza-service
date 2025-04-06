const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('../config.js');
const { asyncHandler, StatusCodeError } = require('../endpointHelper.js');
const { DB, Role } = require('../database/database.js');
const Logger = require('pizza-logger');
const logger = new Logger(config);

const metrics = require('../metrics.js');
const app = express();

//app.use(metrics.requestTracker());
app.use(express.json());
app.use(logger.httpLogger); 

const authRouter = express.Router();
authRouter.use(logger.httpLogger);

authRouter.endpoints = [
  {
    method: 'POST',
    path: '/api/auth',
    description: 'Register a new user',
    example: `curl -X POST localhost:3000/api/auth -d '{"name":"pizza diner", "email":"d@jwt.com", "password":"diner"}' -H 'Content-Type: application/json'`,
    response: { user: { id: 2, name: 'pizza diner', email: 'd@jwt.com', roles: [{ role: 'diner' }] }, token: 'tttttt' },
  },
  {
    method: 'PUT',
    path: '/api/auth',
    description: 'Login existing user',
    example: `curl -X PUT localhost:3000/api/auth -d '{"email":"a@jwt.com", "password":"admin"}' -H 'Content-Type: application/json'`,
    response: { user: { id: 1, name: '常用名字', email: 'a@jwt.com', roles: [{ role: 'admin' }] }, token: 'tttttt' },
  },
  {
    method: 'PUT',
    path: '/api/auth/:userId',
    requiresAuth: true,
    description: 'Update user',
    example: `curl -X PUT localhost:3000/api/auth/1 -d '{"email":"a@jwt.com", "password":"admin"}' -H 'Content-Type: application/json' -H 'Authorization: Bearer tttttt'`,
    response: { id: 1, name: '常用名字', email: 'a@jwt.com', roles: [{ role: 'admin' }] },
  },
  {
    method: 'DELETE',
    path: '/api/auth',
    requiresAuth: true,
    description: 'Logout a user',
    example: `curl -X DELETE localhost:3000/api/auth -H 'Authorization: Bearer tttttt'`,
    response: { message: 'logout successful' },
  },
];

async function setAuthUser(req, res, next) {
  const token = readAuthToken(req);
  if (token) {
    try {
      if (await DB.isLoggedIn(token)) {
        // Check the database to make sure the token is valid.
        req.user = jwt.verify(token, config.jwtSecret);
        req.user.isRole = (role) => !!req.user.roles.find((r) => r.role === role);
      }
    } catch {
      req.user = null;
    }
  }
  next();
}

// Authenticate token
authRouter.authenticateToken = (req, res, next) => {
  if (!req.user) {
    metrics.trackAuthAttempts(false);
    logger.unhandledErrorLogger(new StatusCodeError("unauthorized", 401));
    return res.status(401).send({ message: 'unauthorized' });
  }
  next();
};

// register
authRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    metrics.incrementRequest("POST");
    const start = new Date();
    //logger.httpLogger(req, res);
    //Logger.httpLogger(req, res);
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      metrics.trackAuthAttempts(false);
      logger.unhandledErrorLogger(new StatusCodeError("name, email, and password are required for register", 400));
      return res.status(400).json({ message: 'name, email, and password are required' });
    }
    const user = await DB.addUser({ name, email, password, roles: [{ role: Role.Diner }] });
    const auth = await setAuth(user);

    const end = new Date()

    const latency = end - start
    metrics.addGeneralLatency(latency)

    metrics.trackAuthAttempts(true)
    metrics.addActiveUser()
    res.json({ user: user, token: auth });
  })
);

// login
authRouter.put(
  '/',
  asyncHandler(async (req, res) => {
    metrics.incrementRequest("PUT");
    const start = new Date();
    console.log("HERE AT LOGIN");
    //Logger.httpLogger(req,res);
    const { email, password } = req.body;
    if (!email || !password) {
      metrics.trackAuthAttempts(false);
      logger.unhandledErrorLogger(new StatusCodeError("email and password are required for login", 400));
      return res.status(400).json({ message: 'email and password are required' });
    }
   //try {
    const user = await DB.getUser(email, password);
    // } catch(error) {
    //   console.log("AUTH");
    //   metrics.trackAuthAttempts(false);
    // }
    const auth = await setAuth(user);

    const end = new Date();

    const latency = end - start;
    metrics.addGeneralLatency(latency);

    metrics.trackAuthAttempts(true);
    metrics.addActiveUser();

    res.json({ user: user, token: auth });
  })
);

// logout
authRouter.delete(
  '/',
  authRouter.authenticateToken,
  asyncHandler(async (req, res) => {
    metrics.incrementRequest("DELETE");
    const start = new Date();
    //Logger.httpLogger(req, res);
    await clearAuth(req);

    metrics.removeActiveUser();
    const end = new Date();
    const latency = end - start;
    metrics.addGeneralLatency(latency);
    metrics.trackAuthAttempts(true);

    res.json({ message: 'logout successful' });
  })
);

// updateUser
authRouter.put(
  '/:userId',
  authRouter.authenticateToken,
  asyncHandler(async (req, res) => {
    metrics.incrementRequest("PUT");
    const start = new Date();
    //Logger.httpLogger(req, res);
    const { email, password } = req.body;
    const userId = Number(req.params.userId);
    const user = req.user;
    if (user.id !== userId && !user.isRole(Role.Admin)) {
      metrics.trackAuthAttempts(false);
      logger.unhandledErrorLogger(new StatusCodeError("unauthorized", 403));
      return res.status(403).json({ message: 'unauthorized' });
    }

    const updatedUser = await DB.updateUser(userId, email, password);

    const end = new Date();
    const latency = end - start;
    metrics.addGeneralLatency(latency);
    metrics.trackAuthAttempts(true);
    
    res.json(updatedUser);
  })
);

async function setAuth(user) {
  const token = jwt.sign(user, config.jwtSecret);
  await DB.loginUser(user.id, token);
  return token;
}

async function clearAuth(req) {
  const token = readAuthToken(req);
  if (token) {
    await DB.logoutUser(token);
  } else {
    logger.unhandledErrorLogger(new StatusCodeError("unathorized", 403));
  }
}

function readAuthToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    return authHeader.split(' ')[1];
  }
  return null;
}

module.exports = { authRouter, setAuthUser };
