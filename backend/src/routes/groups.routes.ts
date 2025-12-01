// backend/src/routes/groups.routes.ts
// Jamie App - Activity Groups API Routes
import { getIO } from '@/socket';
import { Router, Request, Response } from 'express';
import { PrismaClient, ActivityCategory, ParticipantStatus } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// ============================================
// VALIDATION SCHEMAS
// ============================================
const CreateGroupSchema = z.object({
  title: z.string().min(5).max(60),
  description: z.string().max(500).optional().default(''),
  category: z.nativeEnum(ActivityCategory),
  location: z.string().min(1).max(100),
  city: z.string().min(1).max(50),
  date: z.string().datetime(),
  maxMembers: z.number().int().min(2).max(50).optional().default(10),
  imageUrl: z.string().url().optional(),
  avatarSeeds: z.array(z.number()).optional()
});

const UpdateGroupSchema = CreateGroupSchema.partial().extend({
  isActive: z.boolean().optional()
});

const JoinGroupSchema = z.object({
  message: z.string().max(200).optional()
});

// ============================================
// GET /api/groups - Get all groups with filters
// ============================================
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, city, search, dateFrom, dateTo } = req.query;

    const where: any = {
      isActive: true,
      date: { gte: new Date() } // Only future events by default
    };

    if (category) {
      where.category = category as ActivityCategory;
    }

    if (city) {
      where.city = city as string;
    }

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (dateFrom) {
      where.date = { ...where.date, gte: new Date(dateFrom as string) };
    }

    if (dateTo) {
      where.date = { ...where.date, lte: new Date(dateTo as string) };
    }

    const groups = await prisma.activityGroup.findMany({
      where,
      include: {
        creator: {
          select: { id: true, username: true, avatarUrl: true }
        },
        participants: {
          where: { status: 'APPROVED' },
          select: { id: true }
        }
      },
      orderBy: { date: 'asc' }
    });

    // Format response with member count
    const formattedGroups = groups.map(g => ({
      ...g,
      currentMembers: g.participants.length + 1, // +1 for creator
      participants: undefined // Don't expose full participant list
    }));

    res.json(formattedGroups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Konnte Gruppen nicht laden' });
  }
});

// ============================================
// GET /api/groups/:id - Get single group
// ============================================
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const group = await prisma.activityGroup.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, username: true, avatarUrl: true }
        },
        participants: {
          where: { status: 'APPROVED' },
          include: {
            user: {
              select: { id: true, username: true, avatarUrl: true }
            }
          }
        }
      }
    });

    if (!group) {
      return res.status(404).json({ error: 'Gruppe nicht gefunden' });
    }

    res.json({
      ...group,
      currentMembers: group.participants.length + 1
    });
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ error: 'Konnte Gruppe nicht laden' });
  }
});

// ============================================
// POST /api/groups - Create new group
// ============================================
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    const validated = CreateGroupSchema.parse(req.body);

    // Generate random avatar seeds if not provided
    const avatarSeeds = validated.avatarSeeds || 
      Array.from({ length: 3 }, () => Math.floor(Math.random() * 10000));

    const newGroup = await prisma.activityGroup.create({
      data: {
        title: validated.title,
        description: validated.description,
        category: validated.category,
        location: validated.location,
        city: validated.city,
        date: new Date(validated.date),
        maxMembers: validated.maxMembers,
        imageUrl: validated.imageUrl,
        avatarSeeds,
        creatorId: userId
      },
      include: {
        creator: {
          select: { id: true, username: true, avatarUrl: true }
        }
      }
    });
    const groupResponse = { ...newGroup, currentMembers: 1 };

    // 🔥 REAL-TIME UPDATE: Allen Clients Bescheid geben!
    try {
      getIO().emit('group_created', groupResponse);
    } catch (e) {
      console.error('Socket emit failed:', e);
    }

    res.status(201).json(groupResponse);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Ungültige Daten', details: error.errors });
    }
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Konnte Gruppe nicht erstellen' });
  }
});

// ============================================
// PUT /api/groups/:id - Update group
// ============================================
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    // Check ownership
    const group = await prisma.activityGroup.findUnique({
      where: { id },
      select: { creatorId: true }
    });

    if (!group) {
      return res.status(404).json({ error: 'Gruppe nicht gefunden' });
    }

    if (group.creatorId !== userId) {
      return res.status(403).json({ error: 'Nur der Ersteller kann die Gruppe bearbeiten' });
    }

    const validated = UpdateGroupSchema.parse(req.body);

    const updatedGroup = await prisma.activityGroup.update({
      where: { id },
      data: {
        ...validated,
        date: validated.date ? new Date(validated.date) : undefined
      },
      include: {
        creator: {
          select: { id: true, username: true, avatarUrl: true }
        },
        participants: {
          where: { status: 'APPROVED' },
          select: { id: true }
        }
      }
    });

    res.json({
      ...updatedGroup,
      currentMembers: updatedGroup.participants.length + 1
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Ungültige Daten', details: error.errors });
    }
    console.error('Error updating group:', error);
    res.status(500).json({ error: 'Konnte Gruppe nicht aktualisieren' });
  }
});

