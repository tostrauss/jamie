// backend/src/routes/favorites.routes.ts
import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// ============================================
// VALIDATION SCHEMAS
// ============================================
const AddFavoriteSchema = z.object({
  type: z.enum(['GROUP', 'CLUB']),
  groupId: z.string().uuid().optional(),
  clubId: z.string().uuid().optional()
}).refine(data => {
  if (data.type === 'GROUP' && !data.groupId) return false;
  if (data.type === 'CLUB' && !data.clubId) return false;
  return true;
}, { message: 'groupId or clubId required based on type' });

// ============================================
// GET /api/favorites - Get user's favorites
// ============================================
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: {
        group: {
          select: {
            id: true,
            title: true,
            description: true,
            imageUrl: true,
            category: true,
            city: true,
            date: true,
            maxMembers: true,
            _count: {
              select: { participants: { where: { status: 'APPROVED' } } }
            }
          }
        },
        club: {
          select: {
            id: true,
            title: true,
            description: true,
            imageUrl: true,
            category: true,
            city: true,
            memberCount: true,
            isPrivate: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Transform response
    const transformedFavorites = favorites.map(fav => ({
      id: fav.id,
      type: fav.type,
      createdAt: fav.createdAt,
      groupId: fav.groupId,
      clubId: fav.clubId,
      group: fav.group ? {
        ...fav.group,
        currentMembers: fav.group._count.participants
      } : null,
      club: fav.club
    }));

    res.json({
      favorites: transformedFavorites,
      total: favorites.length
    });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ error: 'Favoriten konnten nicht geladen werden' });
  }
});

// ============================================
// GET /api/favorites/groups - Get favorite groups only
// ============================================
router.get('/groups', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    const favorites = await prisma.favorite.findMany({
      where: { userId, type: 'GROUP' },
      include: {
        group: {
          include: {
            creator: {
              select: { id: true, username: true, avatarUrl: true }
            },
            _count: {
              select: { participants: { where: { status: 'APPROVED' } } }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const groups = favorites
      .filter(f => f.group)
      .map(f => ({
        ...f.group,
        currentMembers: f.group!._count.participants,
        favoriteId: f.id,
        favoritedAt: f.createdAt
      }));

    res.json({ groups, total: groups.length });
  } catch (error) {
    console.error('Error fetching favorite groups:', error);
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});

// ============================================
// GET /api/favorites/clubs - Get favorite clubs only
// ============================================
router.get('/clubs', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    const favorites = await prisma.favorite.findMany({
      where: { userId, type: 'CLUB' },
      include: {
        club: {
          include: {
            creator: {
              select: { id: true, username: true, avatarUrl: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const clubs = favorites
      .filter(f => f.club)
      .map(f => ({
        ...f.club,
        favoriteId: f.id,
        favoritedAt: f.createdAt
      }));

    res.json({ clubs, total: clubs.length });
  } catch (error) {
    console.error('Error fetching favorite clubs:', error);
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});

// ============================================
// POST /api/favorites - Add to favorites
// ============================================
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    const data = AddFavoriteSchema.parse(req.body);

    // Check if already favorited
    const existing = await prisma.favorite.findFirst({
      where: {
        userId,
        ...(data.type === 'GROUP' ? { groupId: data.groupId } : { clubId: data.clubId })
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Bereits in Favoriten' });
    }

    // Verify the target exists
    if (data.type === 'GROUP' && data.groupId) {
      const group = await prisma.activityGroup.findUnique({ where: { id: data.groupId } });
      if (!group) {
        return res.status(404).json({ error: 'Gruppe nicht gefunden' });
      }
    }

    if (data.type === 'CLUB' && data.clubId) {
      const club = await prisma.club.findUnique({ where: { id: data.clubId } });
      if (!club) {
        return res.status(404).json({ error: 'Club nicht gefunden' });
      }
    }

    // Create favorite
    const favorite = await prisma.favorite.create({
      data: {
        userId,
        type: data.type,
        groupId: data.groupId,
        clubId: data.clubId
      },
      include: {
        group: data.type === 'GROUP' ? {
          select: { id: true, title: true, imageUrl: true, category: true }
        } : false,
        club: data.type === 'CLUB' ? {
          select: { id: true, title: true, imageUrl: true, category: true }
        } : false
      }
    });

    res.status(201).json(favorite);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Ungültige Daten', details: error.errors });
    }
    console.error('Error adding favorite:', error);
    res.status(500).json({ error: 'Fehler beim Speichern' });
  }
});

// ============================================
// DELETE /api/favorites/group/:groupId - Remove group from favorites
// ============================================
router.delete('/group/:groupId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { groupId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    const favorite = await prisma.favorite.findFirst({
      where: { userId, groupId }
    });

    if (!favorite) {
      return res.status(404).json({ error: 'Favorit nicht gefunden' });
    }

    await prisma.favorite.delete({ where: { id: favorite.id } });
    res.status(204).send();
  } catch (error) {
    console.error('Error removing favorite:', error);
    res.status(500).json({ error: 'Fehler beim Entfernen' });
  }
});

// ============================================
// DELETE /api/favorites/club/:clubId - Remove club from favorites
// ============================================
router.delete('/club/:clubId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { clubId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    const favorite = await prisma.favorite.findFirst({
      where: { userId, clubId }
    });

    if (!favorite) {
      return res.status(404).json({ error: 'Favorit nicht gefunden' });
    }

    await prisma.favorite.delete({ where: { id: favorite.id } });
    res.status(204).send();
  } catch (error) {
    console.error('Error removing favorite:', error);
    res.status(500).json({ error: 'Fehler beim Entfernen' });
  }
});

// ============================================
// DELETE /api/favorites/:id - Remove by ID
// ============================================
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    const favorite = await prisma.favorite.findUnique({ where: { id } });

    if (!favorite) {
      return res.status(404).json({ error: 'Favorit nicht gefunden' });
    }

    if (favorite.userId !== userId) {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }

    await prisma.favorite.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('Error removing favorite:', error);
    res.status(500).json({ error: 'Fehler beim Entfernen' });
  }
});

// ============================================
// GET /api/favorites/check - Check if item is favorited
// ============================================
router.get('/check', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { type, groupId, clubId } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    const favorite = await prisma.favorite.findFirst({
      where: {
        userId,
        ...(type === 'GROUP' ? { groupId: groupId as string } : {}),
        ...(type === 'CLUB' ? { clubId: clubId as string } : {})
      }
    });

    res.json({ isFavorite: !!favorite, favoriteId: favorite?.id });
  } catch (error) {
    console.error('Error checking favorite:', error);
    res.status(500).json({ error: 'Fehler' });
  }
});

// ============================================
// POST /api/favorites/toggle - Toggle favorite status
// ============================================
router.post('/toggle', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    const data = AddFavoriteSchema.parse(req.body);

    // Check if exists
    const existing = await prisma.favorite.findFirst({
      where: {
        userId,
        ...(data.type === 'GROUP' ? { groupId: data.groupId } : { clubId: data.clubId })
      }
    });

    if (existing) {
      // Remove
      await prisma.favorite.delete({ where: { id: existing.id } });
      return res.json({ isFavorite: false, action: 'removed' });
    } else {
      // Add
      const favorite = await prisma.favorite.create({
        data: {
          userId,
          type: data.type,
          groupId: data.groupId,
          clubId: data.clubId
        }
      });
      return res.status(201).json({ isFavorite: true, action: 'added', favoriteId: favorite.id });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Ungültige Daten' });
    }
    console.error('Error toggling favorite:', error);
    res.status(500).json({ error: 'Fehler' });
  }
});

export default router;