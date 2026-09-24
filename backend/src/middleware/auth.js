const jwt = require('jsonwebtoken');
const config = require('../config');
const ApiError = require('../utils/ApiError');

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

function readUser(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }
  const user = req.app.locals.db.prepare('SELECT * FROM users WHERE id = ?').get(payload.sub);
  if (!user) throw ApiError.unauthorized('Account no longer exists');
  return user;
}

// Attaches req.user when a valid token is present; anonymous requests pass through.
function optionalAuth(req, res, next) {
  req.user = readUser(req);
  next();
}

function requireAuth(req, res, next) {
  req.user = readUser(req);
  if (!req.user) throw ApiError.unauthorized();
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) throw ApiError.unauthorized();
    if (!roles.includes(req.user.role)) throw ApiError.forbidden();
    next();
  };
}

// Owners and admins may modify a resource.
function assertOwner(user, ownerId) {
  if (user.role !== 'admin' && user.id !== ownerId) throw ApiError.forbidden();
}

module.exports = { signToken, optionalAuth, requireAuth, requireRole, assertOwner };