// ============================================
// DELETE /api/groups/:id - Delete group
// ============================================
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const group = await prisma.activityGroup.findUnique({
      where: { id },
      select: { creatorId: true }
    });

    if (!group) {
      return res.status(404).json({ error: 'Gruppe nicht gefunden' });
    }

    if (group.creatorId !== userId) {
      return res.status(403).json({ error: 'Nur der Ersteller kann die Gruppe löschen' });
    }

    await prisma.activityGroup.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ error: 'Konnte Gruppe nicht löschen' });
  }
});

// ============================================
// POST /api/groups/:id/join - Join a group
// ============================================
router.post('/:id/join', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    const validated = JoinGroupSchema.parse(req.body);

    // Check if group exists and has space
    const group = await prisma.activityGroup.findUnique({
      where: { id },
      include: {
        participants: {
          where: { status: 'APPROVED' }
        }
      }
    });

    if (!group) {
      return res.status(404).json({ error: 'Gruppe nicht gefunden' });
    }

    if (group.creatorId === userId) {
      return res.status(400).json({ error: 'Du bist bereits der Ersteller dieser Gruppe' });
    }

    if (group.participants.length + 1 >= group.maxMembers) {
      return res.status(400).json({ error: 'Gruppe ist bereits voll' });
    }

    // Check if already a participant
    const existingParticipant = await prisma.participant.findUnique({
      where: {
        userId_groupId: { userId, groupId: id }
      }
    });

    if (existingParticipant) {
      return res.status(400).json({ 
        error: existingParticipant.status === 'PENDING' 
          ? 'Anfrage wurde bereits gesendet' 
          : 'Du bist bereits Mitglied'
      });
    }

    const participant = await prisma.participant.create({
      data: {
        userId,
        groupId: id,
        message: validated.message,
        status: 'PENDING'
      },
      include: {
        user: {
          select: { id: true, username: true, avatarUrl: true }
        }
      }
    });

    // TODO: Create notification for group creator

    res.status(201).json(participant);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Ungültige Daten', details: error.errors });
    }
    console.error('Error joining group:', error);
    res.status(500).json({ error: 'Konnte Anfrage nicht senden' });
  }
});

// ============================================
// DELETE /api/groups/:id/leave - Leave a group
// ============================================
router.delete('/:id/leave', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    const participant = await prisma.participant.findUnique({
      where: {
        userId_groupId: { userId, groupId: id }
      }
    });

    if (!participant) {
      return res.status(404).json({ error: 'Du bist kein Mitglied dieser Gruppe' });
    }

    await prisma.participant.delete({
      where: { id: participant.id }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error leaving group:', error);
    res.status(500).json({ error: 'Konnte Gruppe nicht verlassen' });
  }
});

// ============================================
// GET /api/groups/:id/participants - Get participants
// ============================================
router.get('/:id/participants', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    // Check if user is creator (only creator can see all participants including pending)
    const group = await prisma.activityGroup.findUnique({
      where: { id },
      select: { creatorId: true }
    });

    if (!group) {
      return res.status(404).json({ error: 'Gruppe nicht gefunden' });
    }

    const isCreator = group.creatorId === userId;

    const participants = await prisma.participant.findMany({
      where: {
        groupId: id,
        // Non-creators only see approved participants
        ...(isCreator ? {} : { status: 'APPROVED' })
      },
      include: {
        user: {
          select: { id: true, username: true, avatarUrl: true }
        }
      },
      orderBy: { joinedAt: 'asc' }
    });

    res.json(participants);
  } catch (error) {
    console.error('Error fetching participants:', error);
    res.status(500).json({ error: 'Konnte Teilnehmer nicht laden' });
  }
});

// ============================================
// PUT /api/groups/:id/participants/:participantId - Update participant status
// ============================================
router.put('/:id/participants/:participantId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id, participantId } = req.params;
    const { status } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Ungültiger Status' });
    }

    // Check ownership
    const group = await prisma.activityGroup.findUnique({
      where: { id },
      select: { creatorId: true }
    });

    if (!group) {
      return res.status(404).json({ error: 'Gruppe nicht gefunden' });
    }

    if (group.creatorId !== userId) {
      return res.status(403).json({ error: 'Nur der Ersteller kann Anfragen verwalten' });
    }

    const updatedParticipant = await prisma.participant.update({
      where: { id: participantId },
      data: { status: status as ParticipantStatus },
      include: {
        user: {
          select: { id: true, username: true, avatarUrl: true }
        }
      }
    });

    // TODO: Create notification for participant

    res.json(updatedParticipant);
  } catch (error) {
    console.error('Error updating participant:', error);
    res.status(500).json({ error: 'Konnte Status nicht aktualisieren' });
  }
});

export const groupRoutes = router;