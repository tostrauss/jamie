// backend/src/routes/notifications.routes.ts
import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { emitToUser } from '../socket';

const router = Router();
const prisma = new PrismaClient();

// ============================================
// TYPES
// ============================================
type NotificationType = 
  | 'JOIN_REQUEST'      // Someone wants to join your group
  | 'REQUEST_APPROVED'  // Your join request was approved
  | 'REQUEST_REJECTED'  // Your join request was rejected
  | 'NEW_MESSAGE'       // New message in a group
  | 'GROUP_UPDATED'     // Group details changed
  | 'GROUP_DELETED'     // Group was deleted
  | 'MEMBER_LEFT'       // Someone left your group
  | 'REMINDER';         // Event reminder

// ============================================
// VALIDATION SCHEMAS
// ============================================
const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  unreadOnly: z.coerce.boolean().default(false)
});

const MarkReadSchema = z.object({
  notificationIds: z.array(z.string().uuid()).min(1).max(100)
});

// ============================================
// GET /api/notifications - Get user's notifications
// ============================================
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    const { limit, offset, unreadOnly } = PaginationSchema.parse(req.query);

    const where: any = { userId };
    if (unreadOnly) {
      where.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          group: {
            select: {
              id: true,
              title: true,
              imageUrl: true,
              category: true
            }
          }
        }
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } })
    ]);

    res.json({
      notifications,
      total,
      unreadCount,
      hasMore: offset + notifications.length < total
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Ungültige Parameter' });
    }
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Benachrichtigungen konnten nicht geladen werden' });
  }
});

// ============================================
// GET /api/notifications/unread-count - Get unread count only
// ============================================
router.get('/unread-count', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    const count = await prisma.notification.count({
      where: { userId, isRead: false }
    });

    res.json({ count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});

// ============================================
// PUT /api/notifications/read - Mark notifications as read
// ============================================
router.put('/read', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    const { notificationIds } = MarkReadSchema.parse(req.body);

    // Only update notifications that belong to this user
    const result = await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId
      },
      data: { isRead: true }
    });

    res.json({ 
      success: true, 
      updated: result.count 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Ungültige Notification IDs' });
    }
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ error: 'Fehler beim Markieren' });
  }
});

// ============================================
// PUT /api/notifications/read-all - Mark all as read
// ============================================
router.put('/read-all', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });

    res.json({ 
      success: true, 
      updated: result.count 
    });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ error: 'Fehler beim Markieren' });
  }
});

// ============================================
// DELETE /api/notifications/:id - Delete a notification
// ============================================
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    // Find notification
    const notification = await prisma.notification.findUnique({
      where: { id }
    });

    if (!notification) {
      return res.status(404).json({ error: 'Benachrichtigung nicht gefunden' });
    }

    if (notification.userId !== userId) {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }

    await prisma.notification.delete({ where: { id } });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Fehler beim Löschen' });
  }
});

// ============================================
// DELETE /api/notifications - Delete all notifications
// ============================================
router.delete('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    const result = await prisma.notification.deleteMany({
      where: { userId }
    });

    res.json({ 
      success: true, 
      deleted: result.count 
    });
  } catch (error) {
    console.error('Error deleting all notifications:', error);
    res.status(500).json({ error: 'Fehler beim Löschen' });
  }
});

// ============================================
// HELPER: Create notification (for internal use)
// ============================================
export const createNotification = async (data: {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  groupId?: string;
}): Promise<void> => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        content: data.content,
        groupId: data.groupId
      },
      include: {
        group: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
            category: true
          }
        }
      }
    });

    // Push via Socket
    emitToUser(data.userId, 'notification', notification);
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

// ============================================
// HELPER: Create multiple notifications
// ============================================
export const createBulkNotifications = async (
  userIds: string[],
  data: {
    type: NotificationType;
    title: string;
    content: string;
    groupId?: string;
  }
): Promise<void> => {
  try {
    await prisma.notification.createMany({
      data: userIds.map(userId => ({
        userId,
        type: data.type,
        title: data.title,
        content: data.content,
        groupId: data.groupId
      }))
    });

    // Push via Socket to each user
    const notifications = await prisma.notification.findMany({
      where: {
        userId: { in: userIds },
        type: data.type,
        groupId: data.groupId
      },
      orderBy: { createdAt: 'desc' },
      take: userIds.length,
      include: {
        group: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
            category: true
          }
        }
      }
    });

    notifications.forEach(notification => {
      emitToUser(notification.userId, 'notification', notification);
    });
  } catch (error) {
    console.error('Error creating bulk notifications:', error);
  }
};

// ============================================
// HELPER: Delete notifications for a group
// ============================================
export const deleteGroupNotifications = async (groupId: string): Promise<void> => {
  try {
    await prisma.notification.deleteMany({
      where: { groupId }
    });
  } catch (error) {
    console.error('Error deleting group notifications:', error);
  }
};

export const notificationRoutes = router;