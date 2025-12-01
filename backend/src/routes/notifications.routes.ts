// backend/src/routes/notifications.routes.ts
import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { getIO } from '../socket';

const router = Router();
const prisma = new PrismaClient();

// ============================================
// TYPES
// ============================================
type NotificationType = 
  | 'JOIN_REQUEST' 
  | 'REQUEST_APPROVED' 
  | 'REQUEST_REJECTED'
  | 'NEW_MESSAGE' 
  | 'GROUP_UPDATED'
  | 'GROUP_DELETED'
  | 'MEMBER_JOINED'
  | 'MEMBER_LEFT'
  | 'FRIEND_REQUEST'
  | 'FRIEND_ACCEPTED'
  | 'CLUB_INVITE'
  | 'MENTION'
  | 'SYSTEM';

// ============================================
// VALIDATION SCHEMAS
// ============================================
const CreateNotificationSchema = z.object({
  type: z.enum([
    'JOIN_REQUEST', 'REQUEST_APPROVED', 'REQUEST_REJECTED',
    'NEW_MESSAGE', 'GROUP_UPDATED', 'GROUP_DELETED',
    'MEMBER_JOINED', 'MEMBER_LEFT', 'FRIEND_REQUEST',
    'FRIEND_ACCEPTED', 'CLUB_INVITE', 'MENTION', 'SYSTEM'
  ]),
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
  recipientId: z.string().uuid(),
  imageUrl: z.string().url().optional(),
  groupId: z.string().uuid().optional(),
  clubId: z.string().uuid().optional(),
  senderId: z.string().uuid().optional(),
  actionData: z.record(z.any()).optional()
});

const NotificationFiltersSchema = z.object({
  limit: z.coerce.number().min(1).max(50).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0),
  unreadOnly: z.coerce.boolean().optional().default(false),
  type: z.string().optional()
});

// ============================================
// HELPER: Send real-time notification
// ============================================
async function sendRealtimeNotification(userId: string, notification: any): Promise<void> {
  try {
    const io = getIO();
    io.to(`user:${userId}`).emit('notification', notification);
  } catch (error) {
    console.error('Error sending realtime notification:', error);
  }
}

// ============================================
// HELPER: Create and send notification
// ============================================
export async function createNotification(data: {
  type: NotificationType;
  title: string;
  message: string;
  recipientId: string;
  imageUrl?: string;
  groupId?: string;
  clubId?: string;
  senderId?: string;
  actionData?: Record<string, any>;
}): Promise<any> {
  const notification = await prisma.notification.create({
    data: {
      type: data.type,
      title: data.title,
      message: data.message,
      imageUrl: data.imageUrl,
      groupId: data.groupId,
      clubId: data.clubId,
      senderId: data.senderId,
      actionData: data.actionData ? JSON.stringify(data.actionData) : null,
      recipientId: data.recipientId,
      isRead: false
    }
  });

  // Send real-time notification
  await sendRealtimeNotification(data.recipientId, {
    ...notification,
    actionData: data.actionData
  });

  return notification;
}

// ============================================
// GET /api/notifications - Get user's notifications
// ============================================
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    const filters = NotificationFiltersSchema.parse(req.query);

    // Build where clause
    const where: any = { recipientId: userId };

    if (filters.unreadOnly) {
      where.isRead = false;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    // Fetch notifications
    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: filters.offset,
        take: filters.limit,
        include: {
          group: {
            select: { id: true, title: true, imageUrl: true }
          },
          club: {
            select: { id: true, title: true, imageUrl: true }
          },
          sender: {
            select: { id: true, username: true, avatarUrl: true }
          }
        }
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { recipientId: userId, isRead: false } })
    ]);

    // Transform response
    const transformedNotifications = notifications.map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      imageUrl: n.imageUrl || n.sender?.avatarUrl || n.group?.imageUrl || n.club?.imageUrl,
      isRead: n.isRead,
      createdAt: n.createdAt,
      groupId: n.groupId,
      clubId: n.clubId,
      userId: n.senderId,
      actionData: n.actionData ? JSON.parse(n.actionData as string) : null,
      group: n.group,
      club: n.club,
      sender: n.sender
    }));

    res.json({
      notifications: transformedNotifications,
      total,
      unreadCount,
      hasMore: filters.offset + notifications.length < total
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
// GET /api/notifications/unread-count - Get unread count
// ============================================
router.get('/unread-count', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    const count = await prisma.notification.count({
      where: { recipientId: userId, isRead: false }
    });

    res.json({ count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ error: 'Fehler' });
  }
});

