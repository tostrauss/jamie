// backend/src/middleware/auth.middleware.ts
// Jamie App - Authentication Middleware

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-dev-key-change-in-production';

// Extended Request interface with user data
export interface AuthRequest extends Request {
  user?: { userId: string };
}

/**
 * Middleware to verify JWT token and attach user to request
 */
export const authenticateToken = (
  req: AuthRequest, 
  res: Response, 
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  // Format: "Bearer <token>"
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Zugriff verweigert. Kein Token.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.user = { userId: decoded.userId };
    next();
  } catch (err) {
    res.status(403).json({ error: 'Token ungültig oder abgelaufen' });
    return;
  }
};

/**
 * Optional auth - attaches user if token present, but doesn't require it
 */
export const optionalAuth = (
  req: AuthRequest, 
  res: Response, 
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      req.user = { userId: decoded.userId };
    } catch {
      // Token invalid, but we continue without user
    }
  }
  
  next();
};