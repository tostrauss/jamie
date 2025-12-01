// backend/src/routes/users.routes.ts
import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { authenticateToken, AuthRequest, optionalAuth } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// ============================================
// VALIDATION SCHEMAS
// ============================================
const UpdateProfileSchema = z.object({
  username: z.string()
    .min(3, 'Benutzername muss mindestens 3 Zeichen haben')
    .max(30, 'Benutzername darf maximal 30 Zeichen haben')
    .regex(/^[a-zA-Z0-9_]+$/, 'Nur Buchstaben, Zahlen und Unterstriche erlaubt')
    .optional(),
  bio: z.string()
    .max(500, 'Bio darf maximal 500 Zeichen haben')
    .optional()
    .nullable(),
  city: z.string()
    .min(1, 'Stadt darf nicht leer sein')
    .max(50, 'Stadt darf maximal 50 Zeichen haben')
    .optional()
    .nullable(),
  avatarUrl: z.string()
    .url('Ungültige Avatar-URL')
    .max(500)
    .optional()
    .nullable()
});

const DeleteAccountSchema = z.object({
  password: z.string().min(1, 'Passwort erforderlich')
});

// ============================================
// HELPER FUNCTIONS
// ============================================
function sanitizeUser(user: any, includePrivate: boolean = false) {
  const { passwordHash, refreshTokens, resetToken, resetTokenExpiry, ...publicData } = user;
  
  if (!includePrivate) {
    const { email, ...publicOnly } = publicData;
    return publicOnly;
  }
  
  return publicData;
}

function calculateUserStats(user: any) {
  return {
    groupsCreated: user._count?.createdGroups || 0,
    groupsJoined: user._count?.participations || 0,
    memberSince: user.createdAt
  };
}

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
      include: {
        _count: {
          select: {
            createdGroups: true,
            participations: {
              where: { status: 'APPROVED' }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    }

    res.json({
      ...sanitizeUser(user, true),
      stats: calculateUserStats(user)
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Profil konnte nicht geladen werden' });
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

    const data = UpdateProfileSchema.parse(req.body);

    // Check username uniqueness if changing
    if (data.username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username: data.username.toLowerCase(),
          id: { not: userId }
        }
      });

      if (existingUser) {
        return res.status(409).json({ error: 'Benutzername bereits vergeben' });
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.username && { username: data.username }),
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
        updatedAt: new Date()
      },
      include: {
        _count: {
          select: {
            createdGroups: true,
            participations: {
              where: { status: 'APPROVED' }
            }
          }
        }
      }
    });

    console.log(`✅ Profile updated: ${updatedUser.username}`);

    res.json({
      ...sanitizeUser(updatedUser, true),
      stats: calculateUserStats(updatedUser)
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return res.status(400).json({ error: firstError.message });
    }
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Profil konnte nicht aktualisiert werden' });
  }
});

// ============================================
// POST /api/users/me/avatar - Upload avatar
// ============================================
router.post('/me/avatar', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    // For now, accept URL directly
    // In production, integrate with file upload service (S3, Cloudinary, etc.)
    const { avatarUrl } = z.object({
      avatarUrl: z.string().url('Ungültige URL').max(500)
    }).parse(req.body);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl }
    });

    res.json({ avatarUrl: updatedUser.avatarUrl });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Ungültige Avatar-URL' });
    }
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: 'Avatar konnte nicht aktualisiert werden' });
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

    const { password } = DeleteAccountSchema.parse(req.body);

    // Verify password
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Passwort ist falsch' });
    }

    // Delete in transaction
    await prisma.$transaction(async (tx) => {
      // Delete user's messages
      await tx.message.deleteMany({ where: { senderId: userId } });

      // Delete user's notifications
      await tx.notification.deleteMany({ where: { userId } });

      // Delete user's participations
      await tx.participant.deleteMany({ where: { userId } });

      // Delete groups created by user (and their messages, participants)
      const userGroups = await tx.activityGroup.findMany({
        where: { creatorId: userId },
        select: { id: true }
      });

      for (const group of userGroups) {
        await tx.message.deleteMany({ where: { groupId: group.id } });
        await tx.participant.deleteMany({ where: { groupId: group.id } });
        await tx.notification.deleteMany({ where: { groupId: group.id } });
      }

      await tx.activityGroup.deleteMany({ where: { creatorId: userId } });

      // Finally delete user
      await tx.user.delete({ where: { id: userId } });
    });

    console.log(`🗑️ Account deleted: ${user.email}`);

    res.status(204).send();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Passwort erforderlich' });
    }
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Account konnte nicht gelöscht werden' });
  }
});

