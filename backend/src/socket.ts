// backend/src/socket.ts
import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

let io: Server | null = null;
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-dev-key-change-in-production';
const isDev = process.env.NODE_ENV !== 'production';

// ============================================
// TYPES
// ============================================
interface AuthSocket extends Socket {
  user?: { 
    userId: string; 
    username?: string;
  };
}

interface ServerToClientEvents {
  // Group events
  group_created: (group: any) => void;
  group_updated: (group: any) => void;
  group_deleted: (data: { id: string }) => void;
  
  // Member events
  join_request: (data: { groupId: string; participant: any }) => void;
  request_response: (data: { groupId: string; status: string; groupTitle: string }) => void;
  member_joined: (data: { groupId: string; member: any }) => void;
  member_left: (data: { userId: string; groupId: string }) => void;
  
  // Message events
  new_message: (message: any) => void;
  message_deleted: (data: { messageId: string; groupId: string }) => void;
  
  // Notification events
  notification: (notification: any) => void;
  
  // System events
  error: (error: { message: string }) => void;
  user_online: (data: { userId: string }) => void;
  user_offline: (data: { userId: string }) => void;
}

interface ClientToServerEvents {
  join_group: (groupId: string) => void;
  leave_group: (groupId: string) => void;
  send_message: (data: { groupId: string; content: string }) => void;
  typing_start: (groupId: string) => void;
  typing_stop: (groupId: string) => void;
  mark_read: (groupId: string) => void;
}

// Track online users
const onlineUsers = new Map<string, Set<string>>(); // userId -> Set of socketIds

// ============================================
// INIT SOCKET
// ============================================
export const initSocket = (httpServer: HttpServer): Server => {
  io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: isDev
        ? ['http://localhost:4200', 'http://localhost:3000', 'http://127.0.0.1:4200']
        : ['https://jamie-app.com', 'https://www.jamie-app.com'],
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling']
  });

  // ============================================
  // AUTH MIDDLEWARE
  // ============================================
  io.use((socket: AuthSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
      
      const decoded = jwt.verify(cleanToken, JWT_SECRET) as { 
        userId: string; 
        username?: string;
      };
      
      socket.user = { 
        userId: decoded.userId,
        username: decoded.username
      };
      
      next();
    } catch (error) {
      console.error('Socket auth error:', error);
      next(new Error('Invalid or expired token'));
    }
  });

  // ============================================
  // CONNECTION HANDLER
  // ============================================
  io.on('connection', (socket: AuthSocket) => {
    const userId = socket.user?.userId;
    
    if (!userId) {
      socket.disconnect(true);
      return;
    }

    console.log(`🔌 User connected: ${userId} (Socket: ${socket.id})`);
    
    // Track online user
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socket.id);

    // Join personal room for direct notifications
    socket.join(userId);

    // Broadcast online status
    socket.broadcast.emit('user_online', { userId });

    // ----------------------------------------
    // JOIN GROUP ROOM
    // ----------------------------------------
    socket.on('join_group', async (groupId: string) => {
      if (!groupId || typeof groupId !== 'string') {
        socket.emit('error', { message: 'Invalid group ID' });
        return;
      }

      try {
        // Verify user has access to group
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
          socket.emit('error', { message: 'Gruppe nicht gefunden' });
          return;
        }

        const isCreator = group.creatorId === userId;
        const isMember = group.participants.length > 0;

        if (!isCreator && !isMember) {
          socket.emit('error', { message: 'Kein Zugriff auf diese Gruppe' });
          return;
        }

        const room = `group_${groupId}`;
        socket.join(room);
        console.log(`👥 User ${userId} joined room: ${room}`);
      } catch (error) {
        console.error('Error joining group room:', error);
        socket.emit('error', { message: 'Fehler beim Beitreten' });
      }
    });

    // ----------------------------------------
    // LEAVE GROUP ROOM
    // ----------------------------------------
    socket.on('leave_group', (groupId: string) => {
      if (!groupId || typeof groupId !== 'string') return;
      
      const room = `group_${groupId}`;
      socket.leave(room);
      console.log(`👋 User ${userId} left room: ${room}`);
    });

    // ----------------------------------------
    // SEND MESSAGE
    // ----------------------------------------
    socket.on('send_message', async (data: { groupId: string; content: string }) => {
      if (!data.groupId || !data.content?.trim()) {
        socket.emit('error', { message: 'Ungültige Nachricht' });
        return;
      }

      const content = data.content.trim().slice(0, 1000);

      try {
        // Verify access
        const group = await prisma.activityGroup.findUnique({
          where: { id: data.groupId },
          select: {
            id: true,
            title: true,
            creatorId: true,
            participants: {
              where: { userId, status: 'APPROVED' },
              select: { id: true, userId: true }
            }
          }
        });

        if (!group) {
          socket.emit('error', { message: 'Gruppe nicht gefunden' });
          return;
        }

        const isCreator = group.creatorId === userId;
        const isMember = group.participants.length > 0;

        if (!isCreator && !isMember) {
          socket.emit('error', { message: 'Kein Zugriff' });
          return;
        }

        // Create message
        const message = await prisma.message.create({
          data: {
            content,
            senderId: userId,
            groupId: data.groupId
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

        const messagePayload = {
          ...message,
          groupId: data.groupId
        };

        // Broadcast to group room
        io!.to(`group_${data.groupId}`).emit('new_message', messagePayload);

        // Create notifications for offline users
        const allMemberIds = [
          group.creatorId,
          ...group.participants.map(p => p.userId)
        ].filter(id => id !== userId);

        // Find offline members
        const offlineMembers = allMemberIds.filter(id => !onlineUsers.has(id));

        if (offlineMembers.length > 0) {
          await prisma.notification.createMany({
            data: offlineMembers.map(memberId => ({
              userId: memberId,
              type: 'NEW_MESSAGE' as const,
              title: 'Neue Nachricht',
              content: `${message.sender.username}: ${content.slice(0, 50)}${content.length > 50 ? '...' : ''}`,
              groupId: data.groupId
            }))
          });
        }

        console.log(`💬 Message sent in group ${data.groupId} by ${userId}`);
      } catch (error) {
        console.error('Socket send_message error:', error);
        socket.emit('error', { message: 'Nachricht konnte nicht gesendet werden' });
      }
    });

    // ----------------------------------------
    // TYPING INDICATORS
    // ----------------------------------------
    socket.on('typing_start', (groupId: string) => {
      if (!groupId) return;
      socket.to(`group_${groupId}`).emit('user_typing' as any, {
        userId,
        groupId,
        isTyping: true
      });
    });

    socket.on('typing_stop', (groupId: string) => {
      if (!groupId) return;
      socket.to(`group_${groupId}`).emit('user_typing' as any, {
        userId,
        groupId,
        isTyping: false
      });
    });

    // ----------------------------------------
    // MARK AS READ
    // ----------------------------------------
    socket.on('mark_read', async (groupId: string) => {
      if (!groupId) return;

      try {
        await prisma.notification.updateMany({
          where: {
            userId,
            groupId,
            type: 'NEW_MESSAGE',
            isRead: false
          },
          data: { isRead: true }
        });
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    });

    // ----------------------------------------
    // DISCONNECT
    // ----------------------------------------
    socket.on('disconnect', (reason) => {
      console.log(`❌ User ${userId} disconnected: ${reason}`);
      
      // Remove from online tracking
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          // Broadcast offline status
          socket.broadcast.emit('user_offline', { userId });
        }
      }
    });

    // ----------------------------------------
    // ERROR HANDLER
    // ----------------------------------------
    socket.on('error', (error) => {
      console.error(`Socket error for user ${userId}:`, error);
    });
  });

  // ============================================
  // GLOBAL ERROR HANDLER
  // ============================================
  io.engine.on('connection_error', (err) => {
    console.error('Socket.io connection error:', err.message);
  });

  console.log('✅ Socket.io initialized');
  
  return io;
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get IO instance with null check
 */
