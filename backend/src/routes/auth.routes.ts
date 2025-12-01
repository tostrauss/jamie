// backend/src/routes/auth.routes.ts
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// ============================================
// CONFIG
// ============================================
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-dev-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret-dev-key-change-in-production';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60; // 15 minutes
const BCRYPT_ROUNDS = 12;

// ============================================
// VALIDATION SCHEMAS
// ============================================
const RegisterSchema = z.object({
  email: z.string()
    .email('Ungültige E-Mail-Adresse')
    .max(255, 'E-Mail zu lang'),
  username: z.string()
    .min(3, 'Benutzername muss mindestens 3 Zeichen haben')
    .max(30, 'Benutzername darf maximal 30 Zeichen haben')
    .regex(/^[a-zA-Z0-9_]+$/, 'Nur Buchstaben, Zahlen und Unterstriche erlaubt'),
  password: z.string()
    .min(8, 'Passwort muss mindestens 8 Zeichen haben')
    .max(128, 'Passwort zu lang')
    .regex(/[A-Z]/, 'Passwort muss mindestens einen Großbuchstaben enthalten')
    .regex(/[a-z]/, 'Passwort muss mindestens einen Kleinbuchstaben enthalten')
    .regex(/[0-9]/, 'Passwort muss mindestens eine Zahl enthalten'),
  city: z.string().min(1).max(50).optional()
});

const LoginSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(1, 'Passwort erforderlich')
});

const ForgotPasswordSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse')
});

const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Token erforderlich'),
  newPassword: z.string()
    .min(8, 'Passwort muss mindestens 8 Zeichen haben')
    .regex(/[A-Z]/, 'Passwort muss mindestens einen Großbuchstaben enthalten')
    .regex(/[a-z]/, 'Passwort muss mindestens einen Kleinbuchstaben enthalten')
    .regex(/[0-9]/, 'Passwort muss mindestens eine Zahl enthalten')
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Aktuelles Passwort erforderlich'),
  newPassword: z.string()
    .min(8, 'Passwort muss mindestens 8 Zeichen haben')
    .regex(/[A-Z]/, 'Passwort muss mindestens einen Großbuchstaben enthalten')
    .regex(/[a-z]/, 'Passwort muss mindestens einen Kleinbuchstaben enthalten')
    .regex(/[0-9]/, 'Passwort muss mindestens eine Zahl enthalten')
});

const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh Token erforderlich')
});

// ============================================
// HELPER FUNCTIONS
// ============================================
function generateTokens(userId: string, username: string) {
  const accessToken = jwt.sign(
    { userId, username },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS
  };
}

function sanitizeUser(user: any) {
  const { passwordHash, refreshTokens, resetToken, resetTokenExpiry, ...sanitized } = user;
  return sanitized;
}

