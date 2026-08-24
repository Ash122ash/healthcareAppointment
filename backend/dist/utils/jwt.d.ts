import { UserRole } from '@medisync/shared';
export interface TokenPayload {
    id: string;
    email: string;
    role: UserRole;
}
export declare function generateAccessToken(payload: TokenPayload): string;
export declare function generateRefreshToken(payload: TokenPayload): string;
export declare function verifyAccessToken(token: string): TokenPayload;
export declare function verifyRefreshToken(token: string): TokenPayload;
