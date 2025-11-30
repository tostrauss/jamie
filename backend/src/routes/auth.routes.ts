import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-dev-key'; // In Prod unbedingt .env nutzen!

// Zod Schemas für Validierung
const RegisterSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(6)
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    // 1. Validierung
    const { email, username, password } = RegisterSchema.parse(req.body);

    // 2. Check ob User existiert
    const existingUser = await prisma.user.findFirst({
        where: { OR: [{ email }, { username }] }
    });
    
    if (existingUser) {
        return res.status(409).json({ error: 'Email oder Username bereits vergeben' });
    }

    // 3. Password Hashen
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. User erstellen
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}` // Auto-Avatar
      }
    });

    // 5. Token generieren (direkter Login nach Registrierung)
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ token, user: { id: user.id, username: user.username, email: user.email, avatarUrl: user.avatarUrl } });

  } catch (error) {
    if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
    }
    console.error(error);
    res.status(500).json({ error: 'Registrierung fehlgeschlagen' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = LoginSchema.parse(req.body);

    // 1. User finden
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        return res.status(401).json({ error: 'Ungültige Zugangsdaten' });
    }

    // 2. Passwort prüfen
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
        return res.status(401).json({ error: 'Ungültige Zugangsdaten' });
    }

    // 3. Token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: { id: user.id, username: user.username, email: user.email, avatarUrl: user.avatarUrl } });

  } catch (error) {
    res.status(400).json({ error: 'Login fehlgeschlagen' });
  }
});

export const authRoutes = router;