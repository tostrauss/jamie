// backend/src/routes/auth.routes.ts
// Jamie App - Authentication API Routes

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-dev-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// ============================================
// VALIDATION SCHEMAS
// ============================================
const RegisterSchema = z.object({
  email: z.string().email('Ungültige Email-Adresse'),
  username: z.string()
    .min(3, 'Username muss mindestens 3 Zeichen haben')
    .max(20, 'Username darf maximal 20 Zeichen haben')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username darf nur Buchstaben, Zahlen und Unterstriche enthalten'),
  password: z.string()
    .min(6, 'Passwort muss mindestens 6 Zeichen haben')
    .max(100, 'Passwort ist zu lang'),
  city: z.string().max(50).optional()
});

const LoginSchema = z.object({
  email: z.string().email('Ungültige Email-Adresse'),
  password: z.string().min(1, 'Passwort erforderlich')
});

// ============================================
// HELPER FUNCTIONS
// ============================================
function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function sanitizeUser(user: any) {
  const { password, ...safeUser } = user;
  return safeUser;
}

function generateDefaultAvatar(seed: string): string {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}

// ============================================
// POST /api/auth/register - Register new user
// ============================================
router.post('/register', async (req: Request, res: Response) => {
  try {
    // Validate input
    const validated = RegisterSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: validated.email.toLowerCase() },
          { username: validated.username }
        ]
      }
    });

    if (existingUser) {
      const field = existingUser.email === validated.email.toLowerCase() ? 'Email' : 'Username';
      return res.status(409).json({ error: `${field} ist bereits vergeben` });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validated.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: validated.email.toLowerCase(),
        username: validated.username,
        password: hashedPassword,
        avatarUrl: generateDefaultAvatar(validated.username),
        city: validated.city || null
      }
    });

    // Generate token
    const token = generateToken(user.id);

    res.status(201).json({
      token,
      user: sanitizeUser(user)
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return res.status(400).json({ error: firstError.message });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registrierung fehlgeschlagen' });
  }
});

// ============================================
// POST /api/auth/login - Login user
// ============================================
router.post('/login', async (req: Request, res: Response) => {
  try {
    // Validate input
    const validated = LoginSchema.parse(req.body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: validated.email.toLowerCase() }
    });

    if (!user) {
      return res.status(401).json({ error: 'Ungültige Zugangsdaten' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(validated.password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Ungültige Zugangsdaten' });
    }

    // Generate token
    const token = generateToken(user.id);

    res.json({
      token,
      user: sanitizeUser(user)
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return res.status(400).json({ error: firstError.message });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login fehlgeschlagen' });
  }
});

// ============================================
// POST /api/auth/refresh - Refresh token
// ============================================
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token erforderlich' });
    }

    // Verify current token
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    
    // Check if user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return res.status(401).json({ error: 'User nicht gefunden' });
    }

    // Generate new token
    const newToken = generateToken(user.id);

    res.json({
      token: newToken,
      user: sanitizeUser(user)
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ error: 'Ungültiger Token' });
  }
});

// ============================================
// POST /api/auth/forgot-password - Request password reset
// ============================================
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email erforderlich' });
    }

    // Check if user exists (don't reveal if email exists or not)
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    // TODO: Implement email sending with reset token
    // For now, just return success regardless
    
    // Always return success to prevent email enumeration
    res.json({ 
      message: 'Falls ein Account mit dieser Email existiert, wurde ein Link zum Zurücksetzen gesendet.' 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Anfrage fehlgeschlagen' });
  }
});

export const authRoutes = router;