// ============================================
// GET /api/notifications/:id - Get single notification
// ============================================
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    const notification = await prisma.notification.findUnique({
      where: { id },
      include: {
        group: { select: { id: true, title: true, imageUrl: true } },
        club: { select: { id: true, title: true, imageUrl: true } },
        sender: { select: { id: true, username: true, avatarUrl: true } }
      }
    });

    if (!notification) {
      return res.status(404).json({ error: 'Benachrichtigung nicht gefunden' });
    }

    if (notification.recipientId !== userId) {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }

    res.json({
      ...notification,
      actionData: notification.actionData ? JSON.parse(notification.actionData as string) : null
    });
  } catch (error) {
    console.error('Error fetching notification:', error);
    res.status(500).json({ error: 'Fehler' });
  }
});

// ============================================
// POST /api/notifications - Create notification (internal/admin)
// ============================================
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const data = CreateNotificationSchema.parse(req.body);

    const notification = await createNotification(data);

    res.status(201).json(notification);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Ungültige Daten', details: error.errors });
    }
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen' });
  }
});

// ============================================
// PATCH /api/notifications/:id/read - Mark as read
// ============================================
router.patch('/:id/read', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    const notification = await prisma.notification.findUnique({ where: { id } });

    if (!notification) {
      return res.status(404).json({ error: 'Benachrichtigung nicht gefunden' });
    }

    if (notification.recipientId !== userId) {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }

    await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Fehler' });
  }
});

// ============================================
// PATCH /api/notifications/read-all - Mark all as read
// ============================================
router.patch('/read-all', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    const result = await prisma.notification.updateMany({
      where: { recipientId: userId, isRead: false },
      data: { isRead: true }
    });

    res.json({ success: true, count: result.count });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ error: 'Fehler' });
  }
});

// ============================================
// DELETE /api/notifications/:id - Delete notification
// ============================================
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    const notification = await prisma.notification.findUnique({ where: { id } });

    if (!notification) {
      return res.status(404).json({ error: 'Benachrichtigung nicht gefunden' });
    }

    if (notification.recipientId !== userId) {
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
      where: { recipientId: userId }
    });

    res.json({ success: true, count: result.count });
  } catch (error) {
    console.error('Error deleting all notifications:', error);
    res.status(500).json({ error: 'Fehler beim Löschen' });
  }
});

// ============================================
// POST /api/notifications/send-to-group - Send to all group members
// ============================================
router.post('/send-to-group', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { groupId, type, title, message, excludeSender } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    // Get group members
    const participants = await prisma.participant.findMany({
      where: { 
        groupId, 
        status: 'APPROVED',
        ...(excludeSender ? { userId: { not: userId } } : {})
      },
      select: { userId: true }
    });

    // Get sender info
    const sender = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, avatarUrl: true }
    });

    // Get group info
    const group = await prisma.activityGroup.findUnique({
      where: { id: groupId },
      select: { title: true, imageUrl: true }
    });

    // Create notifications for all members
    const notifications = await Promise.all(
      participants.map(p => 
        createNotification({
          type,
          title,
          message,
          recipientId: p.userId,
          groupId,
          senderId: userId,
          imageUrl: sender?.avatarUrl || group?.imageUrl
        })
      )
    );

    res.status(201).json({ 
      success: true, 
      count: notifications.length 
    });
  } catch (error) {
    console.error('Error sending group notifications:', error);
    res.status(500).json({ error: 'Fehler beim Senden' });
  }
});

