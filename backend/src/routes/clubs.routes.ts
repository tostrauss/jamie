// backend/src/routes/clubs.routes.ts
import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// ============================================
// VALIDATION SCHEMAS
// ============================================
const CreateClubSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url().optional(),
  category: z.enum(['SPORT', 'PARTY', 'KULTUR', 'NATUR', 'SOCIAL', 'FOOD', 'TRAVEL', 'GAMING', 'OTHER']),
  location: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  isPrivate: z.boolean().optional().default(false)
});

const UpdateClubSchema = CreateClubSchema.partial();

const ClubFiltersSchema = z.object({
  category: z.string().optional(),
  city: z.string().optional(),
  search: z.string().optional(),
  isPrivate: z.boolean().optional(),
  limit: z.coerce.number().min(1).max(50).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0),
  sortBy: z.enum(['members', 'newest', 'name']).optional().default('members')
});

// ============================================
// GET /api/clubs - List all clubs
// ============================================
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const filters = ClubFiltersSchema.parse(req.query);

    // Build where clause
    const where: any = { isActive: true };

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.city) {
      where.city = { contains: filters.city, mode: 'insensitive' };
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    if (filters.isPrivate !== undefined) {
      where.isPrivate = filters.isPrivate;
    }

    // Determine sort order
    let orderBy: any = { memberCount: 'desc' };
    if (filters.sortBy === 'newest') {
      orderBy = { createdAt: 'desc' };
    } else if (filters.sortBy === 'name') {
      orderBy = { title: 'asc' };
    }

    // Fetch clubs
    const [clubs, total] = await Promise.all([
      prisma.club.findMany({
        where,
        orderBy,
        skip: filters.offset,
        take: filters.limit,
        include: {
          creator: {
            select: { id: true, username: true, avatarUrl: true }
          },
          members: {
            where: { status: 'APPROVED' },
            take: 5,
            include: {
              user: { select: { id: true, username: true, avatarUrl: true } }
            }
          },
          _count: {
            select: { members: { where: { status: 'APPROVED' } } }
          }
        }
      }),
      prisma.club.count({ where })
    ]);

    // Transform response
    const transformedClubs = clubs.map(club => ({
      id: club.id,
      title: club.title,
      description: club.description,
      imageUrl: club.imageUrl,
      category: club.category,
      location: club.location,
      city: club.city,
      isPrivate: club.isPrivate,
      memberCount: club._count.members,
      createdAt: club.createdAt,
      creator: club.creator,
      previewMembers: club.members.map(m => m.user),
      isCreator: club.creatorId === userId,
      isMember: club.members.some(m => m.userId === userId)
    }));

    res.json({
      clubs: transformedClubs,
      total,
      hasMore: filters.offset + clubs.length < total
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Ungültige Parameter' });
    }
    console.error('Error fetching clubs:', error);
    res.status(500).json({ error: 'Clubs konnten nicht geladen werden' });
  }
});

// ============================================
// GET /api/clubs/:id - Get single club
// ============================================
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const club = await prisma.club.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, username: true, avatarUrl: true }
        },
        members: {
          where: { status: 'APPROVED' },
          include: {
            user: { select: { id: true, username: true, avatarUrl: true } }
          },
          orderBy: { joinedAt: 'asc' }
        },
        _count: {
          select: { 
            members: { where: { status: 'APPROVED' } },
            posts: true
          }
        }
      }
    });

    if (!club) {
      return res.status(404).json({ error: 'Club nicht gefunden' });
    }

    // Check user membership
    const userMembership = await prisma.clubMember.findUnique({
      where: { userId_clubId: { userId: userId!, clubId: id } }
    });

    res.json({
      ...club,
      memberCount: club._count.members,
      postCount: club._count.posts,
      isCreator: club.creatorId === userId,
      isMember: userMembership?.status === 'APPROVED',
      isPending: userMembership?.status === 'PENDING',
      userRole: userMembership?.role
    });
  } catch (error) {
    console.error('Error fetching club:', error);
    res.status(500).json({ error: 'Club konnte nicht geladen werden' });
  }
});

