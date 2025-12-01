// backend/src/app.ts - Vollständige Datei
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { initSocket } from './socket';

// Routes
import { authRoutes } from './routes/auth.routes';
import { userRoutes } from './routes/users.routes';
import { groupRoutes } from './routes/groups.routes';
import { messageRoutes } from './routes/messages.routes';
import { notificationRoutes } from './routes/notifications.routes';

const app = express();
const httpServer = createServer(app);

// Init Socket.io
initSocket(httpServer);

// ============================================
// MIDDLEWARE
// ============================================
const isDev = process.env.NODE_ENV !== 'production';

// CORS
app.use(cors({
  origin: isDev
    ? ['http://localhost:4200', 'http://localhost:3000', 'http://127.0.0.1:4200']
    : ['https://jamie-app.com', 'https://www.jamie-app.com'],
  credentials: true
}));

// Security
app.use(helmet({
  contentSecurityPolicy: isDev ? false : undefined
}));

// Compression
app.use(compression());

// Logging
app.use(morgan(isDev ? 'dev' : 'combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 1000 : 100,
  message: { error: 'Zu viele Anfragen, bitte später versuchen' }
});
app.use('/api/', limiter);

// ============================================
// ROUTES
// ============================================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/chats', messageRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint nicht gefunden' });
});

// ============================================
// ERROR HANDLER
// ============================================
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Server Error:', err);
  
  // Prisma errors
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Eintrag existiert bereits' });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Nicht gefunden' });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Ungültiger Token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token abgelaufen' });
  }

  // Default
  res.status(err.status || 500).json({
    error: isDev ? err.message : 'Interner Serverfehler'
  });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`
🚀 Jamie Backend Server
━━━━━━━━━━━━━━━━━━━━━━━
📍 Port: ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
⏰ Started: ${new Date().toLocaleString('de-DE')}
━━━━━━━━━━━━━━━━━━━━━━━
  `);
});

export { app, httpServer };