// ============================================
// POST /api/notifications/send-to-club - Send to all club members
// ============================================
router.post('/send-to-club', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { clubId, type, title, message, excludeSender } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    // Get club members
    const members = await prisma.clubMember.findMany({
      where: { 
        clubId, 
        status: 'APPROVED',
        ...(excludeSender ? { userId: { not: userId } } : {})
      },
      select: { userId: true }
    });

    // Get sender info
    const sender = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, avatarUrl: true }
    });

    // Create notifications for all members
    const notifications = await Promise.all(
      members.map(m => 
        createNotification({
          type,
          title,
          message,
          recipientId: m.userId,
          clubId,
          senderId: userId,
          imageUrl: sender?.avatarUrl
        })
      )
    );

    res.status(201).json({ 
      success: true, 
      count: notifications.length 
    });
  } catch (error) {
    console.error('Error sending club notifications:', error);
    res.status(500).json({ error: 'Fehler beim Senden' });
  }
});

export default router;

// ============================================
// NOTIFICATION HELPERS (export for use in other routes)
// ============================================
export const NotificationHelpers = {
  // Send join request notification to group creator
  async sendJoinRequest(groupId: string, requesterId: string): Promise<void> {
    const group = await prisma.activityGroup.findUnique({
      where: { id: groupId },
      include: { creator: true }
    });
    
    const requester = await prisma.user.findUnique({
      where: { id: requesterId }
    });

    if (group && requester) {
      await createNotification({
        type: 'JOIN_REQUEST',
        title: `${requester.username} möchte beitreten`,
        message: `${requester.username} hat eine Anfrage für "${group.title}" gesendet.`,
        recipientId: group.creatorId,
        groupId,
        senderId: requesterId,
        imageUrl: requester.avatarUrl || undefined,
        actionData: { userId: requesterId }
      });
    }
  },

  // Send approval notification to requester
  async sendRequestApproved(groupId: string, userId: string): Promise<void> {
    const group = await prisma.activityGroup.findUnique({
      where: { id: groupId }
    });

    if (group) {
      await createNotification({
        type: 'REQUEST_APPROVED',
        title: 'Anfrage angenommen! 🎉',
        message: `Du wurdest zu "${group.title}" hinzugefügt.`,
        recipientId: userId,
        groupId,
        imageUrl: group.imageUrl || undefined
      });
    }
  },

  // Send rejection notification to requester
  async sendRequestRejected(groupId: string, userId: string): Promise<void> {
    const group = await prisma.activityGroup.findUnique({
      where: { id: groupId }
    });

    if (group) {
      await createNotification({
        type: 'REQUEST_REJECTED',
        title: 'Anfrage abgelehnt',
        message: `Deine Anfrage für "${group.title}" wurde leider abgelehnt.`,
        recipientId: userId,
        groupId
      });
    }
  },

  // Send new member notification to group
  async sendMemberJoined(groupId: string, newMemberId: string): Promise<void> {
    const group = await prisma.activityGroup.findUnique({
      where: { id: groupId },
      include: { 
        participants: { 
          where: { status: 'APPROVED', userId: { not: newMemberId } },
          select: { userId: true }
        }
      }
    });

    const newMember = await prisma.user.findUnique({
      where: { id: newMemberId }
    });

    if (group && newMember) {
      await Promise.all(
        group.participants.map(p =>
          createNotification({
            type: 'MEMBER_JOINED',
            title: 'Neues Mitglied',
            message: `${newMember.username} ist "${group.title}" beigetreten.`,
            recipientId: p.userId,
            groupId,
            senderId: newMemberId,
            imageUrl: newMember.avatarUrl || undefined
          })
        )
      );
    }
  },

  // Send friend request notification
  async sendFriendRequest(fromUserId: string, toUserId: string): Promise<void> {
    const fromUser = await prisma.user.findUnique({
      where: { id: fromUserId }
    });

    if (fromUser) {
      await createNotification({
        type: 'FRIEND_REQUEST',
        title: 'Neue Freundschaftsanfrage',
        message: `${fromUser.username} möchte dich als Freund hinzufügen.`,
        recipientId: toUserId,
        senderId: fromUserId,
        imageUrl: fromUser.avatarUrl || undefined,
        actionData: { userId: fromUserId }
      });
    }
  },

  // Send friend accepted notification
  async sendFriendAccepted(fromUserId: string, toUserId: string): Promise<void> {
    const fromUser = await prisma.user.findUnique({
      where: { id: fromUserId }
    });

    if (fromUser) {
      await createNotification({
        type: 'FRIEND_ACCEPTED',
        title: 'Freundschaft bestätigt! 🎉',
        message: `${fromUser.username} hat deine Freundschaftsanfrage angenommen.`,
        recipientId: toUserId,
        senderId: fromUserId,
        imageUrl: fromUser.avatarUrl || undefined
      });
    }
  },

  // Send group updated notification
  async sendGroupUpdated(groupId: string, updaterId: string, changes: string): Promise<void> {
    const group = await prisma.activityGroup.findUnique({
      where: { id: groupId },
      include: { 
        participants: { 
          where: { status: 'APPROVED', userId: { not: updaterId } },
          select: { userId: true }
        }
      }
    });

    if (group) {
      await Promise.all(
        group.participants.map(p =>
          createNotification({
            type: 'GROUP_UPDATED',
            title: 'Gruppe aktualisiert',
            message: `"${group.title}" wurde aktualisiert: ${changes}`,
            recipientId: p.userId,
            groupId,
            imageUrl: group.imageUrl || undefined
          })
        )
      );
    }
  },

  // Send club invite notification
  async sendClubInvite(clubId: string, inviterId: string, inviteeId: string): Promise<void> {
    const club = await prisma.club.findUnique({
      where: { id: clubId }
    });

    const inviter = await prisma.user.findUnique({
      where: { id: inviterId }
    });

    if (club && inviter) {
      await createNotification({
        type: 'CLUB_INVITE',
        title: 'Club Einladung',
        message: `${inviter.username} lädt dich zu "${club.title}" ein.`,
        recipientId: inviteeId,
        clubId,
        senderId: inviterId,
        imageUrl: club.imageUrl || inviter.avatarUrl || undefined,
        actionData: { clubId, inviterId }
      });
    }
  },

  // Send system notification
  async sendSystemNotification(userId: string, title: string, message: string): Promise<void> {
    await createNotification({
      type: 'SYSTEM',
      title,
      message,
      recipientId: userId
    });
  }
};

// ============================================
// PRISMA SCHEMA ADDITION (add to schema.prisma)
// ============================================
/*
model Notification {
  id          String   @id @default(uuid())
  type        String
  title       String
  message     String
  imageUrl    String?
  isRead      Boolean  @default(false)
  actionData  String?  // JSON string
  
  // Timestamps
  createdAt   DateTime @default(now())
  
  // Relations
  recipientId String
  recipient   User     @relation("NotificationRecipient", fields: [recipientId], references: [id], onDelete: Cascade)
  
  senderId    String?
  sender      User?    @relation("NotificationSender", fields: [senderId], references: [id], onDelete: SetNull)
  
  groupId     String?
  group       ActivityGroup? @relation(fields: [groupId], references: [id], onDelete: Cascade)
  
  clubId      String?
  club        Club?    @relation(fields: [clubId], references: [id], onDelete: Cascade)

  @@index([recipientId])
  @@index([isRead])
  @@index([createdAt])
  @@map("notifications")
}

// Add to User model:
// notificationsReceived Notification[] @relation("NotificationRecipient")
// notificationsSent     Notification[] @relation("NotificationSender")

// Add to ActivityGroup model:
// notifications         Notification[]

// Add to Club model:
// notifications         Notification[]
*/