// ============================================
// GET /api/users/:id - Get user profile (public)
// ============================================
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.userId;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            createdGroups: {
              where: { isActive: true }
            },
            participations: {
              where: { status: 'APPROVED' }
            }
          }
        },
        createdGroups: {
          where: { isActive: true },
          orderBy: { date: 'asc' },
          take: 6,
          select: {
            id: true,
            title: true,
            imageUrl: true,
            category: true,
            date: true,
            city: true,
            maxMembers: true,
            _count: {
              select: {
                participants: {
                  where: { status: 'APPROVED' }
                }
              }
            }
          }
        }
      }
    });

    if (!user || !user.isActive) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    }

    // Check if current user is viewing their own profile
    const isOwnProfile = currentUserId === id;

    // Format groups
    const groups = user.createdGroups.map(g => ({
      id: g.id,
      title: g.title,
      imageUrl: g.imageUrl,
      category: g.category,
      date: g.date,
      city: g.city,
      maxMembers: g.maxMembers,
      currentMembers: g._count.participants + 1
    }));

    res.json({
      ...sanitizeUser(user, isOwnProfile),
      stats: calculateUserStats(user),
      recentGroups: groups,
      isOwnProfile
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Benutzer konnte nicht geladen werden' });
  }
});

// ============================================
// GET /api/users/:id/groups - Get user's groups
// ============================================
router.get('/:id/groups', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { type = 'created', limit = '20', offset = '0' } = req.query;

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, isActive: true }
    });

    if (!user || !user.isActive) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    }

    let groups: any[] = [];
    let total = 0;

    if (type === 'created') {
      // Groups created by user
      [groups, total] = await Promise.all([
        prisma.activityGroup.findMany({
          where: { creatorId: id, isActive: true },
          orderBy: { date: 'desc' },
          take: parseInt(limit as string),
          skip: parseInt(offset as string),
          include: {
            creator: {
              select: { id: true, username: true, avatarUrl: true }
            },
            _count: {
              select: {
                participants: { where: { status: 'APPROVED' } }
              }
            }
          }
        }),
        prisma.activityGroup.count({
          where: { creatorId: id, isActive: true }
        })
      ]);
    } else if (type === 'joined') {
      // Groups user joined
      const participations = await prisma.participant.findMany({
        where: { userId: id, status: 'APPROVED' },
        orderBy: { joinedAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
        include: {
          group: {
            include: {
              creator: {
                select: { id: true, username: true, avatarUrl: true }
              },
              _count: {
                select: {
                  participants: { where: { status: 'APPROVED' } }
                }
              }
            }
          }
        }
      });

      groups = participations.map(p => p.group).filter(g => g.isActive);
      total = await prisma.participant.count({
        where: { userId: id, status: 'APPROVED' }
      });
    }

    // Format groups
    const formattedGroups = groups.map(g => ({
      id: g.id,
      title: g.title,
      description: g.description,
      imageUrl: g.imageUrl,
      category: g.category,
      location: g.location,
      city: g.city,
      date: g.date,
      maxMembers: g.maxMembers,
      currentMembers: g._count.participants + 1,
      creator: g.creator
    }));

    res.json({
      groups: formattedGroups,
      total,
      hasMore: parseInt(offset as string) + groups.length < total
    });
  } catch (error) {
    console.error('Get user groups error:', error);
    res.status(500).json({ error: 'Gruppen konnten nicht geladen werden' });
  }
});

// ============================================
// GET /api/users/me/stats - Get detailed stats
// ============================================
router.get('/me/stats', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    const [
      groupsCreated,
      groupsJoined,
      pendingRequests,
      messagesSent,
      upcomingEvents
    ] = await Promise.all([
      prisma.activityGroup.count({
        where: { creatorId: userId, isActive: true }
      }),
      prisma.participant.count({
        where: { userId, status: 'APPROVED' }
      }),
      prisma.participant.count({
        where: { userId, status: 'PENDING' }
      }),
      prisma.message.count({
        where: { senderId: userId }
      }),
      prisma.activityGroup.count({
        where: {
          date: { gte: new Date() },
          OR: [
            { creatorId: userId },
            {
              participants: {
                some: { userId, status: 'APPROVED' }
              }
            }
          ]
        }
      })
    ]);

    res.json({
      groupsCreated,
      groupsJoined,
      pendingRequests,
      messagesSent,
      upcomingEvents,
      totalGroups: groupsCreated + groupsJoined
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Statistiken konnten nicht geladen werden' });
  }
});

// ============================================
// PUT /api/users/me/settings - Update settings
// ============================================
router.put('/me/settings', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    const SettingsSchema = z.object({
      emailNotifications: z.boolean().optional(),
      pushNotifications: z.boolean().optional(),
      profileVisibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
      showEmail: z.boolean().optional(),
      showCity: z.boolean().optional()
    });

    const settings = SettingsSchema.parse(req.body);

    // Update user settings (assuming settings JSON field or separate table)
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        settings: settings as any
      }
    });

    res.json({ 
      message: 'Einstellungen gespeichert',
      settings: updatedUser.settings 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Ungültige Einstellungen' });
    }
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Einstellungen konnten nicht gespeichert werden' });
  }
});

// ============================================
// GET /api/users/search - Search users
// ============================================
router.get('/search', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { q, limit = '10' } = req.query;

    if (!q || typeof q !== 'string' || q.length < 2) {
      return res.status(400).json({ error: 'Suchbegriff zu kurz (min. 2 Zeichen)' });
    }

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } }
        ]
      },
      take: Math.min(parseInt(limit as string), 20),
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        city: true
      }
    });

    res.json(users);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Suche fehlgeschlagen' });
  }
});

export const userRoutes = router;