export const getIO = (): Server => {
  if (!io) {
    console.warn('⚠️ Socket.io not initialized');
    // Return dummy object that won't crash
    return {
      emit: (event: string, data: any) => {
        console.warn(`Socket not ready, missed emit: ${event}`);
      },
      to: (room: string) => ({
        emit: (event: string, data: any) => {
          console.warn(`Socket not ready, missed emit to ${room}: ${event}`);
        }
      })
    } as unknown as Server;
  }
  return io;
};

/**
 * Emit to specific user
 */
export const emitToUser = (userId: string, event: keyof ServerToClientEvents, data: any): void => {
  try {
    getIO().to(userId).emit(event, data);
  } catch (error) {
    console.error(`Failed to emit ${event} to user ${userId}:`, error);
  }
};

/**
 * Emit to group room
 */
export const emitToGroup = (groupId: string, event: keyof ServerToClientEvents, data: any): void => {
  try {
    getIO().to(`group_${groupId}`).emit(event, data);
  } catch (error) {
    console.error(`Failed to emit ${event} to group ${groupId}:`, error);
  }
};

/**
 * Broadcast to all connected clients
 */
export const broadcast = (event: keyof ServerToClientEvents, data: any): void => {
  try {
    getIO().emit(event, data);
  } catch (error) {
    console.error(`Failed to broadcast ${event}:`, error);
  }
};

/**
 * Check if socket is initialized
 */
export const isSocketReady = (): boolean => {
  return io !== null;
};

/**
 * Check if user is online
 */
export const isUserOnline = (userId: string): boolean => {
  return onlineUsers.has(userId) && onlineUsers.get(userId)!.size > 0;
};

/**
 * Get online user count
 */
export const getOnlineUserCount = (): number => {
  return onlineUsers.size;
};

/**
 * Get all online user IDs
 */
export const getOnlineUserIds = (): string[] => {
  return Array.from(onlineUsers.keys());
};