function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// ============================================
// POST /api/auth/register - Register new user
// ============================================
router.post('/register', async (req: Request, res: Response) => {
  try {
    const data = RegisterSchema.parse(req.body);

    // Check if email exists
    const existingEmail = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() }
    });

    if (existingEmail) {
      return res.status(409).json({ error: 'E-Mail-Adresse bereits registriert' });
    }

    // Check if username exists
    const existingUsername = await prisma.user.findUnique({
      where: { username: data.username.toLowerCase() }
    });

    if (existingUsername) {
      return res.status(409).json({ error: 'Benutzername bereits vergeben' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        username: data.username,
        passwordHash,
        city: data.city || null,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`
      }
    });

    // Generate tokens
    const tokens = generateTokens(user.id, user.username);

    // Store refresh token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokens: {
          push: tokens.refreshToken
        }
      }
    });

    console.log(`✅ New user registered: ${user.username} (${user.email})`);

    res.status(201).json({
      user: sanitizeUser(user),
      tokens
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return res.status(400).json({ error: firstError.message });
    }
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registrierung fehlgeschlagen' });
  }
});

// ============================================
// POST /api/auth/login - Login user
// ============================================
router.post('/login', async (req: Request, res: Response) => {
  try {
    const data = LoginSchema.parse(req.body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() }
    });

    if (!user) {
      return res.status(401).json({ error: 'Ungültige E-Mail oder Passwort' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({ error: 'Account deaktiviert' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(data.password, user.passwordHash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Ungültige E-Mail oder Passwort' });
    }

    // Generate tokens
    const tokens = generateTokens(user.id, user.username);

    // Store refresh token (keep last 5)
    const refreshTokens = [...(user.refreshTokens || []), tokens.refreshToken].slice(-5);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokens,
        lastLoginAt: new Date()
      }
    });

    console.log(`✅ User logged in: ${user.username}`);

    res.json({
      user: sanitizeUser(user),
      tokens
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return res.status(400).json({ error: firstError.message });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Anmeldung fehlgeschlagen' });
  }
});

// ============================================
// POST /api/auth/logout - Logout user
// ============================================
router.post('/logout', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { refreshToken } = req.body;

    if (userId && refreshToken) {
      // Remove refresh token
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { refreshTokens: true }
      });

      if (user) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            refreshTokens: user.refreshTokens.filter(t => t !== refreshToken)
          }
        });
      }
    }

    res.json({ message: 'Erfolgreich abgemeldet' });
  } catch (error) {
    console.error('Logout error:', error);
    res.json({ message: 'Abgemeldet' });
  }
});

// ============================================
// POST /api/auth/refresh - Refresh access token
// ============================================
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = RefreshTokenSchema.parse(req.body);

    // Verify refresh token
    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ error: 'Ungültiger Refresh Token' });
    }

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Ungültiger Token-Typ' });
    }

    // Find user and check if refresh token is valid
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Benutzer nicht gefunden' });
    }

    if (!user.refreshTokens.includes(refreshToken)) {
      return res.status(401).json({ error: 'Refresh Token ungültig oder abgelaufen' });
    }

    // Generate new tokens (token rotation)
    const tokens = generateTokens(user.id, user.username);

    // Replace old refresh token with new one
    const updatedRefreshTokens = user.refreshTokens
      .filter(t => t !== refreshToken)
      .concat(tokens.refreshToken)
      .slice(-5);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokens: updatedRefreshTokens }
    });

    res.json({ tokens });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Refresh Token erforderlich' });
    }
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'Token-Aktualisierung fehlgeschlagen' });
  }
});

// ============================================
// POST /api/auth/forgot-password - Request password reset
// ============================================
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = ForgotPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ 
        message: 'Falls die E-Mail existiert, wurde ein Link zum Zurücksetzen gesendet.' 
      });
    }

    // Generate reset token
    const resetToken = generateResetToken();
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry
      }
    });

    // TODO: Send email with reset link
    // In development, log the token
    console.log(`🔑 Password reset token for ${email}: ${resetToken}`);

    res.json({ 
      message: 'Falls die E-Mail existiert, wurde ein Link zum Zurücksetzen gesendet.',
      // Only in dev:
      ...(process.env.NODE_ENV !== 'production' && { devToken: resetToken })
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Ungültige E-Mail-Adresse' });
    }
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Anfrage fehlgeschlagen' });
  }
});

// ============================================
// POST /api/auth/reset-password - Reset password with token
// ============================================
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = ResetPasswordSchema.parse(req.body);

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ error: 'Ungültiger oder abgelaufener Token' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
        refreshTokens: [] // Invalidate all sessions
      }
    });

    console.log(`✅ Password reset for: ${user.email}`);

    res.json({ message: 'Passwort erfolgreich zurückgesetzt' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return res.status(400).json({ error: firstError.message });
    }
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Passwort-Zurücksetzen fehlgeschlagen' });
  }
});

// ============================================
// POST /api/auth/change-password - Change password (authenticated)
// ============================================
router.post('/change-password', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    const { currentPassword, newPassword } = ChangePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    }

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Aktuelles Passwort ist falsch' });
    }

    // Check if new password is same as old
    const samePassword = await bcrypt.compare(newPassword, user.passwordHash);

    if (samePassword) {
      return res.status(400).json({ error: 'Neues Passwort muss sich vom alten unterscheiden' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    });

    console.log(`✅ Password changed for: ${user.email}`);

    res.json({ message: 'Passwort erfolgreich geändert' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return res.status(400).json({ error: firstError.message });
    }
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Passwort-Änderung fehlgeschlagen' });
  }
});

// ============================================
// POST /api/auth/check-email - Check email availability
// ============================================
router.post('/check-email', async (req: Request, res: Response) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);

    const exists = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true }
    });

    res.json({ available: !exists });
  } catch (error) {
    res.status(400).json({ error: 'Ungültige E-Mail' });
  }
});

// ============================================
// POST /api/auth/check-username - Check username availability
// ============================================
router.post('/check-username', async (req: Request, res: Response) => {
  try {
    const { username } = z.object({ 
      username: z.string().min(3).max(30) 
    }).parse(req.body);

    const exists = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { id: true }
    });

    res.json({ available: !exists });
  } catch (error) {
    res.status(400).json({ error: 'Ungültiger Benutzername' });
  }
});

// ============================================
// GET /api/auth/me - Get current user (quick check)
// ============================================
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || !user.isActive) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    }

    res.json(sanitizeUser(user));
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});

export const authRoutes = router;