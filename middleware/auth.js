const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Required authentication middleware.
 * Extracts token from Authorization: Bearer header.
 * Verifies and attaches user to req.user.
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: 'Authentication token is required'
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return res.status(401).json({
      success: false,
      error: 'Invalid authorization format. Format must be: Bearer <token>'
    });
  }

  const token = parts[1];

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token has expired'
        });
      }
      return res.status(401).json({
        success: false,
        error: 'Invalid or malformed token'
      });
    }

    req.user = user;
    next();
  });
}

/**
 * Optional authentication middleware.
 * If token is present, verifies it and sets req.user.
 * If absent or invalid, sets req.user to null and proceeds.
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    req.user = null;
    return next();
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    req.user = null;
    return next();
  }

  const token = parts[1];

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      req.user = null;
    } else {
      req.user = user;
    }
    next();
  });
}

module.exports = {
  authenticateToken,
  requireAuth: authenticateToken,
  optionalAuth
};
