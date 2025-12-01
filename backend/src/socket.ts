// backend/src/socket.ts
import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';

let io: Server;

// Typen für authentifizierte Sockets
interface AuthSocket extends Socket {
  user?: { userId: string };
}

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-dev-key-change-in-production';

export const initSocket = (httpServer: HttpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? ["https://jamie-app.com", "https://www.jamie-app.com"] 
        : ["http://localhost:4200", "http://localhost:3000"],
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Middleware: Authentifizierung prüfen
  io.use((socket: AuthSocket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication error"));
    
    try {
      // "Bearer " entfernen falls vorhanden
      const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
      const decoded = jwt.verify(cleanToken, JWT_SECRET) as { userId: string };
      socket.user = { userId: decoded.userId };
      next();
    } catch (e) {
      next(new Error("Authentication error"));
    }
  });

  io.on('connection', (socket: AuthSocket) => {
    console.log(`🔌 User connected: ${socket.user?.userId}`);
    
    // User tritt seinem eigenen Raum bei (für private Notifications)
    if (socket.user?.userId) {
      socket.join(socket.user.userId);
    }

    // Event: Gruppe beitreten (für Chat)
    socket.on('join_group', (groupId: string) => {
      socket.join(`group_${groupId}`);
      console.log(`User ${socket.user?.userId} joined room group_${groupId}`);
    });

    // Event: Gruppe verlassen
    socket.on('leave_group', (groupId: string) => {
      socket.leave(`group_${groupId}`);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected');
    });
  });

  return io;
};

// Helper um IO Instanz in Controllern zu nutzen
export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};