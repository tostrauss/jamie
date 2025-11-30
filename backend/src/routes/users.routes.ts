import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// GET /api/users/me - Eigenes Profil laden
// Wir nutzen hier 'authenticateToken', um sicherzustellen, dass der User eingeloggt ist
router.get('/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        username: true, 
        email: true, 
        avatarUrl: true, 
        bio: true,
        createdAt: true,
        // Optional: Auch die Gruppen laden, in denen der User ist
        joinedGroups: {
            include: { group: true }
        }
      }
    });

    if (!user) return res.status(404).json({ error: 'User nicht gefunden' });
    res.json(user);

  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden des Profils' });
  }
});

// PUT /api/users/me - Profil update (Bio, Avatar)
router.put('/me', authenticateToken, async (req: AuthRequest, res) => {
    const { bio, avatarUrl } = req.body;
    const userId = req.user?.userId;

    try {
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { bio, avatarUrl },
            select: { id: true, username: true, bio: true, avatarUrl: true }
        });
        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ error: 'Update fehlgeschlagen' });
    }
});

export const userRoutes = router;