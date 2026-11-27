import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../../config/prisma.js';

const BCRYPT_ROUNDS = 12;
// Pre-computed dummy hash used when a user is not found so login timing stays uniform.
const DUMMY_PASSWORD_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKxGhu6cY1Q7u8N5F6z5y8Z8Q0q8Z8Q0q8Z8e';

const USER_SELECT = {
  id: true,
  username: true,
  email: true,
  role: true,
  fav_symbol_id: true,
  created_at: true,
};

const createHttpError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const getAccessSecret = () => {
  const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_ACCESS_SECRET is not configured');
  return secret;
};

const getRefreshSecret = () => {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET is not configured');
  return secret;
};

const getAccessExpiresIn = () => process.env.JWT_ACCESS_EXPIRES_IN || '15m';

const getRefreshExpiresDays = () => {
  const parsed = Number(process.env.JWT_REFRESH_EXPIRES_DAYS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 7;
};

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const signAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      type: 'access',
    },
    getAccessSecret(),
    { expiresIn: getAccessExpiresIn(), algorithm: 'HS256' }
  );
};

const createRefreshTokenString = (userId, familyId) => {
  const days = getRefreshExpiresDays();
  return jwt.sign(
    {
      sub: userId,
      familyId,
      jti: crypto.randomBytes(32).toString('hex'),
      type: 'refresh',
    },
    getRefreshSecret(),
    { expiresIn: `${days}d`, algorithm: 'HS256' }
  );
};

const getRefreshExpiryDate = () => {
  const days = getRefreshExpiresDays();
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
};

const validatePasswordStrength = (password) => {
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    throw createHttpError(400, 'Password must be between 8 and 128 characters');
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw createHttpError(400, 'Password must contain at least one letter and one number');
  }
};

const issueSessionTokens = async (user, meta = {}, tx = prisma) => {
  const familyId = crypto.randomUUID();
  const accessToken = signAccessToken(user);
  const refreshToken = createRefreshTokenString(user.id, familyId);
  const expiresAt = getRefreshExpiryDate();

  await tx.refreshToken.create({
    data: {
      user_id: user.id,
      token_hash: hashToken(refreshToken),
      family_id: familyId,
      user_agent: meta.userAgent || null,
      ip_address: meta.ipAddress || null,
      expires_at: expiresAt,
    },
  });

  return {
    user,
    accessToken,
    refreshToken,
    expiresIn: getAccessExpiresIn(),
    refreshExpiresAt: expiresAt,
  };
};

export const register = async ({ username, email, password }, meta = {}) => {
  if (!username || !email || !password) {
    throw createHttpError(400, 'username, email, and password are required');
  }

  const normalizedUsername = String(username).trim();
  const normalizedEmail = String(email).trim().toLowerCase();

  if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(normalizedUsername)) {
    throw createHttpError(
      400,
      'Username must be 3-30 characters and contain only letters, numbers, underscores, dots, or hyphens'
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw createHttpError(400, 'Invalid email format');
  }

  validatePasswordStrength(password);

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: normalizedEmail }, { username: normalizedUsername }],
    },
    select: { id: true, email: true, username: true },
  });

  if (existing) {
    const field = existing.email === normalizedEmail ? 'Email' : 'Username';
    throw createHttpError(409, `${field} is already registered`);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        username: normalizedUsername,
        email: normalizedEmail,
        password_hash: passwordHash,
      },
      select: USER_SELECT,
    });

    return issueSessionTokens(user, meta, tx);
  });
};

export const login = async ({ identifier, email, username, password }, meta = {}) => {
  const loginId = (identifier || email || username || '').toString().trim();
  if (!loginId || !password || typeof password !== 'string') {
    throw createHttpError(400, 'Email/username and password are required');
  }

  const normalizedEmail = loginId.toLowerCase();
  const userRecord = await prisma.user.findFirst({
    where: {
      OR: [{ email: normalizedEmail }, { username: loginId }],
    },
  });

  if (!userRecord) {
    await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
    throw createHttpError(401, 'Invalid email/username or password');
  }

  const isValid = await bcrypt.compare(password, userRecord.password_hash);
  if (!isValid) {
    throw createHttpError(401, 'Invalid email/username or password');
  }

  const user = {
    id: userRecord.id,
    username: userRecord.username,
    email: userRecord.email,
    role: userRecord.role,
    fav_symbol_id: userRecord.fav_symbol_id,
    created_at: userRecord.created_at,
  };

  return issueSessionTokens(user, meta);
};

