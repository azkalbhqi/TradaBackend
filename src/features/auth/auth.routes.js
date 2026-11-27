import express from 'express';
import * as authController from './auth.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { createRateLimiter } from '../../middlewares/rateLimit.middleware.js';

const router = express.Router();

const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyPrefix: 'auth',
  message: 'Too many authentication attempts, please try again after 15 minutes.',
});

const refreshRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  keyPrefix: 'auth-refresh',
  message: 'Too many token refresh requests, please try again later.',
});

router.post('/register', authRateLimiter, authController.register);
router.post('/login', authRateLimiter, authController.login);
router.post('/refresh', refreshRateLimiter, authController.refresh);
router.post('/logout', authController.logout);
router.post('/logout-all', authenticate, authController.logoutAll);
router.get('/me', authenticate, authController.me);
router.patch('/change-password', authenticate, authController.changePassword);

export default router;