// ============================================
// POST /api/clubs - Create new club
// ============================================
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    const data = CreateClubSchema.parse(req.body);

    const club = await prisma.club.create({
      data: {
        ...data,
        creatorId: userId,
        memberCount: 1
      },
      include: {
        creator: {
          select: { id: true, username: true, avatarUrl: true }
        }
      }
    });

    // Auto-add creator as OWNER member
    await prisma.clubMember.create({
      data: {
        userId,
        clubId: club.id,
        status: 'APPROVED',
        role: 'OWNER'
      }
    });

    res.status(201).json({
      ...club,
      memberCount: 1,
      isCreator: true,
      isMember: true
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Ungültige Daten', details: error.errors });
    }
    console.error('Error creating club:', error);
    res.status(500).json({ error: 'Club konnte nicht erstellt werden' });
  }
});

// ============================================
// PUT /api/clubs/:id - Update club
// ============================================
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    // Check ownership
    const club = await prisma.club.findUnique({ where: { id } });
    if (!club) {
      return res.status(404).json({ error: 'Club nicht gefunden' });
    }
    if (club.creatorId !== userId) {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }

    const data = UpdateClubSchema.parse(req.body);

    const updated = await prisma.club.update({
      where: { id },
      data,
      include: {
        creator: { select: { id: true, username: true, avatarUrl: true } }
      }
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Ungültige Daten' });
    }
    console.error('Error updating club:', error);
    res.status(500).json({ error: 'Club konnte nicht aktualisiert werden' });
  }
});

// ============================================
// DELETE /api/clubs/:id - Delete club
// ============================================
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const club = await prisma.club.findUnique({ where: { id } });
    if (!club) {
      return res.status(404).json({ error: 'Club nicht gefunden' });
    }
    if (club.creatorId !== userId) {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }

    await prisma.club.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting club:', error);
    res.status(500).json({ error: 'Club konnte nicht gelöscht werden' });
  }
});

// ============================================
// POST /api/clubs/:id/join - Join club
// ============================================
router.post('/:id/join', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    const club = await prisma.club.findUnique({ where: { id } });
    if (!club) {
      return res.status(404).json({ error: 'Club nicht gefunden' });
    }

    // Check if already member
    const existing = await prisma.clubMember.findUnique({
      where: { userId_clubId: { userId, clubId: id } }
    });

    if (existing) {
      return res.status(400).json({ error: 'Bereits Mitglied oder Anfrage gestellt' });
    }

    // Create membership (auto-approve for public clubs)
    const status = club.isPrivate ? 'PENDING' : 'APPROVED';
    
    const membership = await prisma.clubMember.create({
      data: { userId, clubId: id, status }
    });

    // Update member count if approved
    if (status === 'APPROVED') {
      await prisma.club.update({
        where: { id },
        data: { memberCount: { increment: 1 } }
      });
    }

    res.status(201).json({
      status,
      message: status === 'APPROVED' ? 'Willkommen im Club!' : 'Anfrage gesendet'
    });
  } catch (error) {
    console.error('Error joining club:', error);
    res.status(500).json({ error: 'Beitritt fehlgeschlagen' });
  }
});

// ============================================
// DELETE /api/clubs/:id/leave - Leave club
// ============================================
router.delete('/:id/leave', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    const membership = await prisma.clubMember.findUnique({
      where: { userId_clubId: { userId, clubId: id } }
    });

    if (!membership) {
      return res.status(404).json({ error: 'Keine Mitgliedschaft gefunden' });
    }

    if (membership.role === 'OWNER') {
      return res.status(400).json({ error: 'Owner kann Club nicht verlassen. Bitte lösche den Club.' });
    }

    await prisma.clubMember.delete({
      where: { userId_clubId: { userId, clubId: id } }
    });

    // Update member count
    if (membership.status === 'APPROVED') {
      await prisma.club.update({
        where: { id },
        data: { memberCount: { decrement: 1 } }
      });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error leaving club:', error);
    res.status(500).json({ error: 'Verlassen fehlgeschlagen' });
  }
});

// ============================================
// GET /api/clubs/trending - Get trending clubs
// ============================================
router.get('/trending', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const clubs = await prisma.club.findMany({
      where: { isActive: true, isPrivate: false },
      orderBy: { memberCount: 'desc' },
      take: 10,
      include: {
        creator: { select: { id: true, username: true, avatarUrl: true } }
      }
    });

    res.json(clubs);
  } catch (error) {
    console.error('Error fetching trending clubs:', error);
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});

export default router;