"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRateLimiter = void 0;
exports.createRateLimiter = createRateLimiter;
const ipCache = new Map();
function createRateLimiter(windowMs, maxRequests, message) {
    return (req, res, next) => {
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
// Limit auth attempts to 5 requests per 1 minute
exports.authRateLimiter = createRateLimiter(60 * 1000, 5, 'Too many login or registration attempts. Please try again after a minute.');
//# sourceMappingURL=rateLimiter.js.map