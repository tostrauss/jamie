import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-dev-key';

// Erweitert das Express Request Objekt, damit TypeScript 'user' kennt
export interface AuthRequest extends Request {
  user?: { userId: string };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  // Format: "Bearer <token>"
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Zugriff verweigert. Kein Token.' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
        return res.status(403).json({ error: 'Token ungültig oder abgelaufen' });
    }
    req.user = user;
    next();
  });
};