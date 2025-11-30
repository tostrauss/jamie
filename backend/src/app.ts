// backend/src/app.ts
// Jamie App - Backend Server Entry Point

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { groupRoutes } from './routes/groups.routes';
import { authRoutes } from './routes/auth.routes';
import { userRoutes } from './routes/users.routes';

// ============================================
// APP INITIALIZATION
// ============================================
const app = express();
const PORT = process.env.PORT || 3000;
const isDev = process.env.NODE_ENV !== 'production';

// ============================================
// MIDDLEWARE
// ============================================

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS configuration
app.use(cors({
  origin: isDev 
    ? ['http://localhost:4200', 'http://localhost:3000'] 
    : ['https://jamie-app.com', 'https://www.jamie-app.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 1000 : 100, // Higher limit in dev
  message: { error: 'Zu viele Anfragen. Bitte versuche es später erneut.' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 100 : 10,
  message: { error: 'Zu viele Login-Versuche. Bitte warte 15 Minuten.' }
});

app.use('/api/auth/', authLimiter);

// Request logging (dev only)
if (isDev) {
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
    });
    next();
  });
}

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);

// API 404 handler
app.use('/api/*', (req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint nicht gefunden' });
});

// ============================================
// ERROR HANDLING
// ============================================

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  
  // Don't expose error details in production
  const message = isDev ? err.message : 'Ein interner Fehler ist aufgetreten';
  
  res.status(500).json({ 
    error: message,
    ...(isDev && { stack: err.stack })
  });
});

// ============================================
// SERVER START
// ============================================
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║                                            ║
║   🚀 Jamie Backend Server                  ║
║                                            ║
║   URL:  http://localhost:${PORT}             ║
║   ENV:  ${(process.env.NODE_ENV || 'development').padEnd(28)}║
║                                            ║
╚════════════════════════════════════════════╝
  `);
});

export default app;