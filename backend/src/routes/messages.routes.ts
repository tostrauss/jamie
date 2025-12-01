// backend/src/routes/messages.routes.ts
import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { getIO, emitToGroup } from '../socket';

const router = Router();
const prisma = new PrismaClient();

// ============================================
// VALIDATION SCHEMAS
// ============================================
const SendMessageSchema = z.object({
  content: z.string()
    .min(1, 'Nachricht darf nicht leer sein')
    .max(1000, 'Nachricht ist zu lang (max. 1000 Zeichen)')
});

const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  before: z.string().datetime().optional(),
  after: z.string().datetime().optional()
});

// ============================================
// GET /api/groups/:groupId/messages - Get messages for a group
// ============================================
router.get('/:groupId/messages', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { groupId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    // Validate pagination params
    const { limit, before, after } = PaginationSchema.parse(req.query);

    // Check if user has access to this group
    const group = await prisma.activityGroup.findUnique({
      where: { id: groupId },
      select: { 
        creatorId: true,
        participants: {
          where: { userId, status: 'APPROVED' },
          select: { id: true }
        }
      }
    });

    if (!group) {
      return res.status(404).json({ error: 'Gruppe nicht gefunden' });
    }

    const isCreator = group.creatorId === userId;
    const isMember = group.participants.length > 0;

    if (!isCreator && !isMember) {
      return res.status(403).json({ error: 'Kein Zugriff auf diese Gruppe' });
    }

    // Build query
    const where: any = { groupId };
    
    if (before) {
      where.createdAt = { ...where.createdAt, lt: new Date(before) };
    }
    if (after) {
      where.createdAt = { ...where.createdAt, gt: new Date(after) };
    }

    // Fetch messages
    const messages = await prisma.message.findMany({
      where,
      include: {
        sender: {
          select: { 
            id: true, 
            username: true, 
            avatarUrl: true 
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    // Get total count for pagination info
    const total = await prisma.message.count({ where: { groupId } });

    // Return in chronological order
    res.json({
      messages: messages.reverse(),
      total,
      hasMore: messages.length === limit
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Ungültige Parameter' });
    }
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Nachrichten konnten nicht geladen werden' });
  }
});

// ============================================
// POST /api/groups/:groupId/messages - Send a message
// ============================================
router.post('/:groupId/messages', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { groupId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    // Validate input
    const { content } = SendMessageSchema.parse(req.body);

    // Check if user has access to this group
    const group = await prisma.activityGroup.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        title: true,
        creatorId: true,
        participants: {
          where: { userId, status: 'APPROVED' },
          select: { id: true }
        }
      }
    });

    if (!group) {
      return res.status(404).json({ error: 'Gruppe nicht gefunden' });
    }

    const isCreator = group.creatorId === userId;
    const isMember = group.participants.length > 0;

    if (!isCreator && !isMember) {
      return res.status(403).json({ error: 'Du bist kein Mitglied dieser Gruppe' });
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        content: content.trim(),
        senderId: userId,
        groupId
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        }
      }
    });

    // Broadcast to group room via Socket
    try {
      emitToGroup(groupId, 'new_message', {
        ...message,
        groupId
      });
    } catch (e) {
      console.error('Socket emit failed:', e);
    }

    // Create notifications for other members (optional, can be heavy)
    // This could be moved to a background job for better performance
    try {
      const otherMembers = await prisma.participant.findMany({
        where: {
          groupId,
          status: 'APPROVED',
          userId: { not: userId }
        },
        select: { userId: true }
      });

      // Include creator if not the sender
      const recipientIds = otherMembers.map(m => m.userId);
      if (group.creatorId !== userId) {
        recipientIds.push(group.creatorId);
      }

      if (recipientIds.length > 0) {
        await prisma.notification.createMany({
          data: recipientIds.map(recipientId => ({
            userId: recipientId,
            type: 'NEW_MESSAGE',
            title: 'Neue Nachricht',
            content: `${message.sender.username} in "${group.title}"`,
            groupId
          })),
          skipDuplicates: true
        });
      }
    } catch (e) {
      // Non-critical, log and continue
      console.error('Failed to create message notifications:', e);
    }

    res.status(201).json(message);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return res.status(400).json({ error: firstError.message });
    }
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Nachricht konnte nicht gesendet werden' });
  }
});

