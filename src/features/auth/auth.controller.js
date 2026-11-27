import * as authService from './auth.service.js';

const REFRESH_COOKIE_NAME = 'refresh_token';

const parseCookie = (cookieHeader, name) => {
  if (!cookieHeader) return null;
  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    if (key === name) {
      return decodeURIComponent(pair.slice(idx + 1).trim());
    }
  }
  return null;
};

const getRequestMeta = (req) => ({
  userAgent: req.headers['user-agent'] || null,
  ipAddress:
    req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
    req.ip ||
    req.socket?.remoteAddress ||
    null,
});

const setRefreshCookie = (res, refreshToken, expiresAt) => {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/auth',
    expires: expiresAt,
  });
};

const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/auth',
  });
};

export const register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body, getRequestMeta(req));
    setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body, getRequestMeta(req));
    setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const rawRefreshToken =
      req.body?.refreshToken || parseCookie(req.headers.cookie, REFRESH_COOKIE_NAME);

    const result = await authService.refreshSession(rawRefreshToken, getRequestMeta(req));
    setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
      },
    });
  } catch (error) {
    clearRefreshCookie(res);
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const rawRefreshToken =
      req.body?.refreshToken || parseCookie(req.headers.cookie, REFRESH_COOKIE_NAME);

    await authService.logout(rawRefreshToken);
    clearRefreshCookie(res);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const logoutAll = async (req, res, next) => {
  try {
    await authService.logoutAll(req.user.id);
    clearRefreshCookie(res);

    res.status(200).json({
      success: true,
      message: 'All sessions revoked successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const me = async (req, res, next) => {
  try {
    const user = await authService.getProfile(req.user.id);
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    await authService.changePassword(req.user.id, req.body);
    clearRefreshCookie(res);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully. Please log in again.',
    });
  } catch (error) {
    next(error);
  }
};

