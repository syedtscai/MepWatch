import { Request, Response, NextFunction } from "express";
import { securityService } from "../services/security";

/**
 * Rate limiting middleware for different endpoint types
 */
export function createRateLimiter(type: 'api' | 'export' | 'auth') {
  return (req: Request, res: Response, next: NextFunction) => {
    const identifier = req.ip || req.connection.remoteAddress || 'unknown';
    const rateLimitResult = securityService.checkRateLimit(type, identifier);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', type === 'api' ? '100' : type === 'export' ? '5' : '10');
    res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    res.setHeader('X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString());

    if (!rateLimitResult.allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Too many ${type} requests. Please try again later.`,
        retryAfter: new Date(rateLimitResult.resetTime).toISOString()
      });
    }

    next();
  };
}

export const apiRateLimit = createRateLimiter('api');
export const exportRateLimit = createRateLimiter('export');
export const authRateLimit = createRateLimiter('auth');