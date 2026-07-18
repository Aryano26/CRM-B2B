import { Request, Response, NextFunction } from 'express';
export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        name: string;
        role: 'PARTNER' | 'ADMIN';
        partnerId?: string | null;
    };
}
export declare const authenticateJWT: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
export declare const requireRole: (roles: ("PARTNER" | "ADMIN")[]) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
