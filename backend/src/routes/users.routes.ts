// backend/src/routes/users.routes.ts
// Jamie App - User Profile API Routes

import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// ============================================
// VALIDATION SCHEMAS
// ============================================
const UpdateProfileSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/).optional(),
  bio: z.string().max(200).optional(),
  avatarUrl: z.string().url().optional(),
  city: z.string().max(50).optional()
});

// ============================================
// GET /api/users/me - Get current user profile
// ============================================
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        bio: true,
        city: true,
        isVerified: true,
        createdAt: true,
        // Include groups user has joined
        participations: {
          where: { status: 'APPROVED' },
          include: {
            group: {
              include: {
                creator: {
                  select: { id: true, username: true, avatarUrl: true }
                },
                participants: {
                  where: { status: 'APPROVED' },
                  select: { id: true }
                }
              }
            }
          },
          orderBy: { joinedAt: 'desc' }
        },
        // Include groups user has created
        createdGroups: {
          where: { isActive: true },
          include: {
            participants: {
              where: { status: 'APPROVED' },
              select: { id: true }
            }
          },
          orderBy: { date: 'asc' }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User nicht gefunden' });
    }

    // Calculate stats
    const stats = {
      groupsJoined: user.participations.length,
      groupsCreated: user.createdGroups.length,
      activitiesAttended: user.participations.filter(
        p => new Date(p.group.date) < new Date()
      ).length
    };

    // Format response
    const response = {
      ...user,
      joinedGroups: user.participations.map(p => ({
        ...p,
        group: {
          ...p.group,
          currentMembers: p.group.participants.length + 1
        }
      })),
      createdGroups: user.createdGroups.map(g => ({
        ...g,
        currentMembers: g.participants.length + 1
      })),
      participations: undefined, // Remove raw data
      stats
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Fehler beim Laden des Profils' });
  }
});

// ============================================
// PUT /api/users/me - Update current user profile
// ============================================
router.put('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    const validated = UpdateProfileSchema.parse(req.body);

    // Check if username is taken (if being updated)
    if (validated.username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username: validated.username,
          NOT: { id: userId }
        }
      });

      if (existingUser) {
        return res.status(409).json({ error: 'Username ist bereits vergeben' });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: validated,
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        bio: true,
        city: true,
        isVerified: true,
        createdAt: true
      }
    });

    res.json(updatedUser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Ungültige Daten', details: error.errors });
    }
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Update fehlgeschlagen' });
  }
});

// ============================================
// GET /api/users/:id - Get user by ID (public profile)
// ============================================
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        bio: true,
        city: true,
        createdAt: true,
        // Only show public info about created groups
        createdGroups: {
          where: { 
            isActive: true,
            date: { gte: new Date() } // Only future events
          },
          include: {
            participants: {
              where: { status: 'APPROVED' },
              select: { id: true }
            }
          },
          take: 5,
          orderBy: { date: 'asc' }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User nicht gefunden' });
    }

    // Format response
    const response = {
      ...user,
      createdGroups: user.createdGroups.map(g => ({
        ...g,
        currentMembers: g.participants.length + 1
      }))
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Fehler beim Laden des Users' });
  }
});

// ============================================
// DELETE /api/users/me - Delete account
// ============================================
router.delete('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    // Delete user (cascade will handle related data)
    await prisma.user.delete({
      where: { id: userId }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Account konnte nicht gelöscht werden' });
  }
});

export const userRoutes = router;