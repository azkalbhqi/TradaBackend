import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';

const getAccessSecret = () => {
  const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET is not configured');
  }
  return secret;
};

const verifyBearerToken = async (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const err = new Error('Authorization header missing or malformed');
    err.statusCode = 401;
    throw err;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    const err = new Error('Access token is required');
    err.statusCode = 401;
    throw err;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, getAccessSecret(), { algorithms: ['HS256'] });
  } catch (error) {
    const err = new Error(
      error.name === 'TokenExpiredError' ? 'Access token expired' : 'Invalid access token'
    );
    err.statusCode = 401;
    throw err;
  }

  if (decoded.type !== 'access' || !decoded.sub) {
    const err = new Error('Invalid token type');
    err.statusCode = 401;
    throw err;
  }

  const user = await prisma.user.findUnique({
    where: { id: Number(decoded.sub) },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      fav_symbol_id: true,
      created_at: true,
    },
  });

  if (!user) {
    const err = new Error('User no longer exists');
    err.statusCode = 401;
    throw err;
  }

  return user;
};

/**
 * Requires a valid JWT access token in the Authorization: Bearer <token> header.
 */
export const authenticate = async (req, res, next) => {
  try {
    req.user = await verifyBearerToken(req.headers.authorization);
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Attaches req.user if an Authorization header is provided; otherwise continues anonymously.
 */
export const optionalAuth = async (req, res, next) => {
  try {
    if (!req.headers.authorization) {
      return next();
    }
    req.user = await verifyBearerToken(req.headers.authorization);
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Restricts route access to users with one of the specified roles.
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden: insufficient permissions' });
    }
    next();
  };
};

