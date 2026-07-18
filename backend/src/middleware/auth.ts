import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-partner-crm-key-change-in-production';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: 'PARTNER' | 'ADMIN';
    partnerId?: string | null;
  };
}

export const authenticateJWT = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: 'Token is invalid or expired' });
      }
      
      req.user = decoded as AuthenticatedRequest['user'];
      next();
    });
  } else {
    res.status(401).json({ error: 'Authorization header is missing or malformed' });
  }
};

export const requireRole = (roles: ('PARTNER' | 'ADMIN')[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User is not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access forbidden: Insufficient permissions' });
    }

    next();
  };
};
