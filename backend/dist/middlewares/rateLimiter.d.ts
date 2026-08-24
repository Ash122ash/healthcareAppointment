import { Request, Response, NextFunction } from 'express';
export declare function createRateLimiter(windowMs: number, maxRequests: number, message: string): (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
export declare const authRateLimiter: (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
