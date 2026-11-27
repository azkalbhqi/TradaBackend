const buckets = new Map();

// Periodically prune expired rate-limit entries to prevent unbounded memory growth.
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of buckets.entries()) {
    if (entry.resetAt <= now) {
      buckets.delete(key);
    }
  }
}, 60_000);
cleanupInterval.unref();

/**
 * Creates a lightweight sliding/fixed-window rate limiter middleware.
 */
export const createRateLimiter = ({
  windowMs = 15 * 60 * 1000,
  max = 10,
  message = 'Too many requests, please try again later.',
  keyPrefix = 'rl',
} = {}) => {
  return (req, res, next) => {
    const clientIp =
      req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
      req.ip ||
      req.socket?.remoteAddress ||
      'unknown';

    const key = `${keyPrefix}:${clientIp}`;
    const now = Date.now();
    let entry = buckets.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 1, resetAt: now + windowMs };
      buckets.set(key, entry);
    } else {
      entry.count += 1;
    }

    const remaining = Math.max(0, max - entry.count);
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000));

    if (entry.count > max) {
      const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      return res.status(429).json({
        success: false,
        message,
      });
    }

    next();
  };
};