export const refreshSession = async (rawRefreshToken, meta = {}) => {
  if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
    throw createHttpError(401, 'Refresh token is required');
  }

  let decoded;
  try {
    decoded = jwt.verify(rawRefreshToken, getRefreshSecret(), { algorithms: ['HS256'] });
  } catch (error) {
    throw createHttpError(
      401,
      error.name === 'TokenExpiredError' ? 'Refresh token expired' : 'Invalid refresh token'
    );
  }

  if (decoded.type !== 'refresh' || !decoded.sub || !decoded.familyId) {
    throw createHttpError(401, 'Invalid refresh token');
  }

  const tokenHash = hashToken(rawRefreshToken);
  const storedToken = await prisma.refreshToken.findUnique({
    where: { token_hash: tokenHash },
  });

  if (!storedToken) {
    throw createHttpError(401, 'Refresh token not recognized');
  }

  // Reuse detection: if a revoked token is presented again, revoke the entire token family.
  if (storedToken.revoked_at !== null) {
    await prisma.refreshToken.updateMany({
      where: { family_id: storedToken.family_id, revoked_at: null },
      data: { revoked_at: new Date() },
    });
    throw createHttpError(401, 'Refresh token reuse detected. Session has been revoked.');
  }

  if (storedToken.expires_at <= new Date()) {
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked_at: new Date() },
    });
    throw createHttpError(401, 'Refresh token expired');
  }

  const user = await prisma.user.findUnique({
    where: { id: storedToken.user_id },
    select: USER_SELECT,
  });

  if (!user) {
    throw createHttpError(401, 'User no longer exists');
  }

  const newRefreshToken = createRefreshTokenString(user.id, storedToken.family_id);
  const newTokenHash = hashToken(newRefreshToken);
  const newExpiresAt = getRefreshExpiryDate();
  const accessToken = signAccessToken(user);

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: {
        revoked_at: new Date(),
        replaced_by_hash: newTokenHash,
      },
    }),
    prisma.refreshToken.create({
      data: {
        user_id: user.id,
        token_hash: newTokenHash,
        family_id: storedToken.family_id,
        user_agent: meta.userAgent || null,
        ip_address: meta.ipAddress || null,
        expires_at: newExpiresAt,
      },
    }),
  ]);

  return {
    user,
    accessToken,
    refreshToken: newRefreshToken,
    expiresIn: getAccessExpiresIn(),
    refreshExpiresAt: newExpiresAt,
  };
};

export const logout = async (rawRefreshToken) => {
  if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
    return;
  }

  const tokenHash = hashToken(rawRefreshToken);
  await prisma.refreshToken.updateMany({
    where: { token_hash: tokenHash, revoked_at: null },
    data: { revoked_at: new Date() },
  });
};

export const logoutAll = async (userId) => {
  await prisma.refreshToken.updateMany({
    where: { user_id: Number(userId), revoked_at: null },
    data: { revoked_at: new Date() },
  });
};

export const getProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    select: {
      ...USER_SELECT,
      favorite: {
        select: { id: true, ticker: true, name: true, category: true, icon: true },
      },
    },
  });

  if (!user) {
    throw createHttpError(404, 'User not found');
  }
  return user;
};

export const changePassword = async (userId, { currentPassword, newPassword }) => {
  if (!currentPassword || !newPassword) {
    throw createHttpError(400, 'currentPassword and newPassword are required');
  }

  validatePasswordStrength(newPassword);

  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
  });

  if (!user) {
    throw createHttpError(404, 'User not found');
  }

  const isCurrentValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isCurrentValid) {
    throw createHttpError(401, 'Current password is incorrect');
  }

  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { password_hash: newHash },
    }),
    prisma.refreshToken.updateMany({
      where: { user_id: user.id, revoked_at: null },
      data: { revoked_at: new Date() },
    }),
  ]);
};

