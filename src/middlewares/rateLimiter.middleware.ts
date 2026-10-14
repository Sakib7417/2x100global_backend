import rateLimit from 'express-rate-limit';

/**
 * General rate limiter for API requests
 */
export const generalRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '9000000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'), // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Stricter rate limiter for credential endpoints (login, password reset).
 *
 * `skipSuccessfulRequests` is the important flag here. Counting *all* requests
 * would lock out a legitimate user who signs in five times in fifteen minutes
 * across a phone and a laptop — a support ticket, not a security win. Counting
 * only failures means the budget is spent exclusively by someone guessing, so
 * the limit can stay genuinely tight without ever affecting normal use.
 *
 * Keyed by IP, which only works correctly behind a proxy when
 * `app.set('trust proxy', ...)` is configured — see src/index.ts.
 */
export const authRateLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000'), // 15m
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '5000'),
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for sensitive operations
 */
export const sensitiveRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 requests per hour
  message: {
    success: false,
    message: 'Too many sensitive operations, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
