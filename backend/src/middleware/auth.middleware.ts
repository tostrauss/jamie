// backend/src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-dev-key-change-in-production';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    username?: string;
  };
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'Authentifizierung erforderlich' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      username?: string;
    };

    req.user = {
      userId: decoded.userId,
      username: decoded.username
    };

    next();
  } catch (error) {
    if ((error as any).name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Token abgelaufen' });
      return;
    }
    res.status(401).json({ error: 'Ungültiger Token' });
  }
};

// Optional auth - doesn't fail if no token
export const optionalAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        username?: string;
      };
      req.user = {
        userId: decoded.userId,
        username: decoded.username
      };
    } catch {
      // Ignore invalid token
    }
  }

  next();
};