// ============================================
// DELETE /api/groups/:groupId/messages/:messageId - Delete a message
// ============================================
router.delete('/:groupId/messages/:messageId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { groupId, messageId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    // Find message
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        group: {
          select: { creatorId: true }
        }
      }
    });

    if (!message) {
      return res.status(404).json({ error: 'Nachricht nicht gefunden' });
    }

    if (message.groupId !== groupId) {
      return res.status(400).json({ error: 'Nachricht gehört nicht zu dieser Gruppe' });
    }

    // Check permissions: sender or group creator can delete
    const isMessageSender = message.senderId === userId;
    const isGroupCreator = message.group.creatorId === userId;

    if (!isMessageSender && !isGroupCreator) {
      return res.status(403).json({ error: 'Keine Berechtigung zum Löschen' });
    }

    // Delete message
    await prisma.message.delete({ where: { id: messageId } });

    // Broadcast deletion
    try {
      emitToGroup(groupId, 'message_deleted', {
        messageId,
        groupId
      });
    } catch (e) {
      console.error('Socket emit failed:', e);
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Nachricht konnte nicht gelöscht werden' });
  }
});

// ============================================
// GET /api/chats - Get all chat rooms for current user
// ============================================
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    // Get groups where user is creator or approved member
    const [createdGroups, joinedGroups] = await Promise.all([
      // Groups user created
      prisma.activityGroup.findMany({
        where: { 
          creatorId: userId,
          isActive: true
        },
        include: {
          creator: {
            select: { id: true, username: true, avatarUrl: true }
          },
          participants: {
            where: { status: 'APPROVED' },
            select: { id: true }
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              sender: {
                select: { id: true, username: true, avatarUrl: true }
              }
            }
          }
        }
      }),
      // Groups user joined
      prisma.participant.findMany({
        where: { 
          userId,
          status: 'APPROVED'
        },
        include: {
          group: {
            include: {
              creator: {
                select: { id: true, username: true, avatarUrl: true }
              },
              participants: {
                where: { status: 'APPROVED' },
                select: { id: true }
              },
              messages: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                include: {
                  sender: {
                    select: { id: true, username: true, avatarUrl: true }
                  }
                }
              }
            }
          }
        }
      })
    ]);

    // Combine and format
    const chatRooms = [
      ...createdGroups.map(g => ({
        group: {
          id: g.id,
          title: g.title,
          imageUrl: g.imageUrl,
          category: g.category,
          currentMembers: g.participants.length + 1,
          creator: g.creator
        },
        lastMessage: g.messages[0] || null,
        unreadCount: 0 // TODO: Implement read receipts
      })),
      ...joinedGroups.map(p => ({
        group: {
          id: p.group.id,
          title: p.group.title,
          imageUrl: p.group.imageUrl,
          category: p.group.category,
          currentMembers: p.group.participants.length + 1,
          creator: p.group.creator
        },
        lastMessage: p.group.messages[0] || null,
        unreadCount: 0 // TODO: Implement read receipts
      }))
    ];

    // Sort by last message date
    chatRooms.sort((a, b) => {
      const dateA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const dateB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    // Remove duplicates (in case user is both creator and participant somehow)
    const uniqueRooms = chatRooms.filter((room, index, self) =>
      index === self.findIndex(r => r.group.id === room.group.id)
    );

    res.json(uniqueRooms);
  } catch (error) {
    console.error('Error fetching chat rooms:', error);
    res.status(500).json({ error: 'Chats konnten nicht geladen werden' });
  }
});

// ============================================
// POST /api/chats/:groupId/read - Mark messages as read
// ============================================
router.post('/:groupId/read', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { groupId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    // Mark all notifications for this group as read
    await prisma.notification.updateMany({
      where: {
        userId,
        groupId,
        type: 'NEW_MESSAGE',
        isRead: false
      },
      data: { isRead: true }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'Fehler beim Markieren als gelesen' });
  }
});

export const messageRoutes = router;