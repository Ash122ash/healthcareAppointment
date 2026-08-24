import { Request, Response, NextFunction } from 'express';

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

const ipCache = new Map<string, RateLimitInfo>();

export function createRateLimiter(windowMs: number, maxRequests: number, message: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    let record = ipCache.get(ip);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      ipCache.set(ip, record);
      return next();
    }

    record.count++;

    if (record.count > maxRequests) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message,
        retryAfterMs: record.resetTime - now,
      });
    }

    next();
  };
}

// Limit auth attempts — 50/min in dev (5/min in prod)
export const authRateLimiter = createRateLimiter(
  60 * 1000,
  50,
  'Too many login or registration attempts. Please try again after a minute.'
);
