import rateLimit from 'express-rate-limit';
import { getEnvVar } from '@usdc-payroll/shared';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: parseInt(getEnvVar('RATE_LIMIT_WINDOW_MS', '900000')), // 15 minutes
  max: parseInt(getEnvVar('RATE_LIMIT_MAX_REQUESTS', '100')), // 100 requests per window
  message: {
    error: {
      message: 'Too many requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Strict rate limiter for file uploads
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 uploads per window
  message: {
    error: {
      message: 'Too many file uploads, please try again later',
      code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
      statusCode: 429
    }
  }
});

// Webhook rate limiter (more permissive)
export const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 webhooks per minute
  message: {
    error: {
      message: 'Webhook rate limit exceeded',
      code: 'WEBHOOK_RATE_LIMIT_EXCEEDED',
      statusCode: 429
    }
  }
});
